<script setup lang="ts">
import type { Kind } from '@/lib/types'
import { computed, reactive, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { transactionDialog as dialog } from '@/lib/dialogs'
import { showError } from '@/lib/errors'
import { today } from '@/lib/format'
import { categoryPath, categoryTree, currency, saveTransaction } from '@/lib/store'

const form = reactive({ type: 'expense' as Kind, amount: '', categoryId: '', date: today(), note: '' })
const saving = ref(false)
const error = ref('')

// Each category followed by its subcategories: a transaction can go on either
const options = computed(() => categoryTree(form.type))

// Filled each time the modal opens
watch(() => dialog.open, (open) => {
  if (!open) return
  const t = dialog.editing
  error.value = ''
  Object.assign(form, t
    ? { type: t.type, amount: String(t.amount), categoryId: t.categoryId, date: t.date, note: t.note }
    : { type: dialog.type, amount: '', categoryId: '', date: today(), note: '' })
})

// Another type: the category must change too
watch(() => form.type, () => {
  if (!options.value.some(o => o.category.id === form.categoryId)) form.categoryId = ''
})

async function submit() {
  const amount = Number(String(form.amount).replace(',', '.'))
  if (!(amount > 0)) return (error.value = 'Enter an amount more than 0')
  if (!form.categoryId) return (error.value = 'Choose a category')
  if (!form.date) return (error.value = 'Choose a date')
  saving.value = true
  try {
    await saveTransaction({ type: form.type, amount, categoryId: form.categoryId, date: form.date, note: form.note }, dialog.editing?.id)
    toast.success(dialog.editing ? 'Transaction updated' : `${form.type === 'expense' ? 'Expense' : 'Income'} added`)
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
        <DialogTitle>{{ dialog.editing ? 'Edit transaction' : 'New transaction' }}</DialogTitle>
        <DialogDescription>
          {{ dialog.editing ? 'Change any field, then save.' : 'An expense or an income, with its category.' }}
        </DialogDescription>
      </DialogHeader>

      <form id="transaction-form" class="grid gap-4" @submit.prevent="submit">
        <Tabs v-model="form.type">
          <TabsList class="grid w-full grid-cols-2">
            <TabsTrigger value="expense">
              Expense
            </TabsTrigger>
            <TabsTrigger value="income">
              Income
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div class="grid gap-2">
          <Label for="t-amount">Amount ({{ currency }})</Label>
          <Input id="t-amount" v-model="form.amount" inputmode="decimal" placeholder="0.00" autocomplete="off" class="h-12 text-2xl" />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="grid gap-2">
            <Label>Category</Label>
            <Select v-model="form.categoryId">
              <SelectTrigger class="w-full">
                <span v-if="form.categoryId" class="truncate">{{ categoryPath(form.categoryId) }}</span>
                <span v-else class="text-muted-foreground">Choose</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="o in options" :key="o.category.id" :value="o.category.id" :class="o.depth ? 'pl-7' : ''">
                  <span v-if="!o.depth" class="size-2.5 rounded-full" :style="{ background: o.category.color }" />
                  <span v-else class="text-muted-foreground">›</span>
                  {{ o.category.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="grid gap-2">
            <Label for="t-date">Date</Label>
            <Input id="t-date" v-model="form.date" type="date" />
          </div>
        </div>

        <div class="grid gap-2">
          <Label for="t-note">Note <span class="text-muted-foreground">(optional)</span></Label>
          <Textarea id="t-note" v-model="form.note" rows="2" placeholder="What was it for?" />
        </div>

        <p v-if="error" class="text-sm text-destructive">
          {{ error }}
        </p>
      </form>

      <DialogFooter>
        <Button variant="outline" @click="dialog.open = false">
          Cancel
        </Button>
        <Button type="submit" form="transaction-form" :disabled="saving">
          {{ dialog.editing ? 'Save changes' : 'Add' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
