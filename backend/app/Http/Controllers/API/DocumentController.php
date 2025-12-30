<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Document;
use App\Models\Folder;
use App\Models\Service;
use App\Models\Enterprise;
use App\Models\Employee;
use App\Models\SharedFolder;
use App\Models\UserFcmToken;
use App\Services\FcmService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\File as FileRule;

class DocumentController extends Controller
{
    private function documentsDisk(): string
    {
        $disk = (string) (env('DOCUMENTS_DISK', 'local'));
        return $disk !== '' ? $disk : 'local';
    }

    private function buildBaseEnterprisePath(int $serviceId): string
    {
        $base = 'enterprises/entreprise';
        $service = Service::find($serviceId);
        if ($service && $service->enterprise_id) {
            $ent = Enterprise::find($service->enterprise_id);
            if ($ent) {
                $base = !empty($ent->folder_path)
                    ? trim($ent->folder_path, '/')
                    : ('enterprises/' . Str::slug($ent->name ?? 'entreprise'));
            }
        }
        return $base;
    }

    private function buildFolderDirPath(?Folder $folder, ?Service $service): string
    {
        // base/ service-slug / [subfolders slugs]
        $serviceDir = $service ? Str::slug($service->name) : 'service';
        $segments = [$serviceDir];
        if ($folder) {
            // climb to root to collect chain
            $chain = [];
            $cur = $folder;
            while ($cur) {
                array_unshift($chain, $cur->name);
                if ($cur->parent_id === null) break;
                $cur = Folder::find($cur->parent_id);
                if (!$cur) break;
            }
            // Always drop the DB root folder segment to avoid duplicating service name in path
            if (!empty($chain)) {
                array_shift($chain);
            }
            // slugify remaining folder names (subfolders only)
            foreach ($chain as $seg) {
                $segments[] = Str::slug($seg);
            }
        }
        return implode('/', $segments);
    }

    /**
     * Determine if a folder (or any of its ancestors) is a shared folder visible to the current user.
     */
    private function isFolderInVisibleSharedTree($user, int $folderId): bool
    {
        if (!$user || !$user->enterprise_id) return false;
        // Build ancestor chain including the folder itself
        $ids = [];
        $cur = Folder::find($folderId);
        $guard = 0;
        while ($cur && $guard < 200) {
            $ids[] = (int)$cur->id;
            if ($cur->parent_id === null) break;
            $cur = Folder::find($cur->parent_id);
            $guard++;
        }

        if (empty($ids)) return false;
        $shared = SharedFolder::where('enterprise_id', $user->enterprise_id)
            ->whereIn('folder_id', $ids)
            ->get();
        if ($shared->isEmpty()) return false;

        // If enterprise-wide visibility, allow
        if ($shared->firstWhere('visibility', 'enterprise')) return true;

        // If services visibility, allow only if user's service is included
        if ($user->role === 'agent') {
            $emp = Employee::where('user_id', $user->id)->first();
            if (!$emp) return false;
            foreach ($shared as $sf) {
                if ($sf->visibility === 'services') {
                    try {
                        if ($sf->services()->where('services.id', $emp->service_id)->exists()) {
                            return true;
                        }
                    } catch (\Throwable $e) { /* ignore */ }
                }
            }
        }
        return false;
    }

