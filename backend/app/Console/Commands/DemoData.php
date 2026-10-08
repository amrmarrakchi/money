<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

// Fills an account with 6 months of example transactions, to try the app. Refuses an account that has some
class DemoData extends Command
{
    protected $signature = 'money:demo {user : amr or sakina}';

    protected $description = 'Add example transactions to an account';

    private int $seed = 7;

    private function rand(): float
    {
        return ($this->seed = ($this->seed * 16807) % 2147483647) / 2147483647;
    }

    private function pick(array $list): mixed
    {
        return $list[(int) floor($this->rand() * count($list))];
    }

    public function handle(): int
    {
        $user = User::where('username', $this->argument('user'))->first();
        if (! $user) {
            $this->error('Unknown account. Run `php artisan db:seed` first.');

            return self::FAILURE;
        }
        if ($user->transactions()->exists()) {
            $this->error("{$user->username} already has transactions: nothing changed.");

            return self::FAILURE;
        }
        if (! $user->categories()->exists()) {
            $user->createDefaultCategories();
        }

        // Subcategories take the type and colour of their category
        foreach (['Groceries' => ['Supermarket', 'Market', 'Bakery'], 'Transport' => ['Fuel', 'Taxi', 'Tram'],
            'Bills & utilities' => ['Electricity & water', 'Internet'], 'Eating out' => ['Restaurants', 'Coffee']] as $parentName => $names) {
            $parent = $user->categories()->where('type', 'expense')->where('name', $parentName)->whereNull('parent_id')->first();
            foreach ($names as $name) {
                $user->categories()->firstOrCreate(['name' => $name, 'parent_id' => $parent->id], ['type' => 'expense', 'color' => $parent->color]);
            }
        }
        $expense = fn (string $name) => $user->categories()->where('type', 'expense')->where('name', $name)->value('id');
        $income = fn (string $name) => $user->categories()->where('type', 'income')->where('name', $name)->value('id');

        $count = 0;
        $add = function (string $type, float $amount, string $categoryId, string $date, string $note = '') use ($user, &$count) {
            $user->transactions()->forceCreate([
                'id' => (string) \Illuminate\Support\Str::uuid7(), 'type' => $type, 'amount' => round($amount, 2), 'category_id' => $categoryId,
                'date' => $date, 'note' => $note, 'created_at' => "{$date} 12:00:00", 'updated_at' => "{$date} 12:00:00",
            ]);
            $count++;
        };

        $now = Carbon::now();
        for ($back = 5; $back >= 0; $back--) {
            $first = $now->copy()->startOfMonth()->subMonthsNoOverflow($back);
            $days = $back === 0 ? $now->day : $first->daysInMonth;
            $d = fn (int $day) => $first->copy()->day(min($day, $days))->format('Y-m-d');

            $add('income', 14500, $income('Salary'), $d(1), 'Monthly salary');
            if ($this->rand() < 0.5) {
                $add('income', 1500 + $this->rand() * 3000, $income('Freelance'), $d(12 + (int) floor($this->rand() * 10)), 'Website project');
            }
            $add('expense', 4200, $expense('Rent'), $d(2), 'Apartment');
            $add('expense', 380 + $this->rand() * 260, $expense('Electricity & water'), $d(6), 'Lydec');
            $add('expense', 249, $expense('Internet'), $d(9), 'Fibre');

            for ($day = 1; $day <= $days; $day++) {
                if ($this->rand() < 0.45) {
                    [$where, $note] = $this->pick([['Supermarket', 'Marjane'], ['Supermarket', 'Carrefour'], ['Market', 'Vegetables'], ['Bakery', 'Bread'], ['Groceries', 'Corner shop']]);
                    $add('expense', ($where === 'Bakery' ? 10 : 60) + $this->rand() * ($where === 'Bakery' ? 40 : 340), $expense($where), $d($day), $note);
                }
                if ($this->rand() < 0.3) {
                    $add('expense', 15 + $this->rand() * 60, $expense($this->pick(['Fuel', 'Taxi', 'Tram'])), $d($day));
                }
                if ($this->rand() < 0.15) {
                    $where = $this->pick(['Restaurants', 'Coffee']);
                    $add('expense', $where === 'Coffee' ? 15 + $this->rand() * 30 : 80 + $this->rand() * 260, $expense($where), $d($day),
                        $where === 'Coffee' ? 'With friends' : $this->pick(['Lunch', 'Dinner']));
                }
                if ($this->rand() < 0.05) {
                    $add('expense', 150 + $this->rand() * 900, $expense('Shopping'), $d($day), $this->pick(['Clothes', 'Shoes', 'Home']));
                }
                if ($this->rand() < 0.04) {
                    $add('expense', 100 + $this->rand() * 500, $expense('Leisure'), $d($day), $this->pick(['Cinema', 'Gym', 'Weekend trip']));
                }
                if ($this->rand() < 0.02) {
                    $add('expense', 200 + $this->rand() * 600, $expense('Health'), $d($day), $this->pick(['Pharmacy', 'Doctor']));
                }
            }
        }

        $this->info("{$user->username}: {$count} example transactions added");

        return self::SUCCESS;
    }
}
