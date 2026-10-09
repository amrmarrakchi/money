<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Transaction extends Model
{
    use HasUuids;

    protected $fillable = ['type', 'amount', 'category_id', 'date', 'note'];

    protected function casts(): array
    {
        return ['date' => 'date:Y-m-d'];
    }

    public function toApi(): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'amount' => (float) $this->amount,
            'categoryId' => $this->category_id,
            'date' => $this->date->format('Y-m-d'),
            'note' => $this->note,
            'createdAt' => $this->created_at?->toIso8601String(),
            'updatedAt' => $this->updated_at?->toIso8601String(),
        ];
    }
}
