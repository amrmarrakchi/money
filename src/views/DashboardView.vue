<script setup lang="ts">
import type { Kind } from '@/lib/types'
import { ArrowDownRight, ArrowRight, ArrowUpRight, ChevronDown, ChevronLeft, ChevronRight, Plus } from '@lucide/vue'
import { computed, ref } from 'vue'
import { Bar, Line } from 'vue-chartjs'
import ChartCard from '@/components/ChartCard.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { baseOptions, colors } from '@/lib/charts'
import { addTransaction, editTransaction } from '@/lib/dialogs'
import { addMonths, money, monthKey, monthLabel, shortDate, today } from '@/lib/format'
import { categoryById, categoryPath, currency, topCategoryId, transactions } from '@/lib/store'
import { dark } from '@/lib/theme'

const thisMonth = monthKey(today())
const month = ref(thisMonth)
const previous = computed(() => addMonths(month.value, -1))

// Totals per month: { '2026-10': { income, expense } }
const perMonth = computed(() => {
  const map = new Map<string, Record<Kind, number>>()
  for (const t of transactions.value) {
    const key = monthKey(t.date)
    const m = map.get(key) ?? { income: 0, expense: 0 }
    m[t.type] += t.amount
    map.set(key, m)
  }
  return map
})
const totals = (key: string) => perMonth.value.get(key) ?? { income: 0, expense: 0 }

const kpis = computed(() => {
  const now = totals(month.value)
  const before = totals(previous.value)
  const rate = (m: Record<Kind, number>) => m.income > 0 ? (m.income - m.expense) / m.income : null
  return [
    { label: 'Income', value: money(now.income), now: now.income, before: before.income, goodWhenUp: true, tone: 'text-income' },
    { label: 'Expenses', value: money(now.expense), now: now.expense, before: before.expense, goodWhenUp: false, tone: 'text-expense' },
    { label: 'Net', value: money(now.income - now.expense, true), now: now.income - now.expense, before: before.income - before.expense, goodWhenUp: true, tone: '' },
    {
      label: 'Savings rate',
      value: rate(now) === null ? '—' : `${Math.round(rate(now)! * 100)} %`,
      now: rate(now) ?? 0,
      before: rate(before) ?? 0,
      goodWhenUp: true,
      tone: '',
      percent: true,
      hint: 'Share of the income kept',
    },
  ]
})

// The change since last month, in words: never colour alone
function change(k: { now: number, before: number, percent?: boolean }) {
  const diff = k.now - k.before
  if (Math.abs(diff) < 0.005) return { text: 'Same as last month', dir: 0 }
  const amount = k.percent ? `${Math.abs(Math.round(diff * 100))} pts` : money(Math.abs(diff))
  return { text: `${amount} ${diff > 0 ? 'more' : 'less'} than last month`, dir: diff > 0 ? 1 : -1 }
}

// ---------------------------------------------------------------- 12 months: income and expenses
const months = computed(() => Array.from({ length: 12 }, (_, i) => addMonths(month.value, i - 11)))

const monthlyChart = computed(() => {
  void dark.value
  const c = colors()
  const bar = { borderRadius: 4, borderSkipped: 'start' as const, barPercentage: 0.82, categoryPercentage: 0.7, maxBarThickness: 18 }
  return {
    data: {
      labels: months.value.map(m => monthLabel(m, false)),
      datasets: [
        { label: 'Income', data: months.value.map(m => totals(m).income), backgroundColor: c.income, ...bar },
        { label: 'Expenses', data: months.value.map(m => totals(m).expense), backgroundColor: c.expense, ...bar },
      ],
    },
    options: {
      ...baseOptions(c),
      plugins: {
        ...baseOptions(c).plugins,
        tooltip: { ...baseOptions(c).plugins.tooltip, callbacks: { label: (ctx: any) => ` ${ctx.dataset.label}: ${money(ctx.raw)}` } },
      },
    },
  }
})

// ---------------------------------------------------------------- expenses by category, this month
// Each main category with its subcategories added in; the split by subcategory opens under it
interface Part { id: string, name: string, amount: number, share: number }
interface Row extends Part { color: string, parts: Part[] }

