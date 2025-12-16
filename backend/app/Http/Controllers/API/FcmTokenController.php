<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\UserFcmToken;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;

class FcmTokenController extends Controller
{
    public function store(Request $request)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);

        $validated = $request->validate([
            'token' => ['required', 'string', 'max:191'],
            'device' => ['nullable', 'string', 'max:50'],
        ]);

        $token = (string) $validated['token'];
        $device = $validated['device'] ?? null;

        $row = UserFcmToken::updateOrCreate(
            ['token' => $token],
            ['user_id' => $user->id, 'device' => $device, 'last_seen_at' => now()]
        );

        return response()->json(['id' => $row->id, 'token' => $row->token]);
    }

    public function destroy(Request $request)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['message' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);

        $validated = $request->validate([
            'token' => ['required', 'string', 'max:191'],
        ]);

        $token = (string) $validated['token'];

        UserFcmToken::where('user_id', $user->id)->where('token', $token)->delete();

        return response()->json(['message' => 'Deleted']);
    }
}
