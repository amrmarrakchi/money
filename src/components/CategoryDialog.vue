<script setup lang="ts">
import type { Kind } from '@/lib/types'
import { Check } from '@lucide/vue'
import { computed, reactive, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { categoryDialog as dialog } from '@/lib/dialogs'
import { showError } from '@/lib/errors'
import { saveCategory, transactions } from '@/lib/store'

// Colours to tell categories apart in the lists
const COLORS = ['#16a34a', '#2a78d6', '#4a3aa7', '#eb6834', '#e87ba4', '#e34948', '#eda100', '#1baf7a', '#0891b2', '#a16207', '#71717a']

const form = reactive({ type: 'expense' as Kind, name: '', color: COLORS[0] })
const saving = ref(false)
const error = ref('')
const used = computed(() => dialog.editing ? transactions.value.filter(t => t.categoryId === dialog.editing!.id).length : 0)

watch(() => dialog.open, (open) => {
  if (!open) return
  const c = dialog.editing
  error.value = ''
  Object.assign(form, c ? { type: c.type, name: c.name, color: c.color } : { type: dialog.type, name: '', color: COLORS[0] })
})

async function submit() {
  if (!form.name.trim()) return (error.value = 'Enter a name')
  saving.value = true
  try {
    await saveCategory({ ...form, name: form.name.trim() }, dialog.editing?.id)
    toast.success(dialog.editing ? 'Category updated' : 'Category added')
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
        <DialogTitle>{{ dialog.editing ? 'Edit category' : 'New category' }}</DialogTitle>
        <DialogDescription>Categories group your expenses and incomes in the lists and charts.</DialogDescription>
      </DialogHeader>

      <form id="category-form" class="grid gap-4" @submit.prevent="submit">
        <Tabs v-model="form.type">
          <TabsList class="grid w-full grid-cols-2">
            <TabsTrigger value="expense" :disabled="used > 0">
              Expense
            </TabsTrigger>
            <TabsTrigger value="income" :disabled="used > 0">
              Income
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <p v-if="used" class="-mt-2 text-xs text-muted-foreground">
          It has {{ used }} transaction{{ used > 1 ? 's' : '' }}, so its type stays the same.
        </p>

        <div class="grid gap-2">
          <Label for="c-name">Name</Label>
          <Input id="c-name" v-model="form.name" maxlength="40" placeholder="Groceries, Salary…" autocomplete="off" />
        </div>

        <div class="grid gap-2">
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