const byCategory = computed(() => {
  const tops = new Map<string, Map<string, number>>()
  for (const t of transactions.value) {
    if (t.type !== 'expense' || monthKey(t.date) !== month.value) continue
    const top = topCategoryId(t.categoryId)
    const parts = tops.get(top) ?? new Map<string, number>()
    parts.set(t.categoryId, (parts.get(t.categoryId) ?? 0) + t.amount)
    tops.set(top, parts)
  }
  let total = 0
  for (const parts of tops.values()) for (const v of parts.values()) total += v
  const rows: Row[] = [...tops.entries()].map(([id, parts]) => {
    const amount = [...parts.values()].reduce((x, y) => x + y, 0)
    const category = categoryById.value.get(id)
    const hasSubs = [...parts.keys()].some(k => k !== id)
    return {
      id,
      name: category?.name ?? '—',
      color: category?.color ?? '#71717a',
      amount,
      share: total ? amount / total : 0,
      // Spent on the category itself, next to its subcategories: "Transport ( other )"
      parts: hasSubs
        ? [...parts.entries()]
            .map(([pid, v]) => ({ id: pid, name: pid === id ? `${category?.name ?? '—'} ( other )` : categoryById.value.get(pid)?.name ?? '—', amount: v, share: amount ? v / amount : 0 }))
            .sort((x, y) => y.amount - x.amount)
        : [],
    }
  }).sort((x, y) => y.amount - x.amount)
  // Seven categories at most, the rest together
  const top = rows.slice(0, 7)
  const rest = rows.slice(7)
  if (rest.length) {
    const amount = rest.reduce((x, r) => x + r.amount, 0)
    top.push({ id: 'other', name: `${rest.length} other categories`, color: '#71717a', amount, share: total ? amount / total : 0, parts: [] })
  }
  return { total, rows: top }
})
const open = ref(new Set<string>())
function toggle(id: string) {
  const next = new Set(open.value)
  next.has(id) ? next.delete(id) : next.add(id)
  open.value = next
}
const biggest = computed(() => byCategory.value.rows[0]?.amount ?? 0)

// ---------------------------------------------------------------- spending pace: this month against last month
const pace = computed(() => {
  void dark.value
  const c = colors()
  const cumulative = (key: string, upTo: number) => {
    const daily = Array.from({ length: 31 }, () => 0)
    for (const t of transactions.value)
      if (t.type === 'expense' && monthKey(t.date) === key) daily[Number(t.date.slice(8)) - 1] += t.amount
    let sum = 0
    return daily.map((v, i) => (i < upTo ? (sum += v) : null))
  }
  const [y, m] = month.value.split('-').map(Number)
  const days = new Date(y, m, 0).getDate()
  const [py, pm] = previous.value.split('-').map(Number)
  const prevDays = new Date(py, pm, 0).getDate()
  const upTo = month.value === thisMonth ? Number(today().slice(8)) : days
  const current = cumulative(month.value, upTo).slice(0, days)
  const before = cumulative(previous.value, prevDays).slice(0, days)
  const line = { borderWidth: 2, pointRadius: 0, pointHoverRadius: 4, tension: 0.25 }
  return {
    rows: Array.from({ length: days }, (_, i) => ({ day: i + 1, now: current[i], before: before[i] })),
    data: {
      labels: Array.from({ length: days }, (_, i) => String(i + 1)),
      datasets: [
        { label: monthLabel(month.value), data: current, borderColor: c.expense, backgroundColor: c.expense, ...line },
        { label: monthLabel(previous.value), data: before, borderColor: c.text, backgroundColor: c.text, borderDash: [4, 4], ...line, borderWidth: 1.5 },
      ],
    },
    options: {
      ...baseOptions(c),
      plugins: {
        ...baseOptions(c).plugins,
        tooltip: {
          ...baseOptions(c).plugins.tooltip,
          callbacks: { title: (items: any[]) => `Day ${items[0]?.label}`, label: (ctx: any) => ` ${ctx.dataset.label}: ${money(ctx.raw)}` },
        },
      },
    },
  }
})

// ---------------------------------------------------------------- savings: everything kept so far, month after month
const savings = computed(() => {
  void dark.value
  const c = colors()
  const first = months.value[0]
  let balance = 0
  for (const [key, m] of perMonth.value) if (key < first) balance += m.income - m.expense
  const values = months.value.map((key) => {
    const m = totals(key)
    balance += m.income - m.expense
    return Math.round(balance * 100) / 100
  })
  return {
    rows: months.value.map((key, i) => ({ key, value: values[i] })),
    data: {
      labels: months.value.map(m => monthLabel(m, false)),
      datasets: [{
        label: 'Saved',
        data: values,
        borderColor: c.income,
        backgroundColor: `${c.income}22`,
        fill: 'origin',
        borderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: c.income,
        pointBorderColor: c.surface,
        pointBorderWidth: 2,
        tension: 0.25,
      }],
    },
    options: {
      ...baseOptions(c),
      plugins: {
        ...baseOptions(c).plugins,
        legend: { display: false },
        tooltip: { ...baseOptions(c).plugins.tooltip, callbacks: { label: (ctx: any) => ` Saved: ${money(ctx.raw)}` } },
      },
      scales: { ...baseOptions(c).scales, y: { ...baseOptions(c).scales.y, beginAtZero: false } },
    },
  }
})

