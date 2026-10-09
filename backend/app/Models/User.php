<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens;

    protected $fillable = ['username', 'name', 'password', 'currency'];

    protected $hidden = ['password'];

    // The categories every account starts with: [type, name, colour]
    public const DEFAULT_CATEGORIES = [
        ['expense', 'Groceries', '#16a34a'], ['expense', 'Rent', '#4a3aa7'], ['expense', 'Bills & utilities', '#2a78d6'],
        ['expense', 'Transport', '#eb6834'], ['expense', 'Eating out', '#e87ba4'], ['expense', 'Health', '#e34948'],
        ['expense', 'Shopping', '#eda100'], ['expense', 'Leisure', '#1baf7a'], ['expense', 'Other', '#71717a'],
        ['income', 'Salary', '#16a34a'], ['income', 'Freelance', '#2a78d6'], ['income', 'Gifts', '#e87ba4'], ['income', 'Other', '#71717a'],
    ];

    protected function casts(): array
    {
        return ['password' => 'hashed'];
    }

    public function categories(): HasMany
    {
        return $this->hasMany(Category::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class);
    }

    public function groceries(): HasMany
    {
        return $this->hasMany(Grocery::class);
    }

    public function createDefaultCategories(): void
    {
        foreach (self::DEFAULT_CATEGORIES as [$type, $name, $color]) {
            $this->categories()->create(compact('type', 'name', 'color'));
        }
    }
}
