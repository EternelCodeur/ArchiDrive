<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Enterprise;
use App\Models\Service;
use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class AdminServiceController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $enterpriseId = $user?->enterprise_id;
        if (!$enterpriseId) {
            return response()->json([], Response::HTTP_FORBIDDEN);
        }
        $services = Service::where('enterprise_id', $enterpriseId)->get();
        return response()->json($services);
    }

    public function store(Request $request)
    {
        $user = Auth::user();
        $enterpriseId = $user?->enterprise_id;
        if (!$enterpriseId) {
            return response()->json(['message' => 'Enterprise not found'], Response::HTTP_FORBIDDEN);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'responsible_employee_id' => ['required', 'integer', 'exists:employees,id'],
        ]);

        $exists = Service::where('enterprise_id', $enterpriseId)
            ->where('name', $validated['name'])
            ->exists();
        if ($exists) {
            return response()->json(['message' => 'Service name already exists for this enterprise'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $service = Service::create([
            'name' => $validated['name'],
            'enterprise_id' => $enterpriseId,
            'responsible_employee_id' => $validated['responsible_employee_id'] ?? null,
        ]);

        $resp = Employee::find($validated['responsible_employee_id']);
        if (!$resp || (int)$resp->enterprise_id !== (int)$enterpriseId) {
            return response()->json(['message' => 'Le responsable sélectionné est invalide pour cette entreprise'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }
        $resp->service_id = $service->id;
        $resp->save();

        try {
            $enterprise = Enterprise::find($enterpriseId);
            if ($enterprise) {
                $basePath = $enterprise->folder_path;
                if (!$basePath) {
                    $slug = Str::slug($enterprise->name);
                    $basePath = 'enterprises/' . $slug;
                    if (!Storage::disk('local')->exists($basePath)) {
                        $basePath = 'enterprises/' . $slug . '-' . $enterprise->id;
                    }
                }
                if ($basePath) {
                    $disk = Storage::disk('local');
                    $serviceSlug = Str::slug($service->name);
                    $servicePath = rtrim($basePath, '/') . '/' . $serviceSlug;
                    if ($disk->exists($servicePath)) {
                        $servicePath = rtrim($basePath, '/') . '/' . $serviceSlug . '-' . $service->id;
                    }
                    $disk->makeDirectory($servicePath);
                    $service->folder_path = $servicePath;
                    $service->save();
                }
            }
        } catch (\Throwable $e) {
        }

        if (!Cache::has('services_events_sequence')) {
            Cache::forever('services_events_sequence', 0);
        }
        Cache::increment('services_events_sequence');

        return response()->json($service, Response::HTTP_CREATED);
    }

    public function update(Request $request, Service $service)
    {
        $user = Auth::user();
        $enterpriseId = $user?->enterprise_id;
        if ((int)$service->enterprise_id !== (int)$enterpriseId) {
            return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'responsible_employee_id' => ['required', 'integer', 'exists:employees,id'],
        ]);

        $resp = Employee::find($validated['responsible_employee_id']);
        if (!$resp || (int)$resp->enterprise_id !== (int)$enterpriseId) {
            return response()->json(['message' => 'Le responsable sélectionné est invalide pour cette entreprise'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $oldName = $service->name;
        $service->name = $validated['name'];
        $service->responsible_employee_id = $validated['responsible_employee_id'];
        $service->save();

        $resp->service_id = $service->id;
        $resp->save();

        if ($oldName !== $service->name) {
            try {
                $enterprise = Enterprise::find($enterpriseId);
                if ($enterprise) {
                    $basePath = $enterprise->folder_path;
                    if (!$basePath) {
                        $slug = Str::slug($enterprise->name);
                        $basePath = 'enterprises/' . $slug;
                        if (!Storage::disk('local')->exists($basePath)) {
                            $basePath = 'enterprises/' . $slug . '-' . $enterprise->id;
                        }
                    }
                    $disk = Storage::disk('local');
                    $currentPath = $service->folder_path;
                    if (!$currentPath) {
                        $oldSlug = Str::slug($oldName);
                        $currentPath = rtrim($basePath, '/') . '/' . $oldSlug;
                        if (!$disk->exists($currentPath)) {
                            $currentPath = rtrim($basePath, '/') . '/' . $oldSlug . '-' . $service->id;
                        }
                    }
                    $newSlug = Str::slug($service->name);
                    $newPath = rtrim($basePath, '/') . '/' . $newSlug;
                    if ($currentPath !== $newPath) {
                        if ($disk->exists($newPath)) {
                            $newPath = rtrim($basePath, '/') . '/' . $newSlug . '-' . $service->id;
                        }
                        if ($currentPath && $disk->exists($currentPath)) {
                            $disk->move($currentPath, $newPath);
                            $service->folder_path = $newPath;
                            $service->save();
                        } else {
                            $service->folder_path = $newPath;
                            $service->save();
                        }
                    }
                }
            } catch (\Throwable $e) {
            }
        }

        if (!Cache::has('services_events_sequence')) {
            Cache::forever('services_events_sequence', 0);
        }
        Cache::increment('services_events_sequence');

        return response()->json($service);
    }

    public function destroy(Service $service)
    {
        $user = Auth::user();
        $enterpriseId = $user?->enterprise_id;
        if ((int)$service->enterprise_id !== (int)$enterpriseId) {
            return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
        }

        Employee::where('service_id', $service->id)->update(['service_id' => null]);

        try {
            $path = $service->folder_path;
            if (!$path) {
                $enterprise = Enterprise::find($enterpriseId);
                if ($enterprise) {
                    $basePath = $enterprise->folder_path;
                    if (!$basePath) {
                        $slug = Str::slug($enterprise->name);
                        $basePath = 'enterprises/' . $slug;
                        if (!Storage::disk('local')->exists($basePath)) {
                            $basePath = 'enterprises/' . $slug . '-' . $enterprise->id;
                        }
                    }
                    $slug = Str::slug($service->name);
                    $path = rtrim($basePath, '/') . '/' . $slug;
                    if (!Storage::disk('local')->exists($path)) {
                        $path = rtrim($basePath, '/') . '/' . $slug . '-' . $service->id;
                    }
                }
            }
            if ($path && Storage::disk('local')->exists($path)) {
                Storage::disk('local')->deleteDirectory($path);
            }
        } catch (\Throwable $e) {
        }

        $service->delete();

        if (!Cache::has('services_events_sequence')) {
            Cache::forever('services_events_sequence', 0);
        }
        Cache::increment('services_events_sequence');

        return response()->json(null, Response::HTTP_NO_CONTENT);
    }

    public function assignMembers(Request $request, Service $service)
    {
        $user = Auth::user();
        $enterpriseId = $user?->enterprise_id;
        if ((int)$service->enterprise_id !== (int)$enterpriseId) {
            return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
        }

        $validated = $request->validate([
            'member_ids' => ['array'],
            'member_ids.*' => ['integer', 'exists:employees,id'],
        ]);

        $ids = $validated['member_ids'] ?? [];
        if (!empty($ids)) {
            Employee::whereIn('id', $ids)->where('enterprise_id', $enterpriseId)->update(['service_id' => $service->id]);
        }

        if (!Cache::has('employees_events_sequence')) {
            Cache::forever('employees_events_sequence', 0);
        }
        Cache::increment('employees_events_sequence');

        return response()->json(['updated' => count($ids)]);
    }

    public function removeMembers(Request $request, Service $service)
    {
        $user = Auth::user();
        $enterpriseId = $user?->enterprise_id;
        if ((int)$service->enterprise_id !== (int)$enterpriseId) {
            return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
        }

        $validated = $request->validate([
            'member_ids' => ['array'],
            'member_ids.*' => ['integer', 'exists:employees,id'],
        ]);

        $ids = $validated['member_ids'] ?? [];
        if (!empty($ids)) {
            Employee::whereIn('id', $ids)
                ->where('enterprise_id', $enterpriseId)
                ->where('service_id', $service->id)
                ->update(['service_id' => null]);
        }

        if (!Cache::has('employees_events_sequence')) {
            Cache::forever('employees_events_sequence', 0);
        }
        Cache::increment('employees_events_sequence');

        return response()->json(['updated' => count($ids)]);
    }
}
