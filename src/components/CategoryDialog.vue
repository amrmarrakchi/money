<script setup lang="ts">
import type { Kind } from '@/lib/types'
import { Check } from '@lucide/vue'
import { computed, reactive, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { categoryDialog as dialog } from '@/lib/dialogs'
import { showError } from '@/lib/errors'
import { categories, categoryById, childrenOf, familyOf, saveCategory, transactions } from '@/lib/store'

// Colours to tell categories apart in the lists
const COLORS = ['#16a34a', '#2a78d6', '#4a3aa7', '#eb6834', '#e87ba4', '#e34948', '#eda100', '#1baf7a', '#0891b2', '#a16207', '#71717a']

const form = reactive({ type: 'expense' as Kind, name: '', color: COLORS[0], parent: 'none' })
const saving = ref(false)
const error = ref('')
// Transactions of the category and of its subcategories: its type stays the same then
const used = computed(() => {
  if (!dialog.editing) return 0
  const ids = familyOf(dialog.editing.id)
  return transactions.value.filter(t => ids.includes(t.categoryId)).length
})
const hasChildren = computed(() => !!dialog.editing && (childrenOf.value.get(dialog.editing.id)?.length ?? 0) > 0)
const parent = computed(() => form.parent === 'none' ? null : categoryById.value.get(form.parent) ?? null)

// A subcategory belongs to a main category of the same type ( or of any type, while nothing ties it )
const parents = computed(() => categories.value
  .filter(c => !c.parentId && c.id !== dialog.editing?.id && (used.value ? c.type === form.type : true))
  .sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name)))

watch(() => dialog.open, (open) => {
  if (!open) return
  const c = dialog.editing
  error.value = ''
  Object.assign(form, c
    ? { type: c.type, name: c.name, color: c.color, parent: c.parentId || 'none' }
    : { type: dialog.type, name: '', color: dialog.parentId ? categoryById.value.get(dialog.parentId)?.color ?? COLORS[0] : COLORS[0], parent: dialog.parentId || 'none' })
})

async function submit() {
  if (!form.name.trim()) return (error.value = 'Enter a name')
  saving.value = true
  try {
    const p = parent.value
    await saveCategory({ type: p ? p.type : form.type, name: form.name.trim(), color: p ? p.color : form.color, parentId: p ? p.id : null }, dialog.editing?.id)
    toast.success(dialog.editing ? 'Category updated' : parent.value ? 'Subcategory added' : 'Category added')
    dialog.open = false
  }
  catch (e) {
    showError(e)
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <Dialog v-model:open="dialog.open">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{{ dialog.editing ? (dialog.editing.parentId ? 'Edit subcategory' : 'Edit category') : (dialog.parentId ? 'New subcategory' : 'New category') }}</DialogTitle>
        <DialogDescription>
          {{ parent ? `A subcategory of ${parent.name}: it has its type and colour.` : 'Categories group your expenses and incomes in the lists and charts.' }}
        </DialogDescription>
      </DialogHeader>

      <form id="category-form" class="grid gap-4" @submit.prevent="submit">
        <div class="grid gap-2">
          <Label>Belongs to</Label>
          <Select v-model="form.parent" :disabled="hasChildren">
            <SelectTrigger class="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                None: a main category
              </SelectItem>
              <SelectItem v-for="c in parents" :key="c.id" :value="c.id">
                <span class="size-2.5 rounded-full" :style="{ background: c.color }" />
                {{ c.name }} <span class="text-muted-foreground">· {{ c.type }}</span>
              </SelectItem>
            </SelectContent>
          </Select>
          <p v-if="hasChildren" class="text-xs text-muted-foreground">
            It has subcategories, so it stays a main category.
          </p>
        </div>

        <Tabs v-if="!parent" v-model="form.type">
          <TabsList class="grid w-full grid-cols-2">
            <TabsTrigger value="expense" :disabled="used > 0 || hasChildren">
              Expense
            </TabsTrigger>
            <TabsTrigger value="income" :disabled="used > 0 || hasChildren">
              Income
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <p v-if="(used || hasChildren) && !parent" class="-mt-2 text-xs text-muted-foreground">
          {{ used ? `It has ${used} transaction${used > 1 ? 's' : ''}` : 'It has subcategories' }}, so its type stays the same.
        </p>

        <div class="grid gap-2">
          <Label for="c-name">Name</Label>
          <Input id="c-name" v-model="form.name" maxlength="40" :placeholder="parent ? 'Fuel, Taxi…' : 'Groceries, Salary…'" autocomplete="off" />
        </div>

        <div v-if="!parent" class="grid gap-2">
          <Label>Colour</Label>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="color in COLORS"
              :key="color"
              type="button"
              class="grid size-8 place-items-center rounded-full ring-offset-2 ring-offset-background transition"
              :class="form.color === color ? 'ring-2 ring-ring' : ''"
              :style="{ background: color }"
              :aria-label="`Colour ${color}`"
              :aria-pressed="form.color === color"
              @click="form.color = color"
            >
              <Check v-if="form.color === color" class="size-4 text-white" />
            </button>
          </div>
        </div>

        <p v-if="error" class="text-sm text-destructive">
          {{ error }}
        </p>
      </form>

      <DialogFooter>
        <Button variant="outline" @click="dialog.open = false">
          Cancel
        </Button>
        <Button type="submit" form="category-form" :disabled="saving">
          {{ dialog.editing ? 'Save changes' : 'Add' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
