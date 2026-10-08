<?php

use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // No login page here: the frontend handles it, an API call without a token just gets a 401
        $middleware->redirectGuestsTo(fn () => null);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(fn (Request $request) => $request->is('api/*') || $request->expectsJson());

        // The frontend reads { error: "message" } on every failed call
        $exceptions->render(fn (ValidationException $e, Request $r) => $r->is('api/*')
            ? response()->json(['error' => collect($e->errors())->flatten()->first()], 422) : null);
        $exceptions->render(fn (AuthenticationException $e, Request $r) => $r->is('api/*')
            ? response()->json(['error' => 'Please sign in'], 401) : null);
        $exceptions->render(fn (ModelNotFoundException $e, Request $r) => $r->is('api/*')
            ? response()->json(['error' => 'Not found'], 404) : null);
        $exceptions->render(fn (HttpExceptionInterface $e, Request $r) => $r->is('api/*')
            ? response()->json(['error' => $e->getMessage() ?: 'Something went wrong'], $e->getStatusCode()) : null);
    })->create();
