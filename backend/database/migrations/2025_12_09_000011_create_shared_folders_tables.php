<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('shared_folders', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('enterprise_id');
            $table->unsignedBigInteger('folder_id');
            $table->string('name');
            $table->enum('visibility', ['enterprise', 'services'])->default('enterprise');
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();

            $table->foreign('enterprise_id')->references('id')->on('enterprises')->onDelete('cascade');
            $table->foreign('folder_id')->references('id')->on('folders')->onDelete('cascade');
        });

        Schema::create('shared_folder_service', function (Blueprint $table) {
            $table->unsignedBigInteger('shared_folder_id');
            $table->unsignedBigInteger('service_id');

            $table->primary(['shared_folder_id', 'service_id']);
            $table->foreign('shared_folder_id')->references('id')->on('shared_folders')->onDelete('cascade');
            $table->foreign('service_id')->references('id')->on('services')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shared_folder_service');
        Schema::dropIfExists('shared_folders');
    }
};
