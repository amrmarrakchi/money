<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

// The two accounts. Safe to run again: an existing account is left as it is
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $accounts = [
            'amr' => ['Amr', env('MONEY_AMR_PASSWORD', '1234')],
            'sakina' => ['Sakina', env('MONEY_SAKINA_PASSWORD', '1234')],
        ];

        foreach ($accounts as $username => [$name, $password]) {
            if (User::where('username', $username)->exists()) {
                continue;
            }
            User::create(compact('username', 'name', 'password'))->createDefaultCategories();
        }
    }
}
