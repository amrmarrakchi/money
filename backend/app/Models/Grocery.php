<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['name', 'priority', 'done', 'done_at'])]
class Grocery extends Model
{
    use HasUuids;

    protected function casts(): array
    {
        return ['done' => 'boolean', 'done_at' => 'datetime'];
    }

    public function toApi(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'priority' => $this->priority,
            'done' => $this->done,
            'doneAt' => $this->done_at?->toIso8601String(),
            'createdAt' => $this->created_at?->toIso8601String(),
        ];
    }
}
