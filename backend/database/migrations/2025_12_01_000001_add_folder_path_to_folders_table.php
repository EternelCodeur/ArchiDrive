<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        if (!Schema::hasColumn('folders', 'folder_path')) {
            Schema::table('folders', function (Blueprint $table) {
                $table->string('folder_path')->nullable()->after('name');
            });
        }
    }

    public function down(): void {
        if (Schema::hasColumn('folders', 'folder_path')) {
            Schema::table('folders', function (Blueprint $table) {
                $table->dropColumn('folder_path');
            });
        }
    }
};
