<script setup lang="ts">
import type { Transaction } from '@/lib/types'
import { FilterX, Pencil, Plus, Search, Trash2, X } from '@lucide/vue'
import { computed, reactive, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { addTransaction, editTransaction, filtersOpen } from '@/lib/dialogs'
import { showError } from '@/lib/errors'
import { addMonths, isoDate, money, monthKey, shortDate, today } from '@/lib/format'
import { categoryById, categoryPath, categoryTree, deleteTransaction, familyOf, transactions } from '@/lib/store'

type Period = 'all' | 'this-month' | 'last-month' | 'last-3' | 'this-year' | 'custom'

const PERIODS: { value: Period, label: string }[] = [
  { value: 'this-month', label: 'This month' },
  { value: 'last-month', label: 'Last month' },
  { value: 'last-3', label: 'Last 3 months' },
  { value: 'this-year', label: 'This year' },
  { value: 'all', label: 'All time' },
  { value: 'custom', label: 'Custom dates' },
]

const filters = reactive({ search: '', type: 'all', categories: [] as string[], period: 'this-month' as Period, from: '', to: '' })

// Keep the chosen filters while moving between pages
try {
  const saved = JSON.parse(sessionStorage.getItem('money-filters') || '{}')
  Object.assign(filters, { ...saved, categories: Array.isArray(saved.categories) ? saved.categories : [] })
}
catch {}
if (!PERIODS.some(p => p.value === filters.period)) filters.period = 'this-month'
watch(filters, () => { try { sessionStorage.setItem('money-filters', JSON.stringify(filters)) } catch {} })

// Each category followed by its subcategories
const categoryOptions = computed(() => categoryTree(filters.type as 'all'))

// Another type: only its categories stay chosen
watch(() => filters.type, () => {
  filters.categories = filters.categories.filter(id => categoryOptions.value.some(o => o.category.id === id))
})

// Several categories can be chosen: the button says how many
const chosen = computed(() => filters.categories.map(id => categoryById.value.get(id)).filter(c => !!c))
const categoryLabel = computed(() => {
  if (!chosen.value.length) return 'All categories'
  if (chosen.value.length === 1) return categoryPath(chosen.value[0]!.id)
  return `${chosen.value.length} categories`
})
function removeCategory(id: string) {
  filters.categories = filters.categories.filter(c => c !== id)
}

const range = computed<[string, string]>(() => {
  const now = today()
  const month = monthKey(now)
  switch (filters.period) {
    case 'this-month': return [`${month}-01`, `${month}-31`]
    case 'last-month': { const m = addMonths(month, -1); return [`${m}-01`, `${m}-31`] }
    case 'last-3': return [`${addMonths(month, -2)}-01`, `${month}-31`]
    case 'this-year': return [`${now.slice(0, 4)}-01-01`, `${now.slice(0, 4)}-12-31`]
    case 'custom': return [filters.from || '0000-01-01', filters.to || '9999-12-31']
    default: return ['0000-01-01', '9999-12-31']
  }
})

// A chosen category takes its subcategories with it
const chosenIds = computed(() => new Set(filters.categories.flatMap(id => familyOf(id))))

const filtered = computed(() => {
  const q = filters.search.trim().toLowerCase()
  const [from, to] = range.value
  return transactions.value
    .filter(t => t.date >= from && t.date <= to)
    .filter(t => filters.type === 'all' || t.type === filters.type)
    .filter(t => !filters.categories.length || chosenIds.value.has(t.categoryId))
    .filter(t => !q || t.note.toLowerCase().includes(q) || categoryPath(t.categoryId).toLowerCase().includes(q) || String(t.amount).includes(q))
    .sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
})

const totals = computed(() => {
  let income = 0
  let expense = 0
  for (const t of filtered.value) t.type === 'income' ? (income += t.amount) : (expense += t.amount)
  return { income, expense, net: income - expense }
})

const isFiltered = computed(() => filters.search || filters.type !== 'all' || filters.categories.length > 0 || filters.period !== 'this-month')
function resetFilters() {
  Object.assign(filters, { search: '', type: 'all', categories: [], period: 'this-month', from: '', to: '' })
}

// Long lists are shown 50 at a time
const shown = ref(50)
watch(filtered, () => { shown.value = 50 })
const visible = computed(() => filtered.value.slice(0, shown.value))

// Grouped by day on phones
const days = computed(() => {
  const groups: { date: string, items: Transaction[] }[] = []
  for (const t of visible.value) {
    const last = groups[groups.length - 1]
    if (last && last.date === t.date) last.items.push(t)
    else groups.push({ date: t.date, items: [t] })
  }
  return groups
})

const toDelete = ref<Transaction | null>(null)
const confirmOpen = ref(false)
function askDelete(t: Transaction) {
  toDelete.value = t
  confirmOpen.value = true
}
async function confirmDelete() {
  if (!toDelete.value) return
  try {
    await deleteTransaction(toDelete.value.id)
    toast.success('Transaction deleted')
  }
  catch (e) {
    showError(e)
  }
}

const dayLabel = (iso: string) => iso === today() ? 'Today' : iso === isoDate(new Date(Date.now() - 864e5)) ? 'Yesterday' : shortDate(iso)
</script>

<template>
  <div class="grid grid-cols-1 gap-4">

    <!-- Filters -->
    <Card class="py-4" :class="filtersOpen ? '' : 'max-sm:hidden'">
      <CardContent class="grid gap-3 px-4 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,1fr)_auto]">
        <div class="relative">
          <Search class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input v-model="filters.search" placeholder="Search notes, categories, amounts" class="pl-9" aria-label="Search" />
        </div>
        <Select v-model="filters.type">
          <SelectTrigger class="w-full" aria-label="Type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              Expenses and incomes
            </SelectItem>
            <SelectItem value="expense">
              Expenses
            </SelectItem>
            <SelectItem value="income">
              Incomes
            </SelectItem>
          </SelectContent>
        </Select>
        <Select v-model="filters.categories" multiple>
          <SelectTrigger class="w-full" aria-label="Categories">
            <span class="truncate" :class="chosen.length ? '' : 'text-foreground'">{{ categoryLabel }}</span>
          </SelectTrigger>
          <SelectContent>
            <div class="flex items-center justify-between px-2 py-1.5 text-xs text-muted-foreground">
              Choose one or more
              <button v-if="filters.categories.length" type="button" class="text-primary hover:underline" @click="filters.categories = []">
                Clear
              </button>
            </div>
            <SelectItem v-for="o in categoryOptions" :key="o.category.id" :value="o.category.id" :class="o.depth ? 'pl-7' : ''">
              <span v-if="!o.depth" class="size-2.5 rounded-full" :style="{ background: o.category.color }" />
              <span v-else class="text-muted-foreground">›</span>
              {{ o.category.name }}<span v-if="filters.type === 'all' && !o.depth" class="text-muted-foreground">· {{ o.category.type }}</span>
            </SelectItem>
          </SelectContent>
        </Select>
        <Select v-model="filters.period">
          <SelectTrigger class="w-full" aria-label="Period">
            <span class="truncate">{{ PERIODS.find(p => p.value === filters.period)?.label ?? 'This month' }}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="p in PERIODS" :key="p.value" :value="p.value">
              {{ p.label }}
            </SelectItem>
          </SelectContent>
        </Select>
        <Button variant="ghost" :disabled="!isFiltered" @click="resetFilters">
          <FilterX /> Reset
        </Button>
        <div v-if="filters.period === 'custom'" class="grid grid-cols-2 gap-3 sm:col-span-2 lg:col-span-5 lg:max-w-md">
          <div class="grid gap-1.5">
            <Label for="f-from" class="text-xs text-muted-foreground">From</Label>
            <Input id="f-from" v-model="filters.from" type="date" />
          </div>
          <div class="grid gap-1.5">
            <Label for="f-to" class="text-xs text-muted-foreground">To</Label>
            <Input id="f-to" v-model="filters.to" type="date" />
          </div>
        </div>
        <div v-if="chosen.length > 1" class="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-5">
          <span v-for="c in chosen" :key="c!.id" class="inline-flex items-center gap-1.5 rounded-full border bg-muted/50 py-1 pr-1 pl-2.5 text-xs">
            <span class="size-2 rounded-full" :style="{ background: c!.color }" />
            {{ categoryPath(c!.id) }}
            <button type="button" class="grid size-5 place-items-center rounded-full hover:bg-accent" :aria-label="`Remove ${c!.name}`" @click="removeCategory(c!.id)">
              <X class="size-3" />
            </button>
          </span>
        </div>
      </CardContent>
    </Card>

    <!-- Totals of what is shown: three cards, one card with three lines on phones -->
    <Card class="gap-0 py-0 sm:grid sm:grid-cols-3 sm:divide-x">
      <div v-for="t in [
        { label: 'Incomes', value: money(totals.income), tone: 'text-income' },
        { label: 'Expenses', value: money(totals.expense), tone: 'text-expense' },
        { label: 'Net', value: money(totals.net, true), tone: '' },
      ]" :key="t.label" class="flex items-baseline justify-between gap-3 border-b px-4 py-3 last:border-b-0 sm:grid sm:justify-start sm:gap-1 sm:border-b-0 sm:py-4">
        <div class="text-xs text-muted-foreground">
          {{ t.label }}
        </div>
        <div class="text-lg tabular-nums" :class="t.tone">
          {{ t.value }}
        </div>
      </div>
    </Card>

    <Card v-if="!filtered.length" class="py-12">
      <CardContent class="grid justify-items-center gap-3 text-center">
        <p class="text-muted-foreground">
          {{ transactions.length ? 'No transaction matches these filters.' : 'No transaction yet.' }}
        </p>
        <Button v-if="isFiltered && transactions.length" variant="outline" @click="resetFilters">
          Reset the filters
        </Button>
        <Button v-else @click="addTransaction()">
          <Plus /> Add your first transaction
        </Button>
      </CardContent>
    </Card>

    <template v-else>
      <!-- Wide screens: a table -->
      <Card class="hidden py-0 md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead class="w-36 pl-4">
                Date
              </TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Note</TableHead>
              <TableHead class="text-right">
                Amount
              </TableHead>
              <TableHead class="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="t in visible" :key="t.id">
              <TableCell class="pl-4 text-muted-foreground">
                {{ shortDate(t.date) }}
              </TableCell>
              <TableCell>
                <span class="inline-flex items-center gap-2">
                  <span class="size-2.5 rounded-full" :style="{ background: categoryById.get(t.categoryId)?.color }" />
                  {{ categoryPath(t.categoryId) }}
                </span>
              </TableCell>
              <TableCell class="max-w-72 truncate text-muted-foreground">
                {{ t.note }}
              </TableCell>
              <TableCell class="text-right tabular-nums" :class="t.type === 'income' ? 'text-income' : ''">
                {{ money(t.type === 'income' ? t.amount : -t.amount, true) }}
              </TableCell>
              <TableCell class="pr-3 text-right">
                <Button variant="ghost" size="icon-sm" aria-label="Edit" @click="editTransaction(t)">
                  <Pencil />
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label="Delete" @click="askDelete(t)">
                  <Trash2 />
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Card>

      <!-- Phones: by day -->
      <div class="grid grid-cols-1 gap-4 md:hidden">
        <div v-for="day in days" :key="day.date">
          <div class="mb-2 px-1 text-xs text-muted-foreground">
            {{ dayLabel(day.date) }}
          </div>
          <Card class="gap-0 divide-y py-0">
            <div v-for="t in day.items" :key="t.id" class="flex items-center gap-3 px-4 py-3">
              <span class="size-2.5 shrink-0 rounded-full" :style="{ background: categoryById.get(t.categoryId)?.color }" />
              <button class="min-w-0 flex-1 text-left" @click="editTransaction(t)">
                <div class="truncate">{{ categoryPath(t.categoryId) }}</div>
                <div v-if="t.note" class="truncate text-xs text-muted-foreground">{{ t.note }}</div>
              </button>
              <div class="tabular-nums whitespace-nowrap" :class="t.type === 'income' ? 'text-income' : ''">
                {{ money(t.type === 'income' ? t.amount : -t.amount, true) }}
              </div>
              <Button variant="ghost" size="icon-sm" aria-label="Delete" @click="askDelete(t)">
                <Trash2 />
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <div v-if="filtered.length > shown" class="text-center">
        <Button variant="outline" @click="shown += 50">
          Show more ({{ filtered.length - shown }} left)
        </Button>
      </div>
    </template>

    <ConfirmDialog
      v-model:open="confirmOpen"
      title="Delete this transaction?"
      :description="toDelete ? `${categoryPath(toDelete.categoryId)}, ${money(toDelete.amount)} on ${shortDate(toDelete.date)}. This cannot be undone.` : ''"
      @confirm="confirmDelete"
    />
  </div>
</template>
