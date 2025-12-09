<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('enterprises', function (Blueprint $table) {
            $table->string('ui_theme')->default('light');
            $table->string('ui_accent_color')->default('blue');
        });
    }

    public function down(): void
    {
        Schema::table('enterprises', function (Blueprint $table) {
            $table->dropColumn(['ui_theme', 'ui_accent_color']);
        });
    }
};
