<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\SharedFolder;
use App\Models\Service;
use App\Models\Employee;
use App\Models\Folder;
use App\Models\Document;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use App\Models\Enterprise;
use Illuminate\Support\Str;

class SharedFolderController extends Controller
{
    /**
     * Build full relative path under enterprises/<enterprise_folder>/<service>/<path> for a given folder.
     * Uses enterprise->folder_path when available, otherwise enterprises/<slug>.
     */
    private function buildRelativePath(Folder $folder): string
    {
        $segments = [];
        $cur = $folder;
        // Collect names up to root
        while ($cur) {
            array_unshift($segments, $cur->name);
            if ($cur->parent_id === null) break;
            $cur = Folder::find($cur->parent_id);
            if (!$cur) break;
        }

        $service = Service::find($folder->service_id);
        // Determine enterprise base folder (prefer persisted folder_path)
        $base = 'enterprises/entreprise';
        if ($service && $service->enterprise_id) {
            $ent = Enterprise::find($service->enterprise_id);
            if ($ent) {
                if (!empty($ent->folder_path)) {
                    $base = trim($ent->folder_path, '/');
                } else {
                    // Fallback to slug
                    $slug = Str::slug($ent->name ?? 'entreprise');
                    $base = 'enterprises/' . $slug;
                }
            }
        }
        // Build final path: base + <service-slug> + <subfolders...>
        $serviceName = $service ? $service->name : null;
        $serviceDir = $serviceName ? Str::slug($serviceName) : null;
        $pathSegments = [];
        if ($serviceDir) {
            $pathSegments[] = $serviceDir;
        }
        // Remove the DB root folder name (it mirrors service name and must not be repeated)
        if (!empty($segments)) {
            array_shift($segments);
        }
        // Append the remaining subfolder segments
        $pathSegments = array_merge($pathSegments, array_map(fn($s) => is_string($s) ? Str::slug($s) : $s, $segments));

        $path = $base;
        if (!empty($pathSegments)) {
            $path .= '/' . implode('/', $pathSegments);
        }
        return $path;
    }
    /**
     * GET /api/shared-folders/visible
     */
    public function visible(Request $request)
    {
        $user = Auth::user();
        if (!$user || !$user->enterprise_id) {
            return response()->json([]);
        }

        $cacheKey = 'shared-folders:visible:' . ($user->id ?? 0) . ':ent=' . (string) $user->enterprise_id;

        $list = Cache::remember($cacheKey, 10, function () use ($user) {
            $query = SharedFolder::with(['folder:id,name,service_id,parent_id', 'services:id'])
                ->where('enterprise_id', $user->enterprise_id);

            if ($user->role === 'agent') {
                $emp = Employee::where('user_id', $user->id)->first();
                if (!$emp) {
                    return collect([]);
                }
                $query->where(function ($q) use ($emp) {
                    $q->where('visibility', 'enterprise')
                      ->orWhere(function ($q2) use ($emp) {
                          $q2->where('visibility', 'services')
                             ->whereHas('services', function ($qs) use ($emp) {
                                 $qs->where('services.id', $emp->service_id);
                             });
                      });
                });
            }

            return $query->orderBy('id', 'desc')->get()->map(function (SharedFolder $sf) {
                return [
                    'id' => $sf->id,
                    'name' => $sf->name,
                    'folder_id' => $sf->folder_id,
                    'visibility' => $sf->visibility,
                    'services' => $sf->visibility === 'services' ? $sf->services->pluck('id')->values()->all() : [],
                ];
            })->values();
        });

        return response()->json($list);
    }

