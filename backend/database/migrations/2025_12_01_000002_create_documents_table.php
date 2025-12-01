<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        if (!Schema::hasTable('documents')) {
            Schema::create('documents', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->unsignedBigInteger('folder_id')->nullable();
                $table->unsignedBigInteger('service_id')->nullable();
                $table->unsignedBigInteger('enterprise_id')->nullable();
                $table->string('file_path');
                $table->string('mime_type')->nullable();
                $table->unsignedBigInteger('size_bytes')->default(0);
                $table->unsignedBigInteger('created_by')->nullable();
                $table->timestamps();

                $table->foreign('folder_id')->references('id')->on('folders')->onDelete('set null');
            });
        }
    }

    public function down(): void {
        Schema::dropIfExists('documents');
    }
};
