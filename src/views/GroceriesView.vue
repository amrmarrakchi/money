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

// To buy: by priority, then in the order they were added. Done: the latest first
const todo = computed(() => groceries.value
  .filter(g => !g.done)
  .sort((a, b) => ORDER.indexOf(a.priority) - ORDER.indexOf(b.priority) || (a.createdAt ?? '').localeCompare(b.createdAt ?? '')))
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