    /**
     * POST /api/admin/shared-folders
     * Create a shared folder under a host service (or a specific parent folder),
     * and define its visibility scope.
     */
    public function store(Request $request)
    {
        $user = Auth::user();
        if (!$user || ($user->role !== 'admin' && $user->role !== 'super_admin')) {
            return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
        }
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'host_service_id' => ['required', 'integer', 'exists:services,id'],
            'parent_id' => ['nullable', 'integer', 'exists:folders,id'],
            'visibility' => ['required', 'in:enterprise,services'],
            'services' => ['array'],
            'services.*' => ['integer', 'exists:services,id'],
        ]);

        $hostService = Service::find($data['host_service_id']);
        if (!$hostService) {
            return response()->json(['message' => 'Service not found'], 404);
        }
        if ($user->role === 'admin' && (int)$hostService->enterprise_id !== (int)$user->enterprise_id) {
            return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
        }

        // Resolve parent: if null, use/create service root
        $parentId = $data['parent_id'] ?? null;
        if ($parentId === null) {
            $roots = Folder::whereNull('parent_id')->where('service_id', $hostService->id)->get();
            if ($roots->count() === 0) {
                $root = Folder::create([
                    'name' => $hostService->name,
                    'service_id' => $hostService->id,
                    'parent_id' => null,
                ]);
                $parentId = $root->id;
            } else {
                $parentId = $roots->first()->id;
            }
        }

        $folder = Folder::create([
            'name' => $data['name'],
            'service_id' => $hostService->id,
            'parent_id' => $parentId,
        ]);

        // Mirror on disk and persist folder_path
        try {
            $path = $this->buildRelativePath($folder);
            Storage::disk('local')->makeDirectory($path);
            try { $folder->update(['folder_path' => $path]); } catch (\Throwable $e) { /* ignore */ }
        } catch (\Throwable $e) {
            // Non-fatal for API response; folder persisted in DB
        }

        $sf = SharedFolder::create([
            'enterprise_id' => $hostService->enterprise_id,
            'folder_id' => $folder->id,
            'name' => $data['name'],
            'visibility' => $data['visibility'],
            'created_by' => $user->id,
        ]);

        if ($data['visibility'] === 'services' && !empty($data['services'])) {
            // keep only services within the same enterprise
            $serviceIds = collect($data['services'])
                ->filter(function ($sid) use ($hostService) {
                    $svc = Service::find($sid);
                    return $svc && (int)$svc->enterprise_id === (int)$hostService->enterprise_id;
                })->values()->all();
            if (!empty($serviceIds)) {
                $sf->services()->sync($serviceIds);
            }
        }

        return response()->json([
            'id' => $sf->id,
            'name' => $sf->name,
            'folder_id' => $sf->folder_id,
            'visibility' => $sf->visibility,
        ], Response::HTTP_CREATED);
    }

    /**
     * POST /api/admin/shared-folders/link
     * Share an existing folder (no FS changes). Visibility can be enterprise-wide or selected services.
     */
    public function link(Request $request)
    {
        $user = Auth::user();
        if (!$user || ($user->role !== 'admin' && $user->role !== 'super_admin')) {
            return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
        }
        $data = $request->validate([
            'folder_id' => ['required', 'integer', 'exists:folders,id'],
            'visibility' => ['required', 'in:enterprise,services'],
            'services' => ['array'],
            'services.*' => ['integer', 'exists:services,id'],
        ]);

        $folder = Folder::find($data['folder_id']);
        if (!$folder) return response()->json(['message' => 'Folder not found'], 404);
        $svc = Service::find($folder->service_id);
        if (!$svc) return response()->json(['message' => 'Service not found'], 404);
        if ($user->role === 'admin' && (int)$svc->enterprise_id !== (int)$user->enterprise_id) {
            return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
        }

        $sf = SharedFolder::create([
            'enterprise_id' => $svc->enterprise_id,
            'folder_id' => $folder->id,
            'name' => $folder->name,
            'visibility' => $data['visibility'],
            'created_by' => $user->id,
        ]);

        if ($data['visibility'] === 'services' && !empty($data['services'])) {
            // keep only services within the same enterprise
            $serviceIds = collect($data['services'])
                ->filter(function ($sid) use ($svc) {
                    $s = Service::find($sid);
                    return $s && (int)$s->enterprise_id === (int)$svc->enterprise_id;
                })->values()->all();
            if (!empty($serviceIds)) {
                $sf->services()->sync($serviceIds);
            }
        }

        return response()->json([
            'id' => $sf->id,
            'name' => $sf->name,
            'folder_id' => $sf->folder_id,
            'visibility' => $sf->visibility,
        ], Response::HTTP_CREATED);
    }

    /**
     * DELETE /api/admin/shared-folders/{sharedFolder}
     * Unshare a folder: remove sharing metadata without deleting the underlying folder on disk.
     */
    public function destroy(SharedFolder $sharedFolder)
    {
        $user = Auth::user();
        if (!$user || ($user->role !== 'admin' && $user->role !== 'super_admin')) {
            return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
        }
        // Enterprise check for admins
        if ($user->role === 'admin') {
            $svc = Service::find(optional($sharedFolder->folder)->service_id);
            if ($svc && (int)$svc->enterprise_id !== (int)$user->enterprise_id) {
                return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
            }
        }
        // Also delete the underlying folder (filesystem + DB subtree)
        $folder = Folder::find($sharedFolder->folder_id);
        if ($folder) {
            // Compute base path before DB deletion
            $targetPath = $this->buildRelativePath($folder);

            // Collect all folder IDs in the subtree (including current)
            $allFolderIds = [];
            $stack = [$folder->id];
            while (!empty($stack)) {
                $currentId = array_pop($stack);
                $allFolderIds[] = $currentId;
                $children = Folder::where('parent_id', $currentId)->pluck('id');
                foreach ($children as $cid) {
                    $stack[] = $cid;
                }
            }

            // Delete documents in subtree (filesystem + DB)
            $docs = Document::whereIn('folder_id', $allFolderIds)->get();
            foreach ($docs as $doc) {
                try {
                    if ($doc->file_path && \Illuminate\Support\Facades\Storage::disk('local')->exists($doc->file_path)) {
                        \Illuminate\Support\Facades\Storage::disk('local')->delete($doc->file_path);
                    }
                } catch (\Throwable $e) { /* ignore */ }
                $doc->delete();
            }

            // Delete directory on disk (best effort)
            try {
                if (Storage::disk('local')->exists($targetPath)) {
                    Storage::disk('local')->deleteDirectory($targetPath);
                }
            } catch (\Throwable $e) { /* ignore */ }

            // Delete folders from leaves to root in DB
            Folder::whereIn('id', $allFolderIds)->delete();

            // shared_folders row will be cascade-deleted via FK on folder_id
            return response()->json(null, Response::HTTP_NO_CONTENT);
        }

        // Fallback: if folder missing, just remove share metadata
        try { $sharedFolder->services()->detach(); } catch (\Throwable $e) { /* ignore */ }
        $sharedFolder->delete();
        return response()->json(null, Response::HTTP_NO_CONTENT);
    }

    /**
     * PATCH /api/admin/shared-folders/{sharedFolder}
     * Update visibility/services and optionally rename underlying folder (and FS path) to keep names consistent.
     */
    public function update(Request $request, SharedFolder $sharedFolder)
    {
        $user = Auth::user();
        if (!$user || ($user->role !== 'admin' && $user->role !== 'super_admin')) {
            return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
        }
        // Enterprise check for admins
        $folder = Folder::find($sharedFolder->folder_id);
        if (!$folder) return response()->json(['message' => 'Folder not found'], 404);
        $svc = Service::find($folder->service_id);
        if ($user->role === 'admin' && $svc && (int)$svc->enterprise_id !== (int)$user->enterprise_id) {
            return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
        }

        $data = $request->validate([
            'visibility' => ['nullable', 'in:enterprise,services'],
            'services' => ['array'],
            'services.*' => ['integer', 'exists:services,id'],
            'name' => ['nullable', 'string', 'max:255'],
        ]);

        // Handle name change (rename folder + FS path, then update shared_folders.name)
        if (!empty($data['name']) && $data['name'] !== $folder->name) {
            $oldPath = $this->buildRelativePath($folder);
            $folder->name = $data['name'];
            $folder->save();
            $newPath = $this->buildRelativePath($folder);
            // Rename directory on disk
            try {
                if ($oldPath !== $newPath && Storage::disk('local')->exists($oldPath)) {
                    Storage::disk('local')->move($oldPath, $newPath);
                } else if (!Storage::disk('local')->exists($newPath)) {
                    Storage::disk('local')->makeDirectory($newPath);
                }
                try { $folder->update(['folder_path' => $newPath]); } catch (\Throwable $e) { /* ignore */ }
            } catch (\Throwable $e) { /* ignore */ }
            $sharedFolder->name = $data['name'];
        }

        // Visibility/services
        if (!empty($data['visibility'])) {
            $sharedFolder->visibility = $data['visibility'];
        }
        $sharedFolder->save();

        if (($data['visibility'] ?? $sharedFolder->visibility) === 'services') {
            $incoming = collect($data['services'] ?? [])->filter(function ($sid) use ($svc) {
                $s = Service::find($sid);
                return $s && (int)$s->enterprise_id === (int)$svc->enterprise_id;
            })->values()->all();
            $sharedFolder->services()->sync($incoming);
        } else {
            $sharedFolder->services()->detach();
        }

        // Return fresh state
        $sharedFolder->load(['services:id']);
        return response()->json([
            'id' => $sharedFolder->id,
            'name' => $sharedFolder->name,
            'folder_id' => $sharedFolder->folder_id,
            'visibility' => $sharedFolder->visibility,
            'services' => $sharedFolder->visibility === 'services' ? $sharedFolder->services->pluck('id')->values()->all() : [],
        ]);
    }
}
