<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;

class AdminPermissionController extends Controller
{
    /**
     * GET /api/admin/permissions
     * Returns per-employee permissions for current admin enterprise.
     */
    public function index(Request $request)
    {
        $admin = Auth::user();
        if (!$admin || ($admin->role !== 'admin' && $admin->role !== 'super_admin')) {
            return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
        }

        $employees = Employee::with('user')
            ->where('enterprise_id', $admin->enterprise_id)
            ->get();

        $data = $employees->map(function (Employee $e) {
            return [
                'employee_id' => $e->id,
                'view_all_folders' => (bool) optional($e->user)->can_view_all_services,
                'delete_documents' => false,
            ];
        })->values();

        return response()->json($data);
    }

    /**
     * POST /api/admin/permissions
     * Updates per-employee permissions (currently: can_view_all_services).
     */
    public function store(Request $request)
    {
        $admin = Auth::user();
        if (!$admin || ($admin->role !== 'admin' && $admin->role !== 'super_admin')) {
            return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
        }

        $data = $request->validate([
            'employee_id' => ['required', 'integer', 'exists:employees,id'],
            'view_all_folders' => ['required', 'boolean'],
            'delete_documents' => ['nullable', 'boolean'],
        ]);

        $employee = Employee::with('user')->findOrFail($data['employee_id']);
        if ((int)$employee->enterprise_id !== (int)$admin->enterprise_id) {
            return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
        }

        if (!$employee->user) {
            return response()->json(['message' => 'Aucun utilisateur associé à cet employé'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $employee->user->update([
            'can_view_all_services' => (bool) $data['view_all_folders'],
        ]);

        return response()->json([
            'employee_id' => $employee->id,
            'view_all_folders' => (bool) $employee->user->can_view_all_services,
            'delete_documents' => false,
        ]);
    }
}
