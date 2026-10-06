<script setup lang="ts">
import type { Category, Kind } from '@/lib/types'
import { Pencil, Plus, Trash2 } from '@lucide/vue'
import { computed, ref } from 'vue'
import { toast } from 'vue-sonner'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { addCategory, editCategory } from '@/lib/dialogs'
import { showError } from '@/lib/errors'
import { money } from '@/lib/format'
import { categories, deleteCategory, transactions } from '@/lib/store'

const stats = computed(() => {
  const map = new Map<string, { count: number, total: number }>()
  for (const t of transactions.value) {
    const s = map.get(t.categoryId) ?? { count: 0, total: 0 }
    s.count++
    s.total += t.amount
    map.set(t.categoryId, s)
  }
  return map
})

const groups = computed(() => (['expense', 'income'] as Kind[]).map(type => ({
  type,
  title: type === 'expense' ? 'Expense categories' : 'Income categories',
  items: categories.value.filter(c => c.type === type).sort((a, b) => a.name.localeCompare(b.name)),
})))

const toDelete = ref<Category | null>(null)
const confirmOpen = ref(false)
const moveTo = ref('')
const used = computed(() => toDelete.value ? stats.value.get(toDelete.value.id)?.count ?? 0 : 0)
const targets = computed(() => categories.value.filter(c => toDelete.value && c.type === toDelete.value.type && c.id !== toDelete.value.id))

function askDelete(c: Category) {
  toDelete.value = c
  moveTo.value = ''
  confirmOpen.value = true
}

async function confirmDelete() {
  const c = toDelete.value
  if (!c) return
  if (used.value && !moveTo.value) {
    toast.error('Choose where to move its transactions')
    return
  }
  try {
    await deleteCategory(c.id, used.value ? moveTo.value : undefined)
    toast.success(`${c.name} deleted`)
  }
  catch (e) {
    showError(e)
  }
}
</script>

<template>
  <div class="grid gap-6">
    <div>
      <h1 class="text-2xl tracking-tight">
        Categories
      </h1>
      <p class="text-sm text-muted-foreground">
        Group your expenses and incomes.
      </p>
    </div>

    <div class="grid gap-6 lg:grid-cols-2">
      <Card v-for="group in groups" :key="group.type">
        <CardHeader>
          <CardTitle>{{ group.title }}</CardTitle>
          <CardDescription>{{ group.items.length }} categor{{ group.items.length === 1 ? 'y' : 'ies' }}</CardDescription>
          <CardAction>
            <Button size="sm" variant="outline" @click="addCategory(group.type)">
              <Plus /> Add
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent class="px-0">
          <p v-if="!group.items.length" class="px-6 text-sm text-muted-foreground">
            No category yet.
          </p>
          <ul class="divide-y">
            <li v-for="c in group.items" :key="c.id" class="flex items-center gap-3 px-6 py-3">
              <span class="size-3 shrink-0 rounded-full" :style="{ background: c.color }" />
              <div class="min-w-0 flex-1">
                <div class="truncate">
                  {{ c.name }}
                </div>
                <div class="text-xs text-muted-foreground">
                  <template v-if="stats.get(c.id)">
                    {{ stats.get(c.id)!.count }} transaction{{ stats.get(c.id)!.count > 1 ? 's' : '' }} · {{ money(stats.get(c.id)!.total) }}
                  </template>
                  <template v-else>
                    Not used yet
                  </template>
                </div>
              </div>
              <Button variant="ghost" size="icon-sm" aria-label="Edit" @click="editCategory(c)">
                <Pencil />
              </Button>
              <Button variant="ghost" size="icon-sm" aria-label="Delete" @click="askDelete(c)">
                <Trash2 />
              </Button>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>

    <ConfirmDialog
      v-model:open="confirmOpen"
      :title="`Delete ${toDelete?.name ?? ''}?`"
      :description="used
        ? `It has ${used} transaction${used > 1 ? 's' : ''}. They will move to the category you choose.`
        : 'It has no transactions. This cannot be undone.'"
      :disabled="used > 0 && !moveTo"
      @confirm="confirmDelete"
    >
      <div v-if="used" class="grid gap-2">
        <Label>Move its transactions to</Label>
        <Select v-model="moveTo">
          <SelectTrigger class="w-full">
            <SelectValue placeholder="Choose a category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="c in targets" :key="c.id" :value="c.id">
              <span class="size-2.5 rounded-full" :style="{ background: c.color }" />
              {{ c.name }}
            </SelectItem>
          </SelectContent>
        </Select>
        <p v-if="!targets.length" class="text-xs text-destructive">
          Add another {{ toDelete?.type }} category first.
        </p>
      </div>
    </ConfirmDialog>
  </div>
</template>
