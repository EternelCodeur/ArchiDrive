<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\API\SuperAdminUserController;
use App\Http\Controllers\API\SuperAdminStorageOverviewController;
use App\Http\Controllers\API\EnterpriseController;
use App\Http\Controllers\API\AuthController;
use App\Http\Controllers\API\StatsController;
use App\Http\Controllers\API\EventsController;
use App\Http\Controllers\API\AdminServiceController;
use App\Http\Controllers\API\AdminEmployeeController;

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
        // SSE endpoint for users updates
        Route::get('/events/users', [EventsController::class, 'users']);
    });

    Route::middleware('role:admin')->group(function () {
        // Services CRUD + member assignment
        Route::get('/admin/services', [AdminServiceController::class, 'index']);
        Route::post('/admin/services', [AdminServiceController::class, 'store']);
        Route::put('/admin/services/{service}', [AdminServiceController::class, 'update']);
        Route::delete('/admin/services/{service}', [AdminServiceController::class, 'destroy']);
        Route::post('/admin/services/{service}/assign-members', [AdminServiceController::class, 'assignMembers']);

        // Employees CRUD
        Route::apiResource('/admin/employees', AdminEmployeeController::class);

        // SSE endpoints for services and employees updates
        Route::get('/events/services', [EventsController::class, 'services']);
        Route::get('/events/employees', [EventsController::class, 'employees']);
    });
});
