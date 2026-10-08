<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TransactionController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $t = $request->user()->transactions()->create($this->clean($request));

        return response()->json($t->fresh()->toApi());
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $t = $this->find($request, $id);
        $t->update($this->clean($request));

        return response()->json($t->fresh()->toApi());
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $this->find($request, $id)->delete();

        return response()->json(['deleted' => $id]);
    }

    private function find(Request $request, string $id): Transaction
    {
        return $request->user()->transactions()->find($id) ?? abort(404, 'This transaction no longer exists');
    }

    private function clean(Request $request): array
    {
        $data = $request->validate([
            'type' => ['required', 'in:expense,income'],
            'amount' => ['required', 'numeric', 'gt:0'],
            'categoryId' => ['required', 'string'],
            'date' => ['required', 'date_format:Y-m-d'],
            'note' => ['nullable', 'string'],
        ], [
            'type.*' => 'Type must be expense or income',
            'amount.*' => 'The amount must be more than 0',
            'categoryId.*' => 'Choose a category',
            'date.*' => 'Choose a date',
        ]);

        $category = $request->user()->categories()->find($data['categoryId']);
        abort_unless($category && $category->type === $data['type'], 422, 'Choose a category');

        return [
            'type' => $data['type'],
            'amount' => round((float) $data['amount'], 2),
            'category_id' => $category->id,
            'date' => $data['date'],
            'note' => mb_substr(trim((string) ($data['note'] ?? '')), 0, 200),
        ];
    }
}
