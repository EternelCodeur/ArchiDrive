<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Enterprise;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;

class UiPreferencesController extends Controller
{
    public function show(Request $request)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);
        }
        if (!$user->enterprise_id) {
            return response()->json([
                'ui_theme' => 'light',
                'ui_accent_color' => 'blue',
            ]);
        }
        $ent = Enterprise::find($user->enterprise_id);
        if (!$ent) {
            return response()->json(['message' => 'Not found'], 404);
        }
        return response()->json([
            'ui_theme' => $ent->ui_theme ?? 'light',
            'ui_accent_color' => $ent->ui_accent_color ?? 'blue',
        ]);
    }

    public function store(Request $request)
    {
        $user = Auth::user();
        if (!$user || ($user->role !== 'admin' && $user->role !== 'super_admin')) {
            return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
        }
        if (!$user->enterprise_id) {
            return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
        }
        $data = $request->validate([
            'ui_theme' => ['required', 'in:light,dark,system'],
            'ui_accent_color' => ['required', 'in:blue,green,purple'],
        ]);
        $ent = Enterprise::find($user->enterprise_id);
        if (!$ent) {
            return response()->json(['message' => 'Not found'], 404);
        }
        $ent->update([
            'ui_theme' => $data['ui_theme'],
            'ui_accent_color' => $data['ui_accent_color'],
        ]);
        return response()->json([
            'ui_theme' => $ent->ui_theme,
            'ui_accent_color' => $ent->ui_accent_color,
        ]);
    }
}
