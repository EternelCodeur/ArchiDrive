<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Folder;
use App\Models\Document;
use App\Models\Service;
use App\Models\Enterprise;
use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class FolderController extends Controller
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
                    $slug = \Illuminate\Support\Str::slug($ent->name ?? 'entreprise');
                    $base = 'enterprises/' . $slug;
                }
            }
        }
        // Build final path: base + <service-slug> + <subfolders...>
        $serviceName = $service ? $service->name : null;
        $serviceDir = $serviceName ? \Illuminate\Support\Str::slug($serviceName) : null;
        $pathSegments = [];
        if ($serviceDir) {
            $pathSegments[] = $serviceDir;
        }
        // Remove the DB root folder name (it mirrors service name and must not be repeated)
        if (!empty($segments)) {
            array_shift($segments);
        }
        // Append the remaining subfolder segments
        $pathSegments = array_merge($pathSegments, $segments);
        // Slugify all segments (lowercase, hyphen-separated) e.g. 'dossier 1' -> 'dossier-1'
        $pathSegments = array_map(function ($seg) {
            return is_string($seg) ? \Illuminate\Support\Str::slug($seg) : $seg;
        }, $pathSegments);

        $path = $base;
        if (!empty($pathSegments)) {
            $path .= DIRECTORY_SEPARATOR . implode(DIRECTORY_SEPARATOR, $pathSegments);
        }
        return $path;
    }

    public function index(Request $request)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);

        $serviceId = $request->query('service_id');
        $parentId = $request->query('parent_id');

        if ($serviceId !== null) {
            $service = Service::find($serviceId);
            if (!$service) return response()->json([]);
            // Permissions
            if ($user->role === 'admin' && (int)$user->enterprise_id !== (int)$service->enterprise_id) {
                return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
            }
            if ($user->role === 'agent') {
                $emp = Employee::where('user_id', $user->id)->first();
                if (!$emp || (int)$emp->service_id !== (int)$serviceId) {
                    return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
                }
            }
            // Ensure a root folder exists (lazy create)
            $roots = Folder::whereNull('parent_id')->where('service_id', $serviceId)->get();
            if ($roots->count() === 0) {
                $root = Folder::create([
                    'name' => $service->name,
                    'service_id' => $service->id,
                    'parent_id' => null,
                ]);
                // Mirror root on disk
                try {
                    $path = $this->buildRelativePath($root);
                    Storage::disk('local')->makeDirectory($path);
                    // Persist folder_path if column exists
                    try { $root->update(['folder_path' => $path]); } catch (\Throwable $e) { /* ignore */ }
                } catch (\Throwable $e) { /* ignore */ }
                $roots = collect([$root]);
            }
            return response()->json($roots->values());
        }

        if ($parentId !== null) {
            $parent = Folder::find($parentId);
            if (!$parent) return response()->json([]);
            // Permissions
            if ($user->role === 'admin') {
                $svc = Service::find($parent->service_id);
                if ($svc && (int)$svc->enterprise_id !== (int)$user->enterprise_id) {
                    return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
                }
            }
            if ($user->role === 'agent') {
                $emp = Employee::where('user_id', $user->id)->first();
                if (!$emp || (int)$emp->service_id !== (int)$parent->service_id) {
                    return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
                }
            }
            $children = Folder::where('parent_id', $parentId)->get();
            return response()->json($children->values());
        }

        // default: list nothing
        return response()->json([]);
    }

    public function show(Folder $folder)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);
        if ($user->role === 'admin') {
            $svc = Service::find($folder->service_id);
            if ($svc && (int)$svc->enterprise_id !== (int)$user->enterprise_id) {
                return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
            }
        }
        if ($user->role === 'agent') {
            $emp = Employee::where('user_id', $user->id)->first();
            if (!$emp || (int)$emp->service_id !== (int)$folder->service_id) {
                return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
            }
        }
        return response()->json($folder);
    }

    public function store(Request $request)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'parent_id' => ['nullable', 'integer', 'exists:folders,id'],
            'service_id' => ['nullable', 'integer', 'exists:services,id'],
        ]);

        $parentId = $validated['parent_id'] ?? null;
        $serviceId = $validated['service_id'] ?? null;

        if ($parentId !== null) {
            $parent = Folder::find($parentId);
            if (!$parent) return response()->json(['message' => 'Parent not found'], Response::HTTP_UNPROCESSABLE_ENTITY);
            $serviceId = $parent->service_id;
        } else {
            if (!$serviceId) return response()->json(['message' => 'service_id is required for root folders'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        // Permissions
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

        $folder = Folder::create([
            'name' => $validated['name'],
            'service_id' => $serviceId,
            'parent_id' => $parentId,
        ]);

        // Mirror on disk and persist folder_path
        try {
            $path = $this->buildRelativePath($folder);
            // Ensure directory exists
            Storage::disk('local')->makeDirectory($path);
            // Persist folder_path if column exists
            try { $folder->update(['folder_path' => $path]); } catch (\Throwable $e) { /* ignore */ }
        } catch (\Throwable $e) {
            // Non-fatal for API response; folder persisted in DB
        }

        return response()->json($folder, Response::HTTP_CREATED);
    }

    public function update(Request $request, Folder $folder)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        // Permissions
        if ($user->role === 'admin') {
            $svc = Service::find($folder->service_id);
            if ($svc && (int)$svc->enterprise_id !== (int)$user->enterprise_id) {
                return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
            }
        }
        if ($user->role === 'agent') {
            $emp = Employee::where('user_id', $user->id)->first();
            if (!$emp || (int)$emp->service_id !== (int)$folder->service_id) {
                return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
            }
        }

        $oldPath = $this->buildRelativePath($folder);
        $folder->name = $validated['name'];
        $folder->save();
        $newPath = $this->buildRelativePath($folder);

        // Rename directory on disk
        try {
            if ($oldPath !== $newPath && Storage::disk('local')->exists($oldPath)) {
                Storage::disk('local')->move($oldPath, $newPath);
            } else if (!Storage::disk('local')->exists($newPath)) {
                Storage::disk('local')->makeDirectory($newPath);
            }
            // Persist folder_path if column exists
            try { $folder->update(['folder_path' => $newPath]); } catch (\Throwable $e) { /* ignore */ }
        } catch (\Throwable $e) {
            // Ignore FS error, DB is source of truth
        }

        return response()->json($folder);
    }

    public function destroy(Folder $folder)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);

        // Permissions
        if ($user->role === 'admin') {
            $svc = Service::find($folder->service_id);
            if ($svc && (int)$svc->enterprise_id !== (int)$user->enterprise_id) {
                return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
            }
        }
        if ($user->role === 'agent') {
            $emp = Employee::where('user_id', $user->id)->first();
            if (!$emp || (int)$emp->service_id !== (int)$folder->service_id) {
                return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
            }
        }

        $targetPath = $this->buildRelativePath($folder);

        // Delete directory (and all children) on disk first
        try {
            if (Storage::disk('local')->exists($targetPath)) {
                Storage::disk('local')->deleteDirectory($targetPath);
            }
        } catch (\Throwable $e) {
            // ignore FS error
        }

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

        // Finally, delete folders from leaves to root in DB
        Folder::whereIn('id', $allFolderIds)->delete();

        return response()->json(null, Response::HTTP_NO_CONTENT);
    }
}
