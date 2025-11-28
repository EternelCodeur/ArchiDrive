<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Folder;
use App\Models\Service;
use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;

class FolderController extends Controller
{
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

        return response()->json($folder, Response::HTTP_CREATED);
    }
}
