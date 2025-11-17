<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('super_admin_storage_overviews', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('total_capacity');
            $table->unsignedBigInteger('used_storage')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('super_admin_storage_overviews');
    }
};