const latest = computed(() => [...transactions.value]
  .sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
  .slice(0, 6))

const hasData = computed(() => transactions.value.length > 0)
</script>

<template>
  <div class="grid grid-cols-1 gap-6">
    <div class="flex flex-wrap items-center justify-end gap-3">
      <div class="glass-recessed flex items-center gap-1 rounded-full p-1">
        <Button variant="ghost" size="icon-sm" aria-label="Previous month" @click="month = addMonths(month, -1)">
          <ChevronLeft />
        </Button>
        <span class="min-w-32 text-center text-sm">{{ monthLabel(month) }}</span>
        <Button variant="ghost" size="icon-sm" aria-label="Next month" :disabled="month >= thisMonth" @click="month = addMonths(month, 1)">
          <ChevronRight />
        </Button>
      </div>
    </div>

    <Card v-if="!hasData" class="py-12">
      <CardContent class="grid justify-items-center gap-3 text-center">
        <p class="text-lg">
          Nothing here yet
        </p>
        <p class="max-w-sm text-sm text-muted-foreground">
          Add your first expense or income: the dashboard fills in as you go.
        </p>
        <div class="flex gap-2">
          <Button @click="addTransaction('expense')">
            <Plus /> Expense
          </Button>
          <Button variant="outline" @click="addTransaction('income')">
            <Plus /> Income
          </Button>
        </div>
      </CardContent>
    </Card>

    <template v-else>
      <!-- The month in four figures -->
      <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card v-for="k in kpis" :key="k.label" class="min-w-0 gap-2 py-4">
          <CardContent class="grid min-w-0 gap-1 px-4">
            <div class="text-xs text-muted-foreground" :title="k.hint">
              {{ k.label }}
            </div>
            <div class="flex min-w-0 items-baseline gap-1" :class="k.tone">
              <span class="truncate text-xl sm:text-2xl">{{ k.percent ? k.value : k.value.replace(` ${currency}`, '') }}</span>
              <span v-if="!k.percent" class="text-xs text-muted-foreground">{{ currency }}</span>
            </div>
            <div class="flex items-start gap-1 text-xs text-muted-foreground">
              <ArrowUpRight v-if="change(k).dir > 0" class="mt-px size-3.5 shrink-0" />
              <ArrowDownRight v-else-if="change(k).dir < 0" class="mt-px size-3.5 shrink-0" />
              <ArrowRight v-else class="mt-px size-3.5 shrink-0" />
              <span class="min-w-0">{{ change(k).text }}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div class="grid gap-6 lg:grid-cols-5">
        <ChartCard class="lg:col-span-3" title="Income and expenses" description="The last 12 months" table>
          <div class="h-64">
            <Bar :key="`m${dark}`" :data="monthlyChart.data" :options="monthlyChart.options" aria-label="Bar chart of income and expenses per month" />
          </div>
          <template #table>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead class="text-right">
                    Income
                  </TableHead>
                  <TableHead class="text-right">
                    Expenses
                  </TableHead>
                  <TableHead class="text-right">
                    Net
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="m in [...months].reverse()" :key="m">
                  <TableCell>{{ monthLabel(m) }}</TableCell>
                  <TableCell class="text-right tabular-nums">
                    {{ money(totals(m).income) }}
                  </TableCell>
                  <TableCell class="text-right tabular-nums">
                    {{ money(totals(m).expense) }}
                  </TableCell>
                  <TableCell class="text-right tabular-nums">
                    {{ money(totals(m).income - totals(m).expense, true) }}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </template>
        </ChartCard>

        <!-- A ranked list with its bars: the names and amounts stay readable on a phone -->
        <ChartCard class="lg:col-span-2" title="Where the money went" :description="`Expenses by category in ${monthLabel(month)}${byCategory.rows.some(r => r.parts.length) ? ', open one for its subcategories' : ''}`">
          <p v-if="!byCategory.rows.length" class="py-8 text-center text-sm text-muted-foreground">
            No expense this month.
          </p>
          <ul v-else class="grid gap-3">
            <li v-for="r in byCategory.rows" :key="r.id" class="grid gap-1.5">
              <component
                :is="r.parts.length ? 'button' : 'div'"
                class="grid gap-1.5 text-left"
                :class="r.parts.length ? '-mx-2 rounded-md px-2 py-1 hover:bg-accent' : ''"
                :aria-expanded="r.parts.length ? open.has(r.id) : undefined"
                @click="r.parts.length && toggle(r.id)"
              >
                <div class="flex items-baseline justify-between gap-3 text-sm">
                  <span class="flex min-w-0 items-center gap-2">
                    <span class="size-2.5 shrink-0 rounded-full" :style="{ background: r.color }" />
                    <span class="truncate">{{ r.name }}</span>
                    <ChevronDown v-if="r.parts.length" class="size-3.5 shrink-0 text-muted-foreground transition-transform" :class="open.has(r.id) ? 'rotate-180' : ''" />
                  </span>
                  <span class="shrink-0 tabular-nums">{{ money(r.amount) }} <span class="text-muted-foreground">· {{ Math.round(r.share * 100) }} %</span></span>
                </div>
                <div class="glass-recessed h-1.5 overflow-hidden rounded-full">
                  <div class="h-full rounded-full bg-expense" :style="{ width: `${biggest ? (r.amount / biggest) * 100 : 0}%` }" />
                </div>
              </component>
              <!-- Its subcategories: share of the category -->
              <ul v-if="open.has(r.id)" class="grid gap-1.5 border-l pl-4">
                <li v-for="p in r.parts" :key="p.id" class="flex items-baseline justify-between gap-3 text-xs">
                  <span class="truncate text-muted-foreground">{{ p.name }}</span>
                  <span class="shrink-0 tabular-nums">{{ money(p.amount) }} <span class="text-muted-foreground">· {{ Math.round(p.share * 100) }} %</span></span>
                </li>
              </ul>
            </li>
          </ul>
        </ChartCard>

        <ChartCard class="lg:col-span-3" title="Spending pace" :description="`Total spent day after day, ${monthLabel(month)} against ${monthLabel(previous)}`" table>
          <div class="h-64">
            <Line :key="`p${dark}`" :data="pace.data" :options="pace.options" aria-label="Line chart of the money spent so far, day by day" />
          </div>
          <template #table>
            <div class="max-h-64 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Day</TableHead>
                    <TableHead class="text-right">
                      {{ monthLabel(month, false) }}
                    </TableHead>
                    <TableHead class="text-right">
                      {{ monthLabel(previous, false) }}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow v-for="r in pace.rows" :key="r.day">
                    <TableCell>{{ r.day }}</TableCell>
                    <TableCell class="text-right tabular-nums">
                      {{ r.now === null ? '—' : money(r.now) }}
                    </TableCell>
                    <TableCell class="text-right tabular-nums">
                      {{ r.before === null ? '—' : money(r.before) }}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </template>
        </ChartCard>

        <ChartCard class="lg:col-span-2" title="Savings over time" description="Everything kept, income minus expenses" table>
          <div class="h-64">
            <Line :key="`s${dark}`" :data="savings.data" :options="savings.options" aria-label="Line chart of the savings at the end of each month" />
          </div>
          <template #table>
            <Table>
              <TableBody>
                <TableRow v-for="r in [...savings.rows].reverse()" :key="r.key">
                  <TableCell>{{ monthLabel(r.key) }}</TableCell>
                  <TableCell class="text-right tabular-nums">
                    {{ money(r.value) }}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </template>
        </ChartCard>
      </div>

      <ChartCard title="Latest transactions">
        <ul class="-mx-2 divide-y">
          <li v-for="t in latest" :key="t.id">
            <button class="flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-left hover:bg-accent" @click="editTransaction(t)">
              <span class="size-2.5 shrink-0 rounded-full" :style="{ background: categoryById.get(t.categoryId)?.color }" />
              <span class="min-w-0 flex-1">
                <span class="block truncate">{{ categoryPath(t.categoryId) }}</span>
                <span class="block truncate text-xs text-muted-foreground">{{ shortDate(t.date) }}<template v-if="t.note"> · {{ t.note }}</template></span>
              </span>
              <span class="tabular-nums whitespace-nowrap" :class="t.type === 'income' ? 'text-income' : ''">
                {{ money(t.type === 'income' ? t.amount : -t.amount, true) }}
              </span>
            </button>
          </li>
        </ul>
        <div class="mt-3">
          <Button variant="outline" size="sm" as-child>
            <RouterLink to="/transactions">
              All transactions
            </RouterLink>
          </Button>
        </div>
      </ChartCard>
    </template>
  </div>
</template>
