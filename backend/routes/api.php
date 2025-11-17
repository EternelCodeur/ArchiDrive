<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\SuperAdminUserController;
use App\Http\Controllers\Api\SuperAdminStorageOverviewController;

Route::get('/health', function () {
    return response()->json(['status' => 'OK']);
});


Route::apiResource('super-admins', SuperAdminUserController::class);
Route::apiResource('super-admin-storage-overviews', SuperAdminStorageOverviewController::class);
