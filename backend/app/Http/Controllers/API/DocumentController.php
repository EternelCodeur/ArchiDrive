<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Document;
use App\Models\Folder;
use App\Models\Service;
use App\Models\Enterprise;
use App\Models\Employee;
use App\Models\SharedFolder;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\File as FileRule;

class DocumentController extends Controller
{
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

        $query = Document::query();
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

        return response()->json($query->orderByDesc('id')->get());
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

        // Ensure directory exists
        Storage::disk('local')->makeDirectory($fullDir);
        // Store file
        Storage::disk('local')->putFileAs($fullDir, $uploaded, $finalName);
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
        return response()->json($document);
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
        Storage::disk('local')->makeDirectory($newDir);
        $newPath = $newDir . '/' . $filename;

        try {
            if ($oldPath !== $newPath && Storage::disk('local')->exists($oldPath)) {
                Storage::disk('local')->move($oldPath, $newPath);
            } elseif (!Storage::disk('local')->exists($newPath) && Storage::disk('local')->exists($oldPath)) {
                // same dir but name change
                Storage::disk('local')->move($oldPath, $newPath);
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

        // Delete file
        try {
            if ($document->file_path && Storage::disk('local')->exists($document->file_path)) {
                Storage::disk('local')->delete($document->file_path);
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
            $emp = Employee::where('user_id', $user->id)->first();
            if (!$emp || (int)$emp->service_id !== (int)$serviceId) {
                return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
            }
        }

        if (!$document->file_path || !Storage::disk('local')->exists($document->file_path)) {
            return response()->json(['message' => 'File not found'], 404);
        }
        // Resolve absolute path in a cross-platform way
        $fullPath = null;
        try {
            if (method_exists(Storage::disk('local'), 'path')) {
                $fullPath = Storage::disk('local')->path($document->file_path);
            }
        } catch (\Throwable $e) { $fullPath = null; }

        $mime = $document->mime_type ?: 'application/octet-stream';
        if ($fullPath && file_exists($fullPath)) {
            // Prefer native file response when absolute path is known
            $detected = @mime_content_type($fullPath) ?: $mime;
            return response()->file($fullPath, [
                'Content-Type' => $detected,
                'Content-Disposition' => 'inline; filename="' . basename($fullPath) . '"'
            ]);
        }

        // Fallback: stream from storage (works even if absolute path resolution fails on Windows)
        $stream = Storage::disk('local')->readStream($document->file_path);
        if ($stream === false) {
            return response()->json(['message' => 'File not found'], 404);
        }
        return response()->stream(function () use ($stream) {
            fpassthru($stream);
            if (is_resource($stream)) fclose($stream);
        }, 200, [
            'Content-Type' => $mime,
            'Content-Disposition' => 'inline; filename="' . basename($document->file_path) . '"'
        ]);
    }
}
