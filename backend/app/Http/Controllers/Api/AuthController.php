<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $username = strtolower(trim((string) $request->input('username')));
        $user = User::where('username', $username)->first();

        // Hash::check on a missing user would be skipped: keep the timing the same either way
        $ok = Hash::check((string) $request->input('password'), $user->password ?? Hash::make('none'));
        abort_unless($user && $ok, 401, 'Wrong username or password');

        // A sign-in lasts 30 days
        $token = $user->createToken('web', ['*'], now()->addDays(30))->plainTextToken;

        return response()->json(['token' => $token, 'user' => ['username' => $user->username, 'name' => $user->name]]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json(['username' => $user->username, 'name' => $user->name]);
    }
}
