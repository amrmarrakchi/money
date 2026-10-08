<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// Two levels: a category, or a subcategory of a category. A subcategory has the type and colour of its parent
class CategoryController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $c = $request->user()->categories()->create($this->clean($request));

        return response()->json($c->fresh()->toApi());
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $category = $this->find($request, $id);
        $next = $this->clean($request, $category);
        $ids = $this->family($request, $id);

        if ($next['type'] !== $category->type) {
            abort_if($this->used($request, $ids), 409, 'This category has transactions: its type cannot change');
            abort_if(count($ids) > 1, 409, 'This category has subcategories: its type cannot change');
        }

        $category->update($next);
        // The subcategories follow the colour of their parent
        $request->user()->categories()->where('parent_id', $id)->update(['color' => $next['color']]);

        return response()->json($category->fresh()->toApi());
    }

    // Its subcategories go with it; their transactions move to another category of the same type
    public function destroy(Request $request, string $id): JsonResponse
    {
        $category = $this->find($request, $id);
        $ids = $this->family($request, $id);
        $used = $this->used($request, $ids);

        if ($used) {
            $target = $request->user()->categories()
                ->where('id', (string) $request->input('moveTo'))
                ->where('type', $category->type)
                ->whereNotIn('id', $ids)
                ->first();
            abort_unless($target, 409, "This category has $used transaction".($used > 1 ? 's' : '').': choose where to move them');
            $request->user()->transactions()->whereIn('category_id', $ids)->update(['category_id' => $target->id]);
        }

        // Subcategories first, then the category
        $request->user()->categories()->where('parent_id', $id)->delete();
        $category->delete();

        return response()->json(['deleted' => $ids]);
    }

    private function find(Request $request, string $id): Category
    {
        return $request->user()->categories()->find($id) ?? abort(404, 'This category no longer exists');
    }

    // A category and its subcategories
    private function family(Request $request, string $id): array
    {
        return [$id, ...$request->user()->categories()->where('parent_id', $id)->pluck('id')->all()];
    }

    private function used(Request $request, array $ids): int
    {
        return $request->user()->transactions()->whereIn('category_id', $ids)->count();
    }

    private function clean(Request $request, ?Category $current = null): array
    {
        $data = $request->validate([
            'type' => ['required', 'in:expense,income'],
            'name' => ['required', 'string'],
            'color' => ['nullable', 'string'],
            'parentId' => ['nullable', 'string'],
        ], [
            'type.*' => 'Type must be expense or income',
            'name.*' => 'Enter a name',
        ]);

        $type = $data['type'];
        $name = mb_substr(trim($data['name']), 0, 40);
        abort_if($name === '', 422, 'Enter a name');
        $color = preg_match('/^#[0-9a-f]{6}$/i', (string) ($data['color'] ?? '')) ? $data['color'] : '#71717a';
        $parentId = $data['parentId'] ?? null;
        $user = $request->user();

        if ($parentId) {
            $parent = $user->categories()->find($parentId);
            abort_if(! $parent || $parent->id === $current?->id, 422, 'Choose another parent category');
            abort_if($parent->parent_id, 422, 'A subcategory cannot have subcategories');
            abort_if($current && $user->categories()->where('parent_id', $current->id)->exists(), 409, 'This category has subcategories: it cannot become a subcategory');
            $type = $parent->type;
            $color = $parent->color;
        }

        $duplicate = $user->categories()
            ->where('type', $type)
            ->where('parent_id', $parentId)
            ->whereRaw('lower(name) = ?', [mb_strtolower($name)])
            ->when($current, fn ($q) => $q->where('id', '!=', $current->id))
            ->exists();
        abort_if($duplicate, 409, 'There is already '.($parentId ? 'a subcategory' : "an $type category")." called $name here");

        return ['type' => $type, 'name' => $name, 'color' => $color, 'parent_id' => $parentId];
    }
}
