<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Enterprise;
use App\Models\SuperAdminStorageOverview;
use App\Models\User;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

class StatsController extends Controller
{
    public function index()
    {
        $enterprises = Enterprise::count();
        $usersTotal = User::count();
        $admins = User::where('role', 'admin')->count();
        $agents = User::where('role', 'agent')->count();
        $superAdmins = User::where('role', 'super_admin')->count();

        $overview = SuperAdminStorageOverview::first();
        $storage = [
            'total_capacity' => $overview?->total_capacity ?? 0,
            'used_storage' => $overview?->used_storage ?? 0,
        ];

        $usersByEnterprise = User::select('enterprise_id', DB::raw('COUNT(*) as c'))
            ->whereNotNull('enterprise_id')
            ->groupBy('enterprise_id')
            ->pluck('c', 'enterprise_id');

        return response()->json([
            'enterprises' => $enterprises,
            'users' => [
                'total' => $usersTotal,
                'admin' => $admins,
                'agent' => $agents,
                'super_admin' => $superAdmins,
            ],
            'storage' => $storage,
            'users_by_enterprise' => $usersByEnterprise,
        ], Response::HTTP_OK);
    }
}
