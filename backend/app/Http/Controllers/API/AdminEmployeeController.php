<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Response;

class AdminEmployeeController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        if (($user?->role ?? '') !== 'admin') {
            return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
        }
        $enterpriseId = $user?->enterprise_id;
        if (!$enterpriseId) {
            return response()->json(['message' => 'Aucune entreprise assignée à cet administrateur'], Response::HTTP_FORBIDDEN);
        }
        $employees = Employee::where('enterprise_id', $enterpriseId)->get();
        return response()->json($employees);
    }

    public function store(Request $request)
    {
        $user = Auth::user();
        if (($user?->role ?? '') !== 'admin') {
            return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
        }
        $enterpriseId = $user?->enterprise_id;
        if (!$enterpriseId) {
            return response()->json(['message' => 'Enterprise not found'], Response::HTTP_FORBIDDEN);
        }

        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:employees,email', 'unique:users,email'],
            'position' => ['nullable', 'string', 'max:255'],
            'service_id' => ['nullable', 'integer'],
        ]);

        $employee = DB::transaction(function () use ($validated, $enterpriseId) {
            $name = trim(($validated['first_name'] ?? '') . ' ' . ($validated['last_name'] ?? ''));
            $userModel = new User();
            $userModel->name = $name;
            $userModel->email = $validated['email'];
            $userModel->role = 'agent';
            $userModel->password = 'password123';
            $userModel->enterprise_id = $enterpriseId;
            $userModel->save();

            return Employee::create([
                'first_name' => $validated['first_name'],
                'last_name' => $validated['last_name'],
                'email' => $validated['email'],
                'position' => $validated['position'] ?? null,
                'enterprise_id' => $enterpriseId,
                'service_id' => $validated['service_id'] ?? null,
                'user_id' => $userModel->id,
            ]);
        });

        if (!Cache::has('employees_events_sequence')) {
            Cache::forever('employees_events_sequence', 0);
        }
        Cache::increment('employees_events_sequence');

        return response()->json($employee, Response::HTTP_CREATED);
    }

    public function update(Request $request, Employee $employee)
    {
        $auth = Auth::user();
        if (($auth?->role ?? '') !== 'admin') {
            return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
        }
        $enterpriseId = $auth?->enterprise_id;
        if ((int)$employee->enterprise_id !== (int)$enterpriseId) {
            return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
        }

        $userModel = $employee->user_id ? User::find($employee->user_id) : null;
        $userId = $userModel?->id ?? 'NULL';
        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:employees,email,' . $employee->id, 'unique:users,email,' . $userId],
            'position' => ['nullable', 'string', 'max:255'],
            'service_id' => ['nullable', 'integer'],
        ]);

        DB::transaction(function () use ($validated, $employee, $userModel, $enterpriseId) {
            $employee->first_name = $validated['first_name'];
            $employee->last_name = $validated['last_name'];
            $employee->email = $validated['email'];
            $employee->position = $validated['position'] ?? null;
            $employee->service_id = $validated['service_id'] ?? null;
            $employee->save();

            // Sync linked user
            if ($userModel) {
                $userModel->name = trim($validated['first_name'] . ' ' . $validated['last_name']);
                $userModel->email = $validated['email'];
                $userModel->save();
            } else {
                // Create and link if missing
                $newUser = new User();
                $newUser->name = trim($validated['first_name'] . ' ' . $validated['last_name']);
                $newUser->email = $validated['email'];
                $newUser->role = 'agent';
                $newUser->password = 'password123';
                $newUser->enterprise_id = $enterpriseId;
                $newUser->save();
                $employee->user_id = $newUser->id;
                $employee->save();
            }
        });

        if (!Cache::has('employees_events_sequence')) {
            Cache::forever('employees_events_sequence', 0);
        }
        Cache::increment('employees_events_sequence');

        return response()->json($employee);
    }

    public function destroy(Employee $employee)
    {
        $auth = Auth::user();
        if (($auth?->role ?? '') !== 'admin') {
            return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
        }
        $enterpriseId = $auth?->enterprise_id;
        if ((int)$employee->enterprise_id !== (int)$enterpriseId) {
            return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
        }

        DB::transaction(function () use ($employee) {
            $userModel = $employee->user_id ? User::find($employee->user_id) : null;
            if ($userModel) {
                // Deleting user will cascade-delete employee via FK
                $userModel->delete();
            } else {
                $employee->delete();
            }
        });

        if (!Cache::has('employees_events_sequence')) {
            Cache::forever('employees_events_sequence', 0);
        }
        Cache::increment('employees_events_sequence');

        return response()->json(null, Response::HTTP_NO_CONTENT);
    }
}
