<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('enterprises', function (Blueprint $table) {
            if (!Schema::hasColumn('enterprises', 'folder_path')) {
                $table->string('folder_path')->nullable()->after('storage');
            }
        });
    }

    public function down(): void
    {
        Schema::table('enterprises', function (Blueprint $table) {
            if (Schema::hasColumn('enterprises', 'folder_path')) {
                $table->dropColumn('folder_path');
            }
        });
    }
};
