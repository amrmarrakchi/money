<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

// Moves the data of the old JSON version ( data/amr.json, data/sakina.json ) into the database
class ImportJson extends Command
{
    protected $signature = 'money:import-json {dir : the old data/ folder} {--force : replace what the accounts already have}';

    protected $description = 'Import data/<user>.json files into the database';

    public function handle(): int
    {
        foreach (User::all() as $user) {
            $file = rtrim($this->argument('dir'), '/')."/{$user->username}.json";
            if (! is_file($file)) {
                $this->line("{$user->username}: no file, skipped");

                continue;
            }
            if ($user->transactions()->exists() && ! $this->option('force')) {
                $this->warn("{$user->username}: already has transactions, skipped ( --force replaces them )");

                continue;
            }
            $data = json_decode(file_get_contents($file), true);

            DB::transaction(function () use ($user, $data) {
                $user->transactions()->delete();
                $user->categories()->whereNotNull('parent_id')->delete();
                $user->categories()->delete();
                $user->update(['currency' => $data['settings']['currency'] ?? 'MAD']);

                // Main categories first, then their subcategories
                $categories = collect($data['categories'] ?? [])->sortBy(fn ($c) => ! empty($c['parentId']))->values();
                foreach ($categories as $c) {
                    $user->categories()->forceCreate([
                        'id' => $c['id'], 'type' => $c['type'], 'name' => $c['name'], 'color' => $c['color'] ?? '#71717a',
                        'parent_id' => $c['parentId'] ?? null,
                    ]);
                }
                foreach ($data['transactions'] ?? [] as $t) {
                    $user->transactions()->forceCreate([
                        'id' => $t['id'], 'type' => $t['type'], 'amount' => $t['amount'], 'category_id' => $t['categoryId'],
                        'date' => $t['date'], 'note' => $t['note'] ?? '',
                        'created_at' => $t['createdAt'] ?? now(), 'updated_at' => $t['updatedAt'] ?? ($t['createdAt'] ?? now()),
                    ]);
                }
                foreach ($data['groceries'] ?? [] as $g) {
                    $user->groceries()->forceCreate([
                        'id' => $g['id'], 'name' => $g['name'], 'priority' => $g['priority'] ?? 'normal', 'done' => $g['done'] ?? false,
                        'done_at' => $g['doneAt'] ?? null, 'created_at' => $g['createdAt'] ?? now(), 'updated_at' => $g['createdAt'] ?? now(),
                    ]);
                }
            });

            $this->info("{$user->username}: ".count($data['transactions'] ?? []).' transactions imported');
        }

        return self::SUCCESS;
    }
}
