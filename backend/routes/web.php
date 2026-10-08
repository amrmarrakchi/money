<?php

use Illuminate\Support\Facades\Route;

// The frontend ( built into public/ by `npm run build` at the project root ) is a single page app:
// any page that is not a file or an /api route is answered with its index.html
Route::get('/{any?}', function () {
    $page = public_path('index.html');
    abort_unless(is_file($page), 404, 'The frontend is not built: run `npm run build` at the project root.');

    return response()->file($page, ['Content-Type' => 'text/html; charset=utf-8']);
})->where('any', '^(?!api/).*$');
