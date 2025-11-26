<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Enterprise;
use App\Models\SuperAdminStorageOverview;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;

class EnterpriseController extends Controller
{
    public function index()
    {
        $enterprises = Enterprise::all();

        return response()->json($enterprises);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'       => ['required', 'string', 'max:255'],
            'admin_name' => ['required', 'string', 'max:255'],
            'email'      => ['required', 'string', 'email', 'max:255', 'unique:users,email', 'unique:enterprises,email'],
            'storage'    => ['nullable', 'integer', 'min:0'],
        ]);

        $storage = $validated['storage'] ?? 0;

        $enterprise = Enterprise::create([
            'name'       => $validated['name'],
            'admin_name' => $validated['admin_name'],
            'email'      => $validated['email'],
            'storage'    => $storage,
        ]);

        $adminUser = User::create([
            'name'     => $validated['admin_name'],
            'email'    => $validated['email'],
            'role'     => 'admin',
            // 'password' => Str::random(16),
            'password' => "password123",
            'enterprise_id' => $enterprise->id,
        ]);

        $overview = SuperAdminStorageOverview::first();
        if ($overview && $storage > 0) {
            $overview->increment('used_storage', $storage);
        }

        // Create local folder for the enterprise and persist its path
        try {
            $slug = Str::slug($enterprise->name);
            $basePath = 'enterprises';
            $folderPath = $basePath . '/' . $slug;
            if (Storage::disk('local')->exists($folderPath)) {
                $folderPath = $basePath . '/' . $slug . '-' . $enterprise->id;
            }
            Storage::disk('local')->makeDirectory($folderPath);
            $enterprise->update(['folder_path' => $folderPath]);
        } catch (\Throwable $e) {
            // ignore directory creation failures
        }

        return response()->json([
            'enterprise' => $enterprise,
            'admin_user' => $adminUser,
        ], Response::HTTP_CREATED);
    }

    public function show(Enterprise $enterprise)
    {
        return response()->json($enterprise);
    }

    public function update(Request $request, Enterprise $enterprise)
    {
        $adminUser = User::where('enterprise_id', $enterprise->id)->where('role', 'admin')->first();
        $oldName = $enterprise->name;
        $oldFolderPath = $enterprise->folder_path;
        $validated = $request->validate([
            'name'       => ['required', 'string', 'max:255'],
            'admin_name' => ['required', 'string', 'max:255'],
            'email'      => ['required', 'string', 'email', 'max:255', 'unique:enterprises,email,' . $enterprise->id, 'unique:users,email,' . ($adminUser?->id ?? 'NULL')],
            'storage'    => ['nullable', 'integer', 'min:0'],
        ]);

        $oldStorage = $enterprise->storage ?? 0;
        $newStorage = $validated['storage'] ?? 0;

        $enterprise->update([
            'name'       => $validated['name'],
            'admin_name' => $validated['admin_name'],
            'email'      => $validated['email'],
            'storage'    => $newStorage,
        ]);

        if ($adminUser) {
            $adminUser->update([
                'name' => $validated['admin_name'],
                'email' => $validated['email'],
            ]);
        }

        // Rename enterprise folder if name changed
        if ($oldName !== $validated['name']) {
            try {
                $basePath = 'enterprises';
                $disk = Storage::disk('local');

                // Determine current folder path
                $currentPath = $oldFolderPath;
                if (!$currentPath) {
                    $oldSlug = Str::slug($oldName);
                    $candidate = $basePath . '/' . $oldSlug;
                    if ($disk->exists($candidate)) {
                        $currentPath = $candidate;
                    } else {
                        $candidate2 = $basePath . '/' . $oldSlug . '-' . $enterprise->id;
                        $currentPath = $disk->exists($candidate2) ? $candidate2 : $candidate2;
                    }
                }

                // Compute new folder path
                $newSlug = Str::slug($validated['name']);
                $newPath = $basePath . '/' . $newSlug;
                if ($currentPath !== $newPath) {
                    if ($disk->exists($newPath)) {
                        $newPath = $basePath . '/' . $newSlug . '-' . $enterprise->id;
                    }
                    if ($currentPath && $disk->exists($currentPath)) {
                        $disk->move($currentPath, $newPath);
                        $enterprise->update(['folder_path' => $newPath]);
                    } else {
                        // If old folder doesn't exist, just set folder_path to intended path
                        $enterprise->update(['folder_path' => $newPath]);
                    }
                }
            } catch (\Throwable $e) {
                // ignore rename failures
            }
        }

        $diff = $newStorage - $oldStorage;
        if ($diff !== 0) {
            $overview = SuperAdminStorageOverview::first();
            if ($overview) {
                if ($diff > 0) {
                    $overview->increment('used_storage', $diff);
                } else {
                    $newUsed = max(0, $overview->used_storage + $diff); // diff est négatif
                    $overview->used_storage = $newUsed;
                    $overview->save();
                }
            }
        }

        return response()->json($enterprise);
    }

    public function destroy(Enterprise $enterprise)
    {
        $storage = $enterprise->storage ?? 0;

        // Delete local folder if recorded
        try {
            $folderPath = $enterprise->folder_path;
            if (!$folderPath) {
                // fallback if not recorded
                $slug = Str::slug($enterprise->name);
                $basePath = 'enterprises';
                $folderPath = $basePath . '/' . $slug;
                if (!Storage::disk('local')->exists($folderPath)) {
                    $folderPath = $basePath . '/' . $slug . '-' . $enterprise->id;
                }
            }
            if ($folderPath && Storage::disk('local')->exists($folderPath)) {
                Storage::disk('local')->deleteDirectory($folderPath);
            }
        } catch (\Throwable $e) {
            // ignore folder deletion failures
        }

        // Delete all users linked to this enterprise (safety, in addition to FK cascade)
        User::where('enterprise_id', $enterprise->id)->delete();

        $enterprise->delete();

        $overview = SuperAdminStorageOverview::first();
        if ($overview && $storage > 0) {
            $newUsed = max(0, $overview->used_storage - $storage);
            $overview->used_storage = $newUsed;
            $overview->save();
        }

        return response()->json(null, Response::HTTP_NO_CONTENT);
    }
}
