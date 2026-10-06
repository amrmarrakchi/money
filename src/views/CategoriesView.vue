<script setup lang="ts">
import type { Category, Kind } from '@/lib/types'
import { CornerDownRight, Pencil, Plus, Trash2 } from '@lucide/vue'
import { computed, ref } from 'vue'
import { toast } from 'vue-sonner'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { addCategory, addSubcategory, editCategory } from '@/lib/dialogs'
import { showError } from '@/lib/errors'
import { money } from '@/lib/format'
import { categoryPath, categoryTree, childrenOf, deleteCategory, familyOf, transactions } from '@/lib/store'

// Per category: its own transactions; a main category also counts those of its subcategories
const own = computed(() => {
  const map = new Map<string, { count: number, total: number }>()
  for (const t of transactions.value) {
    const s = map.get(t.categoryId) ?? { count: 0, total: 0 }
    s.count++
    s.total += t.amount
    map.set(t.categoryId, s)
  }
  return map
})
function stats(c: Category) {
  const ids = c.parentId ? [c.id] : familyOf(c.id)
  return ids.reduce((acc, id) => {
    const s = own.value.get(id)
    return s ? { count: acc.count + s.count, total: acc.total + s.total } : acc
  }, { count: 0, total: 0 })
}

const groups = computed(() => (['expense', 'income'] as Kind[]).map((type) => {
  const rows = categoryTree(type)
  return {
    type,
    title: type === 'expense' ? 'Expense categories' : 'Income categories',
    rows,
    mains: rows.filter(r => !r.depth).length,
    subs: rows.filter(r => r.depth).length,
  }
}))

const toDelete = ref<Category | null>(null)
const confirmOpen = ref(false)
const moveTo = ref('')
const subs = computed(() => toDelete.value ? childrenOf.value.get(toDelete.value.id) ?? [] : [])
const used = computed(() => toDelete.value ? stats(toDelete.value).count : 0)
// Anywhere outside what is deleted, of the same type
const targets = computed(() => {
  if (!toDelete.value) return []
  const gone = familyOf(toDelete.value.id)
  return categoryTree(toDelete.value.type).filter(o => !gone.includes(o.category.id))
})

function askDelete(c: Category) {
  toDelete.value = c
  moveTo.value = ''
  confirmOpen.value = true
}

const deleteText = computed(() => {
  const c = toDelete.value
  if (!c) return ''
  const withSubs = subs.value.length ? ` and its ${subs.value.length} subcategor${subs.value.length > 1 ? 'ies' : 'y'}` : ''
  if (!used.value) return `${c.name}${withSubs} will be deleted. This cannot be undone.`
  return `${c.name}${withSubs} ha${subs.value.length ? 've' : 's'} ${used.value} transaction${used.value > 1 ? 's' : ''}. They will move to the category you choose.`
})

async function confirmDelete() {
  const c = toDelete.value
  if (!c) return
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
  <div class="grid grid-cols-1 gap-6">
    <p class="text-sm text-muted-foreground">
      Group your expenses and incomes, with subcategories when you want more detail.
    </p>

    <div class="grid items-start gap-6 lg:grid-cols-2">
      <Card v-for="group in groups" :key="group.type">
        <CardHeader>
          <CardTitle>{{ group.title }}</CardTitle>
          <CardDescription>
            {{ group.mains }} categor{{ group.mains === 1 ? 'y' : 'ies' }}<template v-if="group.subs">
              · {{ group.subs }} subcategor{{ group.subs === 1 ? 'y' : 'ies' }}
            </template>
          </CardDescription>
          <CardAction>
            <Button size="sm" variant="outline" @click="addCategory(group.type)">
              <Plus /> Category
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent class="px-0">
          <p v-if="!group.rows.length" class="px-6 text-sm text-muted-foreground">
            No category yet.
          </p>
          <ul class="divide-y">
            <li
              v-for="{ category: c, depth } in group.rows"
              :key="c.id"
              class="flex items-center gap-3 py-2.5 pr-4"
              :class="depth ? 'bg-black/10 pl-10' : 'pl-6'"
            >
              <CornerDownRight v-if="depth" class="size-4 shrink-0 text-muted-foreground" />
              <span v-else class="size-3 shrink-0 rounded-full" :style="{ background: c.color }" />
              <div class="min-w-0 flex-1">
                <div class="truncate" :class="depth ? 'text-sm' : ''">
                  {{ c.name }}
                </div>
                <div class="text-xs text-muted-foreground">
                  <template v-if="stats(c).count">
                    {{ stats(c).count }} transaction{{ stats(c).count > 1 ? 's' : '' }} · {{ money(stats(c).total) }}
                  </template>
                  <template v-else>
                    Not used yet
                  </template>
                </div>
              </div>
              <Button v-if="!depth" variant="ghost" size="sm" class="text-muted-foreground" :aria-label="`Add a subcategory to ${c.name}`" @click="addSubcategory(c)">
                <Plus /> <span class="hidden sm:inline">Sub</span>
              </Button>
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
      :description="deleteText"
      :disabled="used > 0 && !moveTo"
      @confirm="confirmDelete"
    >
      <div v-if="used" class="grid gap-2">
        <Label>Move the transactions to</Label>
        <Select v-model="moveTo">
          <SelectTrigger class="w-full">
            <span v-if="moveTo" class="truncate">{{ categoryPath(moveTo) }}</span>
            <span v-else class="text-muted-foreground">Choose a category</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="o in targets" :key="o.category.id" :value="o.category.id" :class="o.depth ? 'pl-7' : ''">
              <span v-if="!o.depth" class="size-2.5 rounded-full" :style="{ background: o.category.color }" />
              <span v-else class="text-muted-foreground">›</span>
              {{ o.category.name }}
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
