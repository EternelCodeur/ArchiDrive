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
use App\Http\Controllers\API\AdminPermissionController;
use App\Http\Controllers\API\PublicFolderController;
use App\Http\Controllers\API\FolderController;
use App\Http\Controllers\API\UiPreferencesController;
use App\Http\Controllers\API\SharedFolderController;

Route::get('/health', function () {
    return response()->json(['status' => 'OK']);
});

Route::post('/auth/login', [AuthController::class, 'login']);
Route::middleware('jwt')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    // Enterprise UI preferences (theme & accent)
    Route::get('/ui-preferences', [UiPreferencesController::class, 'show']);
    Route::post('/admin/ui-preferences', [UiPreferencesController::class, 'store']);

    // Shared folders
    Route::get('/shared-folders/visible', [SharedFolderController::class, 'visible']);

    // Visible services for the authenticated user (agent/admin/super_admin)
    Route::get('/services/visible', [AdminServiceController::class, 'visible']);

    // Admin permissions (allow both admin and super_admin; controller enforces role check)
    Route::get('/admin/permissions', [AdminPermissionController::class, 'index']);
    Route::post('/admin/permissions', [AdminPermissionController::class, 'store']);

    // Public folders creation (placeholder)
    Route::post('/public-folders', [PublicFolderController::class, 'store']);

    // Folders CRUD (index/show/store/update/destroy)
    Route::apiResource('folders', FolderController::class)->only(['index', 'show', 'store', 'update', 'destroy']);
    // Fallback delete (for clients that can't use DELETE)
    Route::post('/folders/delete', function (Request $request) {
        $id = $request->input('id');
        if (!$id) { return response()->json(['message' => 'id required'], 422); }
        $folder = App\Models\Folder::find($id);
        if (!$folder) { return response()->json(['message' => 'not found'], 404); }
        return app(FolderController::class)->destroy($folder);
    });

    // Documents CRUD
    Route::apiResource('documents', \App\Http\Controllers\API\DocumentController::class);
    Route::get('documents/{document}/download', [\App\Http\Controllers\API\DocumentController::class, 'download']);

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
        Route::post('/admin/services/{service}/remove-members', [AdminServiceController::class, 'removeMembers']);

        // Employees CRUD
        Route::apiResource('/admin/employees', AdminEmployeeController::class);

        // Shared folders management (admin)
        Route::post('/admin/shared-folders', [SharedFolderController::class, 'store']);
        Route::post('/admin/shared-folders/link', [SharedFolderController::class, 'link']);
        Route::patch('/admin/shared-folders/{sharedFolder}', [SharedFolderController::class, 'update']);
        Route::delete('/admin/shared-folders/{sharedFolder}', [SharedFolderController::class, 'destroy']);

        // SSE endpoints for services and employees updates
        Route::get('/events/services', [EventsController::class, 'services']);
        Route::get('/events/employees', [EventsController::class, 'employees']);
    });
});
