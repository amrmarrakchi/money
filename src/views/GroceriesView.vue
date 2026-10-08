<script setup lang="ts">
import type { Grocery, Priority } from '@/lib/types'
import { Plus, Trash2 } from '@lucide/vue'
import { computed, onMounted, ref } from 'vue'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { showError } from '@/lib/errors'
import { addGrocery, deleteGrocery, groceries, updateGrocery } from '@/lib/store'

const ORDER: Priority[] = ['high', 'normal', 'low']
const LABEL: Record<Priority, string> = { high: 'High', normal: 'Normal', low: 'Low' }
const STYLE: Record<Priority, string> = {
  high: 'bg-red-500/25 text-red-200',
  normal: 'bg-white/12 text-white/80',
  low: 'bg-white/5 text-white/45',
}
const next = (p: Priority) => ORDER[(ORDER.indexOf(p) + 1) % ORDER.length]

type Sort = 'priority' | 'latest'
const SORTS: { value: Sort, label: string }[] = [
  { value: 'priority', label: 'Priority' },
  { value: 'latest', label: 'Last added' },
]
const SORT_KEY = 'money-groceries-sort'
function savedSort(): { by: Sort, desc: boolean } {
  try {
    const s = JSON.parse(localStorage.getItem(SORT_KEY) ?? '')
    if (SORTS.some(o => o.value === s.by)) return { by: s.by, desc: !!s.desc }
  }
  catch {}
  return { by: 'priority', desc: false }
}
const sort = ref(savedSort())

// Same option again flips the direction. Priority: high first; last added: newest first
function pick(by: Sort) {
  sort.value = sort.value.by === by ? { by, desc: !sort.value.desc } : { by, desc: false }
  try { localStorage.setItem(SORT_KEY, JSON.stringify(sort.value)) } catch {}
}

const byAdded = (a: Grocery, b: Grocery) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')
const byPriority = (a: Grocery, b: Grocery) => ORDER.indexOf(a.priority) - ORDER.indexOf(b.priority)

function compare(a: Grocery, b: Grocery) {
  const dir = sort.value.desc ? -1 : 1
  if (sort.value.by === 'latest') return dir * byAdded(a, b)
  return dir * byPriority(a, b) || byAdded(b, a)
}

// To buy: in the chosen order. Done: the latest first
const todo = computed(() => groceries.value.filter(g => !g.done).sort(compare))
const archive = computed(() => groceries.value
  .filter(g => g.done)
  .sort((a, b) => (b.doneAt ?? '').localeCompare(a.doneAt ?? '')))

const name = ref('')
const priority = ref<Priority>('normal')
const input = ref<InstanceType<typeof Input> | null>(null)

// Enter adds and keeps the focus in the field, ready for the next one
async function add() {
  const text = name.value.trim()
  if (!text) return
  const chosen = priority.value
  name.value = ''
  priority.value = 'normal'
  try {
    await addGrocery(text, chosen)
  }
  catch (e) {
    name.value = text
    priority.value = chosen
    showError(e)
  }
}

async function change(item: Grocery, changes: Partial<Pick<Grocery, 'priority' | 'done'>>) {
  try { await updateGrocery(item, changes) }
  catch (e) { showError(e) }
}

async function remove(item: Grocery) {
  try { await deleteGrocery(item.id) }
  catch (e) { showError(e) }
}

onMounted(() => (input.value?.$el as HTMLInputElement | undefined)?.focus())
</script>

<template>
  <div class="mx-auto grid max-w-2xl gap-4">
    <!-- Quick add: type, Enter. The chip cycles the priority ( Normal by default ) -->
    <form class="flex items-center gap-2" @submit.prevent="add">
      <Input ref="input" v-model="name" placeholder="Add an item…" maxlength="100" autocomplete="off" />
      <button
        type="button"
        class="h-10 w-20 shrink-0 rounded-full text-xs font-medium"
        :class="STYLE[priority]"
        :title="'Priority: click to change'"
        @click="priority = next(priority)"
      >
        {{ LABEL[priority] }}
      </button>
      <button type="submit" class="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground" aria-label="Add">
        <Plus class="size-5" />
      </button>
    </form>

    <div v-if="todo.length > 1" class="flex flex-wrap items-center gap-2 px-1 text-xs text-white/60">
      <span>Sort</span>
      <button
        v-for="o in SORTS"
        :key="o.value"
        type="button"
        class="rounded-full px-3 py-1 font-medium"
        :class="sort.by === o.value ? 'bg-white/20 text-white' : 'bg-white/5 hover:bg-white/10'"
        @click="pick(o.value)"
      >
        {{ o.label }}<template v-if="sort.by === o.value"> {{ sort.desc ? '↑' : '↓' }}</template>
      </button>
    </div>

    <Card v-if="todo.length">
      <CardContent class="px-0">
        <ul class="divide-y divide-white/10">
          <li v-for="g in todo" :key="g.id" class="flex items-center gap-3 px-4 py-2.5">
            <input type="checkbox" class="size-5 shrink-0 accent-white" :aria-label="`Done: ${g.name}`" @change="change(g, { done: true })">
            <span class="min-w-0 flex-1 truncate">{{ g.name }}</span>
            <button
              type="button"
              class="rounded-full px-2.5 py-0.5 text-xs font-medium"
              :class="STYLE[g.priority]"
              title="Click to change the priority"
              @click="change(g, { priority: next(g.priority) })"
            >
              {{ LABEL[g.priority] }}
            </button>
            <button type="button" class="text-white/40 hover:text-white" :aria-label="`Delete ${g.name}`" @click="remove(g)">
              <Trash2 class="size-4" />
            </button>
          </li>
        </ul>
      </CardContent>
    </Card>
    <p v-else class="px-1 text-sm text-muted-foreground">
      Nothing to buy.
    </p>

    <section v-if="archive.length" class="grid gap-2">
      <h2 class="px-1 text-xs tracking-wide text-white/50 uppercase">
        Archive · {{ archive.length }}
      </h2>
      <Card class="opacity-50">
        <CardContent class="px-0">
          <ul class="divide-y divide-white/10">
            <li v-for="g in archive" :key="g.id" class="flex items-center gap-3 px-4 py-2.5">
              <input type="checkbox" checked class="size-5 shrink-0 accent-white" :aria-label="`Not done: ${g.name}`" @change="change(g, { done: false })">
              <span class="min-w-0 flex-1 truncate line-through">{{ g.name }}</span>
              <span class="rounded-full px-2.5 py-0.5 text-xs font-medium" :class="STYLE[g.priority]">{{ LABEL[g.priority] }}</span>
              <button type="button" class="text-white/40 hover:text-white" :aria-label="`Delete ${g.name}`" @click="remove(g)">
                <Trash2 class="size-4" />
              </button>
            </li>
          </ul>
        </CardContent>
      </Card>
    </section>
  </div>
</template>
