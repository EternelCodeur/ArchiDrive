<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Schema;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Schema::defaultStringLength(191);

        RateLimiter::for('api', function (Request $request) {
            $userId = $request->user()?->id;
            $key = $userId ? ('u:' . $userId) : ('ip:' . (string) $request->ip());

            // Sidebar can burst many parallel reads (services + roots + folder children).
            // Keep the global limit high enough to avoid 429s that would blank the UI.
            return Limit::perMinute(600)->by($key);
        });

        RateLimiter::for('auth', function (Request $request) {
            $userId = $request->user()?->id;
            $key = $userId ? ('u:' . $userId) : ('ip:' . (string) $request->ip());

            return Limit::perMinute(30)->by('auth:' . $key);
        });
    }
}
