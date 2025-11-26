<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class JwtAuthenticate
{
    public function handle(Request $request, Closure $next)
    {
        $authHeader = $request->header('Authorization', '');
        $token = null;
        if (\str_starts_with($authHeader, 'Bearer ')) {
            $token = \substr($authHeader, 7);
        } else {
            $token = (string) $request->cookie('token', '');
        }

        if (!$token) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        try {
            $secret = $this->getJwtSecret();
            $decoded = JWT::decode($token, new Key($secret, 'HS256'));
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Invalid token'], 401);
        }

        $userId = $decoded->sub ?? null;
        if (!$userId) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $user = User::find($userId);
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        // Attach user to the current request lifecycle
        Auth::setUser($user);
        $request->setUserResolver(fn () => $user);
        $request->attributes->set('auth_user', $user);
        $request->attributes->set('jwt_payload', (array) $decoded);

        return $next($request);
    }

    private function getJwtSecret(): string
    {
        $secret = env('JWT_SECRET');
        if ($secret) {
            if (\str_starts_with($secret, 'base64:')) {
                return base64_decode(\substr($secret, 7));
            }
            return $secret;
        }

        $appKey = config('app.key');
        if ($appKey && \str_starts_with($appKey, 'base64:')) {
            return base64_decode(\substr($appKey, 7));
        }
        return (string) $appKey;
    }
}
