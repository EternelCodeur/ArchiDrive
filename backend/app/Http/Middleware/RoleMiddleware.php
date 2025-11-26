<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class RoleMiddleware
{
    /**
     * Handle an incoming request.
     *
     * Usage: role:admin or role:admin,super_admin
     */
    public function handle(Request $request, Closure $next, string ...$roles)
    {
        $user = Auth::user() ?? $request->attributes->get('auth_user');
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        if (empty($roles)) {
            return $next($request);
        }

        if (!in_array($user->role, $roles, true)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return $next($request);
    }
}
