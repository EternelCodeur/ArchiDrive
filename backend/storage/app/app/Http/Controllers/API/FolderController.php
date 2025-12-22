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
    private function resolveAllowedServiceIds(): array
    {
        $user = Auth::user();
        if (!$user) return [];
        if (in_array($user->role, ['admin', 'super_admin'], true)) {
            $enterpriseId = $user->enterprise_id;
            if (!$enterpriseId) return [];
            return Service::where('enterprise_id', $enterpriseId)->pluck('id')->all();
        }
        if ($user->role === 'agent') {
            $employee = Employee::where('user_id', $user->id)->first();
            if (!$employee || !$employee->service_id) return [];
            return [$employee->service_id];
        }
        return [];
    }

    public function index(Request $request)
    {
        $allowed = $this->resolveAllowedServiceIds();
        if (empty($allowed)) {
            return response()->json([], Response::HTTP_OK);
        }

        $parentId = $request->query('parent_id');
        $serviceId = $request->query('service_id');

        $q = Folder::query()->whereIn('service_id', $allowed);
        if ($parentId !== null) {
            $q->where('parent_id', (int) $parentId);
        } else {
            // default: root folders
            $q->whereNull('parent_id');
            if ($serviceId !== null) {
                $q->where('service_id', (int) $serviceId);
            }
        }
        return response()->json($q->orderBy('name')->get());
    }

    public function store(Request $request)
    {
        $allowed = $this->resolveAllowedServiceIds();
        if (empty($allowed)) {
            return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'parent_id' => ['nullable', 'integer', 'exists:folders,id'],
            'service_id' => ['nullable', 'integer'],
        ]);

        $parentId = $validated['parent_id'] ?? null;
        $serviceId = $validated['service_id'] ?? null;

        // For agents: derive service_id from the connected employee, ignore payload service_id
        $user = Auth::user();
        if (($user?->role ?? '') === 'agent') {
            $employee = Employee::where('user_id', $user->id)->first();
            if (!$employee || !$employee->service_id) {
                return response()->json(['message' => "Votre compte n'est pas assigné à un service"], Response::HTTP_UNPROCESSABLE_ENTITY);
            }
            $serviceId = (int) $employee->service_id;
        }

        if ($parentId !== null) {
            $parent = Folder::find($parentId);
            if (!$parent) {
                return response()->json(['message' => 'Parent folder not found'], Response::HTTP_UNPROCESSABLE_ENTITY);
            }
            if (!in_array($parent->service_id, $allowed, true)) {
                return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
            }
            // enforce same service as parent
            $serviceId = $parent->service_id;
        } else {
            // root folder creation must specify an allowed service or derive from agent
            if ($serviceId === null) {
                // fallback: if a single allowed service, use it
                if (count($allowed) === 1) {
                    $serviceId = $allowed[0];
                } else {
                    return response()->json(['message' => 'service_id is required for root folders'], Response::HTTP_UNPROCESSABLE_ENTITY);
                }
            }
            if (!in_array((int)$serviceId, $allowed, true)) {
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

    public function show(Folder $folder)
    {
        $allowed = $this->resolveAllowedServiceIds();
        if (!in_array((int)$folder->service_id, $allowed, true)) {
            return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
        }
        return response()->json($folder);
    }

    public function update(Request $request, Folder $folder)
    {
        $allowed = $this->resolveAllowedServiceIds();
        if (!in_array((int)$folder->service_id, $allowed, true)) {
            return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'parent_id' => ['nullable', 'integer', 'exists:folders,id'],
        ]);

        $newParentId = $validated['parent_id'] ?? $folder->parent_id;
        if ($newParentId !== null) {
            $parent = Folder::find($newParentId);
            if (!$parent) {
                return response()->json(['message' => 'Parent folder not found'], Response::HTTP_UNPROCESSABLE_ENTITY);
            }
            if ((int)$parent->id === (int)$folder->id) {
                return response()->json(['message' => 'Cannot set folder as its own parent'], Response::HTTP_UNPROCESSABLE_ENTITY);
            }
            if ($parent->service_id !== $folder->service_id) {
                return response()->json(['message' => 'Cannot move folder across services'], Response::HTTP_UNPROCESSABLE_ENTITY);
            }
        }

        $folder->name = $validated['name'];
        $folder->parent_id = $newParentId;
        $folder->save();

        return response()->json($folder);
    }

    public function destroy(Folder $folder)
    {
        $allowed = $this->resolveAllowedServiceIds();
        if (!in_array((int)$folder->service_id, $allowed, true)) {
            return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
        }

        $folder->delete();
        return response()->json(null, Response::HTTP_NO_CONTENT);
    }
}
