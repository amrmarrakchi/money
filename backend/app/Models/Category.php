<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['type', 'name', 'color', 'parent_id'])]
class Category extends Model
{
    use HasUuids;

    // The shape the frontend reads
    public function toApi(): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'name' => $this->name,
            'color' => $this->color,
            'parentId' => $this->parent_id,
        ];
    }
}
