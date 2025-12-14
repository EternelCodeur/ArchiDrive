<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Enterprise;
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

        $identifier = trim((string) $validated['identifier']);
        $password = $validated['password'];
        $remember = (bool)($validated['remember'] ?? false);

        $lowerIdentifier = strtolower($identifier);
        $user = User::whereRaw('LOWER(email) = ?', [$lowerIdentifier])
            ->orWhereRaw('LOWER(name) = ?', [$lowerIdentifier])
            ->first();

        if (!$user || !Hash::check($password, $user->password)) {
            return response()->json(['message' => 'Identifiants invalides'], Response::HTTP_UNAUTHORIZED);
        }

        $ttlSeconds = $remember ? 60 * 60 * 24 * 7 : 60 * 60 * 2; // 7j vs 2h
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
        $response = $response->cookie(
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

        // Set a non-HttpOnly cookie with minimal user info for client-side needs (id,name,email,role)
        try {
            $userPayload = base64_encode(json_encode([
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
            ], JSON_UNESCAPED_UNICODE));
            $response = $response->cookie(
                'u',
                $userPayload,
                $minutes,
                '/',
                null,
                $secure,
                false, // not HttpOnly so frontend can read if needed
                false,
                $sameSite,
            );
        } catch (\Throwable $e) {
            // ignore cookie set failure
        }

        return $response;
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
        Cookie::queue(Cookie::forget('u'));
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
        $enterpriseName = null;
        $enterpriseStorage = null;
        $enterpriseEmail = null;
        $enterpriseAdminName = null;
        if ($user->enterprise_id) {
            $enterprise = Enterprise::find($user->enterprise_id);
            $enterpriseName = $enterprise?->name;
            $enterpriseStorage = $enterprise?->storage;
            $enterpriseEmail = $enterprise?->email;
            $enterpriseAdminName = $enterprise?->admin_name;
        }

        // Resolve agent service info via Employee
        $serviceId = null;
        $serviceName = null;
        try {
            $employee = \App\Models\Employee::where('user_id', $user->id)->first();
            if ($employee && $employee->service_id) {
                $serviceId = (int) $employee->service_id;
                $svc = \App\Models\Service::find($serviceId);
                $serviceName = $svc?->name;
            }
        } catch (\Throwable $e) { /* ignore */ }

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'service_id' => $serviceId,
            'enterprise_id' => $user->enterprise_id,
            'enterprise_name' => $enterpriseName,
            'enterprise_storage' => $enterpriseStorage,
            'enterprise_email' => $enterpriseEmail,
            'enterprise_admin_name' => $enterpriseAdminName,
            'service_name' => $serviceName,
            'avatar' => null,
            'can_view_all_services' => (bool) ($user->can_view_all_services ?? false),
        ];
    }
}
