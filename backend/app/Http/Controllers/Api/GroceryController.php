<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Grocery;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GroceryController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $g = $request->user()->groceries()->create($this->clean($request) + ['done' => false]);

        return response()->json($g->fresh()->toApi());
    }

    // A partial update: name, priority and done can each be sent alone
    public function update(Request $request, string $id): JsonResponse
    {
        $g = $request->user()->groceries()->find($id) ?? abort(404, 'This item no longer exists');
        $changes = $this->clean($request, $g);

        if ($request->has('done') && is_bool($request->input('done')) && $request->boolean('done') !== $g->done) {
            $changes['done'] = $request->boolean('done');
            $changes['done_at'] = $changes['done'] ? now() : null;
        }
        $g->update($changes);

        return response()->json($g->fresh()->toApi());
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        ($request->user()->groceries()->find($id) ?? abort(404, 'This item no longer exists'))->delete();

        return response()->json(['deleted' => $id]);
    }

    private function clean(Request $request, ?Grocery $current = null): array
    {
        $name = mb_substr(trim((string) $request->input('name', $current?->name ?? '')), 0, 100);
        abort_if($name === '', 422, 'Enter a name');
        $priority = $request->input('priority', $current?->priority ?? 'normal');
        abort_unless(in_array($priority, ['high', 'normal', 'low'], true), 422, 'Priority must be high, normal or low');

        return ['name' => $name, 'priority' => $priority];
    }
}