    public function index(Request $request)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);

        $folderId = $request->query('folder_id');
        $serviceId = $request->query('service_id');
        $countOnly = $request->query('count_only');

        $page = (int) ($request->query('page') ?? 0);
        $perPage = (int) ($request->query('per_page') ?? 0);
        if ($perPage <= 0) $perPage = 200;
        if ($perPage > 500) $perPage = 500;

        // Permission context
        $ctxServiceId = null;
        if ($folderId) {
            $folder = Folder::find($folderId);
            if (!$folder) return response()->json([]);
            $ctxServiceId = $folder->service_id;
        } elseif ($serviceId) {
            $ctxServiceId = (int)$serviceId;
        }

        if ($ctxServiceId) {
            if ($user->role === 'admin') {
                $svc = Service::find($ctxServiceId);
                if ($svc && (int)$svc->enterprise_id !== (int)$user->enterprise_id) {
                    return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
                }
            }
            if ($user->role === 'agent') {
                $svc = Service::find($ctxServiceId);
                if ((bool)($user->can_view_all_services ?? false) === true) {
                    if ($svc && (int)$svc->enterprise_id !== (int)$user->enterprise_id) {
                        return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
                    }
                } else {
                    $emp = Employee::where('user_id', $user->id)->first();
                    if (!$emp || (int)$emp->service_id !== (int)$ctxServiceId) {
                        // Allow if listing within a folder that is inside a visible shared folder tree
                        if ($folderId && $this->isFolderInVisibleSharedTree($user, (int)$folderId)) {
                            // allowed via shared folder rule
                        } else {
                            return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
                        }
                    }
                }
            }
        }

        $query = Document::query()->with('creator');
        if ($folderId) $query->where('folder_id', $folderId);
        if ($serviceId) $query->where('service_id', $serviceId);

        // Default enterprise scoping when no folder/service context is specified
        if (!$folderId && !$serviceId) {
            if ($user->role !== 'super_admin') {
                if (!$user->enterprise_id) {
                    return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
                }
                $query->where('enterprise_id', $user->enterprise_id);
            }
        }

        if ($countOnly) {
            return response()->json(['count' => $query->count()]);
        }

        $cacheKey = 'docs:index:' . ($user->id ?? 0)
            . ':f=' . ($folderId ?? '')
            . ':s=' . ($serviceId ?? '')
            . ':p=' . $page
            . ':pp=' . $perPage;

        $docs = Cache::remember($cacheKey, 10, function () use ($query, $page, $perPage) {
            $q = $query->orderByDesc('id');

            if ($page > 0) {
                $offset = max(0, ($page - 1) * $perPage);
                $q->skip($offset)->take($perPage);
            } else {
                $q->take($perPage);
            }

            return $q->get()->map(function ($doc) {
                $arr = $doc->toArray();
                $arr['created_by_name'] = $doc->creator?->name;
                return $arr;
            })->values();
        });

        return response()->json($docs);
    }

    public function recent(Request $request)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);

        $folderId = $request->query('folder_id');
        $limit = (int)($request->query('limit') ?? 5);
        if ($limit <= 0) $limit = 5;
        if ($limit > 20) $limit = 20;

        // Determine context service id
        $ctxServiceId = null;
        if ($folderId) {
            $folder = Folder::find($folderId);
            if ($folder) {
                $ctxServiceId = $folder->service_id;
            } else {
                // invalid folder id: fallback to service scope below
                $folderId = null;
            }
        } else {
            // For agents, never rely on a user.service_id field (may be null) and never fall back to enterprise
            if ($user->role === 'agent') {
                $emp = Employee::where('user_id', $user->id)->first();
                $ctxServiceId = $emp?->service_id;
            } else {
                $ctxServiceId = $user->service_id ?? null;
            }
        }

        // Agents must always be scoped to a service when not in a shared folder context
        if ($user->role === 'agent' && !$folderId && !$ctxServiceId) {
            return response()->json([]);
        }

        if ($ctxServiceId) {
            if ($user->role === 'admin') {
                $svc = Service::find($ctxServiceId);
                if ($svc && (int)$svc->enterprise_id !== (int)$user->enterprise_id) {
                    return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
                }
            }
            if ($user->role === 'agent') {
                $svc = Service::find($ctxServiceId);
                if ((bool)($user->can_view_all_services ?? false) === true) {
                    if ($svc && (int)$svc->enterprise_id !== (int)$user->enterprise_id) {
                        return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
                    }
                } else {
                    $emp = Employee::where('user_id', $user->id)->first();
                    if (!$emp || (int)$emp->service_id !== (int)$ctxServiceId) {
                        // Allow if folder is visible via shared folder rule
                        if ($folderId && $this->isFolderInVisibleSharedTree($user, (int)$folderId)) {
                            // allowed
                        } else {
                            return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
                        }
                    }
                }
            }
        }

        $query = Document::query()->with('creator');
        if ($folderId) {
            $query->where('folder_id', $folderId);
        } elseif ($ctxServiceId) {
            $query->where('service_id', $ctxServiceId);
        } else {
            // Fallback: scope to enterprise when service is unknown
            if ($user->role !== 'super_admin' && $user->enterprise_id) {
                $query->where('enterprise_id', $user->enterprise_id);
            }
        }

        $cacheKey = 'docs:recent:' . ($user->id ?? 0)
            . ':f=' . ($folderId ?? '')
            . ':limit=' . $limit
            . ':ctx=' . ($ctxServiceId ?? '');

        $docs = Cache::remember($cacheKey, 10, function () use ($query, $limit) {
            return $query->orderByDesc('id')->limit($limit)->get()->map(function ($doc) {
                $arr = $doc->toArray();
                $arr['created_by_name'] = $doc->creator?->name;
                return $arr;
            })->values();
        });

        return response()->json($docs);
    }

    public function store(Request $request)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);

        $maxMb = (int) (env('UPLOAD_MAX_MB', 500));
        if ($maxMb <= 0) { $maxMb = 500; }
        $validated = $request->validate([
            'file' => ['required', FileRule::default()->max(1024 * 1024 * $maxMb)], // configurable max (MB)
            'folder_id' => ['nullable', 'integer', 'exists:folders,id'],
            'service_id' => ['nullable', 'integer', 'exists:services,id'],
            'name' => ['nullable', 'string', 'max:255'],
        ]);

        $folder = null;
        $service = null;
        $serviceId = $validated['service_id'] ?? null;
        $folderId = $validated['folder_id'] ?? null;
        if ($folderId) {
            $folder = Folder::find($folderId);
            $serviceId = $folder ? $folder->service_id : $serviceId;
        }
        if (!$serviceId) return response()->json(['message' => 'service_id is required if folder_id is null'], 422);
        $service = Service::find($serviceId);

        // Permissions
        if ($user->role === 'admin') {
            $svc = $service;
            if ($svc && (int)$svc->enterprise_id !== (int)$user->enterprise_id) {
                return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
            }
        }
        if ($user->role === 'agent') {
            // If the agent has global view permission, allow create in any service of their enterprise
            $svc = $service;
            if ((bool)($user->can_view_all_services ?? false) === true) {
                if ($svc && (int)$svc->enterprise_id !== (int)$user->enterprise_id) {
                    return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
                }
            } else {
                // Otherwise, restrict to their assigned service
                $emp = Employee::where('user_id', $user->id)->first();
                if (!$emp || (int)$emp->service_id !== (int)$serviceId) {
                    // Allow uploads inside a folder that is within a visible shared folder tree
                    if ($folderId && $this->isFolderInVisibleSharedTree($user, (int)$folderId)) {
                        // allowed via shared folder rule
                    } else {
                        return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
                    }
                }
            }
        }

        $uploaded = $validated['file'];
        $original = $validated['name'] ?? $uploaded->getClientOriginalName();
        $safeName = Str::slug(pathinfo($original, PATHINFO_FILENAME));
        $ext = strtolower($uploaded->getClientOriginalExtension());
        $finalName = $ext ? ($safeName . '.' . $ext) : $safeName;

        $base = $this->buildBaseEnterprisePath($serviceId);
        $dirRel = $this->buildFolderDirPath($folder, $service);
        $fullDir = $base . '/' . $dirRel;

        $disk = $this->documentsDisk();

        // Ensure directory exists
        Storage::disk($disk)->makeDirectory($fullDir);
        // Store file
        Storage::disk($disk)->putFileAs($fullDir, $uploaded, $finalName);
        $relPath = $fullDir . '/' . $finalName;

        $doc = Document::create([
            'name' => $original,
            'folder_id' => $folder?->id,
            'service_id' => $serviceId,
            'enterprise_id' => $service?->enterprise_id,
            'file_path' => $relPath,
            'mime_type' => $uploaded->getClientMimeType(),
            'size_bytes' => $uploaded->getSize(),
            'created_by' => $user->id,
        ]);

        if (!Cache::has('documents_events_sequence')) {
            Cache::forever('documents_events_sequence', 0);
        }
        Cache::forever('documents_last_event', [
            'type' => 'document_created',
            'document_id' => (int) $doc->id,
            'document_name' => (string) ($doc->name ?: ''),
            'folder_id' => $doc->folder_id ? (int) $doc->folder_id : null,
            'service_id' => $doc->service_id ? (int) $doc->service_id : null,
            'created_by' => (int) $user->id,
            'created_by_name' => (string) ($user->name ?: ''),
        ]);
        Cache::increment('documents_events_sequence');

        try {
            $userIds = Employee::where('service_id', $serviceId)
                ->whereNotNull('user_id')
                ->where('user_id', '!=', $user->id)
                ->pluck('user_id')
                ->map(fn ($v) => (int) $v)
                ->values()
                ->all();

            $tokens = UserFcmToken::whereIn('user_id', $userIds)->pluck('token')->values()->all();

            $title = 'Nouveau document';
            $uploader = $user->name ? $user->name : 'Quelqu\'un';
            $docName = $doc->name ?: 'Document';
            $body = $uploader . ' a ajouté : ' . $docName;
            $message = [
                'notification' => [
                    'title' => $title,
                    'body' => $body,
                ],
                'data' => [
                    'type' => 'document_created',
                    'document_id' => (string) $doc->id,
                    'document_name' => (string) $docName,
                    'created_by_name' => (string) $uploader,
                    'service_id' => (string) $serviceId,
                ],
            ];

            app(FcmService::class)->sendToTokens($tokens, $message);
        } catch (\Throwable $e) {
            // ignore
        }

        return response()->json($doc, Response::HTTP_CREATED);
    }

    public function show(Document $document)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);
        // Permissions
        $serviceId = $document->service_id;
        if ($user->role === 'admin') {
            $svc = Service::find($serviceId);
            if ($svc && (int)$svc->enterprise_id !== (int)$user->enterprise_id) {
                return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
            }
        }
        if ($user->role === 'agent') {
            $svc = Service::find($serviceId);
            if ((bool)($user->can_view_all_services ?? false) === true) {
                if ($svc && (int)$svc->enterprise_id !== (int)$user->enterprise_id) {
                    return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
                }
            } else {
                $emp = Employee::where('user_id', $user->id)->first();
                if (!$emp || (int)$emp->service_id !== (int)$serviceId) {
                    // Allow if the document belongs to a folder inside a visible shared folder tree
                    if ($document->folder_id && $this->isFolderInVisibleSharedTree($user, (int)$document->folder_id)) {
                        // allowed via shared folder rule
                    } else {
                        return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
                    }
                }
            }
        }
        $document->load('creator');
        $arr = $document->toArray();
        $arr['created_by_name'] = $document->creator?->name;
        return response()->json($arr);
    }

    public function update(Request $request, Document $document)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);

        $validated = $request->validate([
            'name' => ['nullable', 'string', 'max:255'],
            'folder_id' => ['nullable', 'integer', 'exists:folders,id'],
        ]);

        // Permissions
        $serviceId = $document->service_id;
        if ($user->role === 'admin') {
            $svc = Service::find($serviceId);
            if ($svc && (int)$svc->enterprise_id !== (int)$user->enterprise_id) {
                return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
            }
        }
        if ($user->role === 'agent') {
            $emp = Employee::where('user_id', $user->id)->first();
            if (!$emp || (int)$emp->service_id !== (int)$serviceId) {
                // Allow if the document belongs to a folder inside a visible shared folder tree
                if ($document->folder_id && $this->isFolderInVisibleSharedTree($user, (int)$document->folder_id)) {
                    // allowed via shared folder rule
                } else {
                    return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
                }
            }
        }

        $oldPath = $document->file_path;
        $oldDir = trim(dirname($oldPath), '/\\');

        $targetFolder = $document->folder_id ? Folder::find($document->folder_id) : null;
        if (array_key_exists('folder_id', $validated)) {
            $targetFolder = $validated['folder_id'] ? Folder::find($validated['folder_id']) : null;
        }
        $service = Service::find($document->service_id);

        // Build target dir (may be same)
        $base = $this->buildBaseEnterprisePath($document->service_id);
        $dirRel = $this->buildFolderDirPath($targetFolder, $service);
        $newDir = $base . '/' . $dirRel;

        $filename = basename($oldPath);
        if (!empty($validated['name'])) {
            $orig = $validated['name'];
            $safe = Str::slug(pathinfo($orig, PATHINFO_FILENAME));
            $ext = pathinfo($filename, PATHINFO_EXTENSION);
            $filename = $ext ? ($safe . '.' . strtolower($ext)) : $safe;
            $document->name = $orig;
        }

        // Ensure new directory exists
        $disk = $this->documentsDisk();
        Storage::disk($disk)->makeDirectory($newDir);
        $newPath = $newDir . '/' . $filename;

        try {
            if ($oldPath !== $newPath && Storage::disk($disk)->exists($oldPath)) {
                Storage::disk($disk)->move($oldPath, $newPath);
            } elseif (!Storage::disk($disk)->exists($newPath) && Storage::disk($disk)->exists($oldPath)) {
                // same dir but name change
                Storage::disk($disk)->move($oldPath, $newPath);
            }
        } catch (\Throwable $e) { /* ignore fs errors */ }

        // Persist
        $document->folder_id = $targetFolder?->id;
        $document->file_path = $newPath;
        $document->save();

        return response()->json($document);
    }

    public function destroy(Document $document)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);

        // Permissions
        $serviceId = $document->service_id;
        if ($user->role === 'admin') {
            $svc = Service::find($serviceId);
            if ($svc && (int)$svc->enterprise_id !== (int)$user->enterprise_id) {
                return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
            }
        }
        if ($user->role === 'agent') {
            $emp = Employee::where('user_id', $user->id)->first();
            if (!$emp || (int)$emp->service_id !== (int)$serviceId) {
                // Allow deletion if the document belongs to a folder inside a visible shared folder tree
                if ($document->folder_id && $this->isFolderInVisibleSharedTree($user, (int)$document->folder_id)) {
                    // allowed via shared folder rule
                } else {
                    return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
                }
            }
        }

        $disk = $this->documentsDisk();

        // Delete file
        try {
            if ($document->file_path && Storage::disk($disk)->exists($document->file_path)) {
                Storage::disk($disk)->delete($document->file_path);
            }
        } catch (\Throwable $e) { /* ignore */ }

        $document->delete();
        return response()->json(null, Response::HTTP_NO_CONTENT);
    }

    public function download(Document $document)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);

        $serviceId = $document->service_id;
        if ($user->role === 'admin') {
            $svc = Service::find($serviceId);
            if ($svc && (int)$svc->enterprise_id !== (int)$user->enterprise_id) {
                return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
            }
        }
        if ($user->role === 'agent') {
            $svc = Service::find($serviceId);
            if ((bool)($user->can_view_all_services ?? false) === true) {
                if ($svc && (int)$svc->enterprise_id !== (int)$user->enterprise_id) {
                    return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
                }
            } else {
                $emp = Employee::where('user_id', $user->id)->first();
                if (!$emp || (int)$emp->service_id !== (int)$serviceId) {
                    // Allow if the document belongs to a folder inside a visible shared folder tree
                    if ($document->folder_id && $this->isFolderInVisibleSharedTree($user, (int)$document->folder_id)) {
                        // allowed via shared folder rule
                    } else {
                        return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
                    }
                }
            }
        }

        $disk = $this->documentsDisk();

        if (!$document->file_path) {
            return response()->json(['message' => 'File not found'], 404);
        }

        // If file not found on configured disk, try common fallbacks.
        $candidateDisks = array_values(array_unique(array_filter([$disk, 'local', 'public'])));
        $resolvedDisk = null;
        foreach ($candidateDisks as $d) {
            try {
                if (Storage::disk($d)->exists($document->file_path)) {
                    $resolvedDisk = $d;
                    break;
                }
            } catch (\Throwable $e) { /* ignore */ }
        }
        if (!$resolvedDisk) {
            return response()->json(['message' => 'File not found'], 404);
        }

        $downloadName = $document->name ?: basename($document->file_path);
        // Resolve absolute path in a cross-platform way
        $fullPath = null;
        try {
            if (method_exists(Storage::disk($resolvedDisk), 'path')) {
                $fullPath = Storage::disk($resolvedDisk)->path($document->file_path);
            }
        } catch (\Throwable $e) { $fullPath = null; }

        $mime = $document->mime_type ?: 'application/octet-stream';
        if ($fullPath && file_exists($fullPath)) {
            // Prefer native file response when absolute path is known
            $detected = @mime_content_type($fullPath) ?: $mime;
            return response()->file($fullPath, [
                'Content-Type' => $detected,
                'Content-Disposition' => 'attachment; filename="' . $downloadName . '"'
            ]);
        }

        // Fallback: stream from storage (works even if absolute path resolution fails on Windows)
        $stream = Storage::disk($resolvedDisk)->readStream($document->file_path);
        if ($stream === false) {
            return response()->json(['message' => 'File not found'], 404);
        }
        return response()->stream(function () use ($stream) {
            fpassthru($stream);
            if (is_resource($stream)) fclose($stream);
        }, 200, [
            'Content-Type' => $mime,
            'Content-Disposition' => 'attachment; filename="' . $downloadName . '"'
        ]);
    }
}
