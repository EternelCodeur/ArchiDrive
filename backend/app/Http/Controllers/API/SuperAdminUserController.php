<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class SuperAdminUserController extends Controller
{
    public function index()
    {
        $superAdmins = User::where('role', 'super_admin')->get();

        return response()->json($superAdmins);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
        ]);

        $user = User::create([
            'name'   => $validated['name'],
            'email'  => $validated['email'],
            'role'   => 'super_admin',
            'password' => 'password123',
        ]);

        if (!Cache::has('users_events_sequence')) {
            Cache::forever('users_events_sequence', 0);
        }
        Cache::increment('users_events_sequence');

        return response()->json($user, Response::HTTP_CREATED);
    }

    public function update(Request $request, User $superAdmin)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email,' . $superAdmin->id],
        ]);

        if ($superAdmin->role !== 'super_admin') {
            return response()->json([
                'message' => 'Only super admin users can be managed here.',
            ], Response::HTTP_FORBIDDEN);
        }

        $superAdmin->update($validated);

        Cache::increment('users_events_sequence');

        return response()->json($superAdmin);
    }

    public function destroy(User $superAdmin)
    {
        if ($superAdmin->role !== 'super_admin') {
            return response()->json([
                'message' => 'Only super admin users can be managed here.',
            ], Response::HTTP_FORBIDDEN);
        }

        $superAdmin->delete();

        // Notify listeners via SSE sequence bump
        Cache::increment('users_events_sequence');

        return response()->json(null, Response::HTTP_NO_CONTENT);
    }
}
