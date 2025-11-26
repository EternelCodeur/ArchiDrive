<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\User;
use Firebase\JWT\JWT;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Cookie;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $validated = $request->validate([
            'identifier' => ['required', 'string'],
            'password' => ['required', 'string'],
            'remember' => ['nullable', 'boolean'],
        ]);

        $identifier = $validated['identifier'];
        $password = $validated['password'];
        $remember = (bool)($validated['remember'] ?? false);

        $user = User::where('email', $identifier)
            ->orWhere('name', $identifier)
            ->first();

        if (!$user || !Hash::check($password, $user->password)) {
            return response()->json(['message' => 'Identifiants invalides'], Response::HTTP_UNAUTHORIZED);
        }

        $ttlSeconds = $remember ? 60 * 60 * 24 * 14 : 60 * 60 * 2; // 14j vs 2h
        $now = time();
        $payload = [
            'iss' => config('app.url'),
            'iat' => $now,
            'nbf' => $now,
            'exp' => $now + $ttlSeconds,
            'sub' => $user->id,
            'role' => $user->role,
        ];

        $token = JWT::encode($payload, $this->getJwtSecret(), 'HS256');

        $minutes = $remember ? intdiv($ttlSeconds, 60) : 0; // 0 => cookie de session
        $secure = $request->isSecure();
        $sameSite = 'lax';

        $response = response()->json([
            'token' => $token,
            'token_type' => 'Bearer',
            'expires_in' => $ttlSeconds,
            'user' => $this->formatUser($user),
        ]);

        // Set HttpOnly cookie for the JWT
        return $response->cookie(
            'token',
            $token,
            $minutes,
            '/',
            null,
            $secure,
            true,
            false,
            $sameSite,
        );
    }

    public function me(Request $request)
    {
        $user = $request->user() ?? $request->attributes->get('auth_user');
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);
        }

        return response()->json($this->formatUser($user));
    }

    public function logout()
    {
        Cookie::queue(Cookie::forget('token'));
        return response()->json(['message' => 'Logged out']);
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

    private function formatUser(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'service_id' => null,
            'enterprise_id' => 0,
            'avatar' => null,
        ];
    }
}
