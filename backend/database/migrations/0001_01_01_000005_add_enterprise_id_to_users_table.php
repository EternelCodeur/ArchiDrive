<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'enterprise_id')) {
                $table->foreignId('enterprise_id')->nullable()->constrained('enterprises')->onDelete('cascade');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'enterprise_id')) {
                $table->dropForeign(['enterprise_id']);
                $table->dropColumn('enterprise_id');
            }
        });
    }
};
