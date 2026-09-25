<?php

use Illuminate\Support\Facades\Route;

// Serve the React app for all NON-API routes
// This prevents API routes from being caught by the React app
Route::get('/{any}', function () {
    return view('app');
})->where('any', '^(?!api).*$');  // Exclude any route starting with 'api'