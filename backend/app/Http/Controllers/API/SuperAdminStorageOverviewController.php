<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SuperAdminStorageOverview;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class SuperAdminStorageOverviewController extends Controller
{
    public function index()
    {
        $overview = SuperAdminStorageOverview::first();

        return response()->json($overview);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'total_capacity' => ['required', 'integer', 'min:0'],
            'used_storage'   => ['nullable', 'integer', 'min:0'],
        ]);

        $overview = SuperAdminStorageOverview::create([
            'total_capacity' => $validated['total_capacity'],
            'used_storage'   => $validated['used_storage'] ?? 0,
        ]);

        return response()->json($overview, Response::HTTP_CREATED);
    }

    public function show(SuperAdminStorageOverview $superAdminStorageOverview)
    {
        return response()->json($superAdminStorageOverview);
    }

    public function update(Request $request, SuperAdminStorageOverview $superAdminStorageOverview)
    {
        $validated = $request->validate([
            'total_capacity' => ['required', 'integer', 'min:0'],
            'used_storage'   => ['nullable', 'integer', 'min:0'],
        ]);

        $superAdminStorageOverview->update([
            'total_capacity' => $validated['total_capacity'],
            'used_storage'   => $validated['used_storage'] ?? $superAdminStorageOverview->used_storage,
        ]);

        return response()->json($superAdminStorageOverview);
    }

    public function destroy(SuperAdminStorageOverview $superAdminStorageOverview)
    {
        $superAdminStorageOverview->delete();

        return response()->json(null, Response::HTTP_NO_CONTENT);
    }
}
