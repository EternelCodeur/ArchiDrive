<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;

class PublicFolderController extends Controller
{
    /**
     * POST /api/public-folders
     * Minimal placeholder endpoint to acknowledge creation of a public folder.
     * Returns 201 with the provided name. You can extend to actually persist a
     * real shared folder in DB and filesystem if required by your business rules.
     */
    public function store(Request $request)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);
        }
        if (!in_array($user->role, ['admin', 'super_admin'], true)) {
            return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
        }

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        return response()->json([
            'id' => 0,
            'name' => $data['name'],
            'message' => 'Created (placeholder)'
        ], Response::HTTP_CREATED);
    }
}
