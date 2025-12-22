<?php

use Illuminate\Support\Facades\Route;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

// routes/web.php
Route::get('/{any}', function () {
    $path = public_path('build/index.html');

    return new BinaryFileResponse($path);
})->where('any', '^(?!api).*$');
