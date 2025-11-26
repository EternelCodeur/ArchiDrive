<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\API\SuperAdminUserController;
use App\Http\Controllers\API\SuperAdminStorageOverviewController;
use App\Http\Controllers\API\EnterpriseController;
use App\Http\Controllers\API\AuthController;
use App\Http\Controllers\API\StatsController;

Route::get('/health', function () {
    return response()->json(['status' => 'OK']);
});

Route::post('/auth/login', [AuthController::class, 'login']);
Route::middleware('jwt')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    Route::middleware('role:super_admin')->group(function () {
        Route::apiResource('super-admins', SuperAdminUserController::class);
        Route::apiResource('super-admin-storage-overviews', SuperAdminStorageOverviewController::class);
        Route::apiResource('enterprises', EnterpriseController::class);
        Route::get('/stats', [StatsController::class, 'index']);
    });
});
