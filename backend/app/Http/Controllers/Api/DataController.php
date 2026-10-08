<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DataController extends Controller
{
    // Everything the app needs, in one call
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'settings' => ['currency' => $user->currency],
            'categories' => $user->categories()->orderBy('created_at')->get()->map->toApi()->values(),
            'transactions' => $user->transactions()->orderBy('date')->orderBy('created_at')->get()->map->toApi()->values(),
            'groceries' => $user->groceries()->orderBy('created_at')->get()->map->toApi()->values(),
        ]);
    }

    public function settings(Request $request): JsonResponse
    {
        $data = $request->validate(
            ['currency' => ['required', 'string', 'max:8']],
            ['currency.required' => 'Enter a currency'],
        );
        $request->user()->update(['currency' => trim($data['currency'])]);

        return response()->json(['currency' => $request->user()->currency]);
    }
}
