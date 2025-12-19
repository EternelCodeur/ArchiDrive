<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('documents')) {
            Schema::table('documents', function (Blueprint $table) {
                try { $table->index(['folder_id']); } catch (\Throwable $e) { /* ignore */ }
                try { $table->index(['service_id']); } catch (\Throwable $e) { /* ignore */ }
                try { $table->index(['enterprise_id']); } catch (\Throwable $e) { /* ignore */ }
                try { $table->index(['created_by']); } catch (\Throwable $e) { /* ignore */ }
                try { $table->index(['folder_id', 'id']); } catch (\Throwable $e) { /* ignore */ }
            });
        }

        if (Schema::hasTable('shared_folders')) {
            Schema::table('shared_folders', function (Blueprint $table) {
                try { $table->index(['enterprise_id']); } catch (\Throwable $e) { /* ignore */ }
                try { $table->index(['folder_id']); } catch (\Throwable $e) { /* ignore */ }
                try { $table->index(['enterprise_id', 'visibility']); } catch (\Throwable $e) { /* ignore */ }
            });
        }

        if (Schema::hasTable('employees')) {
            Schema::table('employees', function (Blueprint $table) {
                try { $table->index(['user_id']); } catch (\Throwable $e) { /* ignore */ }
                try { $table->index(['service_id']); } catch (\Throwable $e) { /* ignore */ }
                try { $table->index(['enterprise_id']); } catch (\Throwable $e) { /* ignore */ }
            });
        }

        if (Schema::hasTable('services')) {
            Schema::table('services', function (Blueprint $table) {
                try { $table->index(['enterprise_id']); } catch (\Throwable $e) { /* ignore */ }
            });
        }
    }

    public function down(): void
    {
        // Intentionally no-op: safely removing unknown index names is DB-specific.
    }
};
