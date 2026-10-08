// The signed-in user and their data, shared by every page
import type { Category, Grocery, Kind, Priority, Settings, Transaction, User, UserData } from './types'
import { computed, reactive } from 'vue'
import { api, ApiError, getToken, setToken } from './api'

interface State {
  user: User | null
  data: UserData | null
  loading: boolean
}

export const state = reactive<State>({ user: null, data: null, loading: false })

export const categories = computed(() => state.data?.categories ?? [])
export const transactions = computed(() => state.data?.transactions ?? [])
export const groceries = computed(() => state.data?.groceries ?? [])
export const currency = computed(() => state.data?.settings.currency ?? 'MAD')
export const categoryById = computed(() => new Map(categories.value.map(c => [c.id, c])))

// ---------------------------------------------------------------- categories and subcategories ( two levels )
export const childrenOf = computed(() => {
  const map = new Map<string, Category[]>()
  for (const c of categories.value) {
    if (!c.parentId) continue
    const list = map.get(c.parentId) ?? []
    list.push(c)
    map.set(c.parentId, list)
  }
  for (const list of map.values()) list.sort((a, b) => a.name.localeCompare(b.name))
  return map
})

// Categories in order, each followed by its subcategories: for the lists and the menus
export function categoryTree(type?: Kind | 'all') {
  const rows: { category: Category, depth: 0 | 1 }[] = []
  const tops = categories.value
    .filter(c => !c.parentId && (!type || type === 'all' || c.type === type))
    .sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name))
  for (const top of tops) {
    rows.push({ category: top, depth: 0 })
    for (const sub of childrenOf.value.get(top.id) ?? []) rows.push({ category: sub, depth: 1 })
  }
  return rows
}

// "Transport › Fuel"
export function categoryPath(id: string) {
  const c = categoryById.value.get(id)
  if (!c) return '—'
  const parent = c.parentId ? categoryById.value.get(c.parentId) : undefined
  return parent ? `${parent.name} › ${c.name}` : c.name
}

// The main category of a category ( itself, or its parent )
export function topCategoryId(id: string) {
  return categoryById.value.get(id)?.parentId || id
}

// A category with its subcategories
export function familyOf(id: string) {
  return [id, ...(childrenOf.value.get(id) ?? []).map(c => c.id)]
}

export async function login(username: string, password: string) {
  const res = await api<{ token: string, user: User }>('POST', 'login', { username, password })
  setToken(res.token)
  state.user = res.user
  await loadData()
}

export function logout() {
  setToken(null)
  state.user = null
  state.data = null
}

// On start: a saved token signs the user back in
export async function restore() {
  if (!getToken()) return false
  try {
    state.user = await api<User>('GET', 'me')
    await loadData()
    return true
  }
  catch (e) {
    if (e instanceof ApiError && e.status === 401) logout()
    return false
  }
}

export async function loadData() {
  state.loading = true
  try { state.data = await api<UserData>('GET', 'data') }
  finally { state.loading = false }
}

type TransactionInput = Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>
type CategoryInput = Omit<Category, 'id'>

export async function saveTransaction(input: TransactionInput, id?: string) {
  const saved = await api<Transaction>(id ? 'PUT' : 'POST', id ? `transactions/${id}` : 'transactions', input)
  const list = state.data!.transactions
  const index = list.findIndex(t => t.id === saved.id)
  if (index >= 0) list[index] = saved
  else list.push(saved)
  return saved
}

export async function deleteTransaction(id: string) {
  await api('DELETE', `transactions/${id}`)
  const list = state.data!.transactions
  list.splice(list.findIndex(t => t.id === id), 1)
}

// A change of category can touch its subcategories ( colour ) and transactions: the data is read again after it
export async function saveCategory(input: CategoryInput, id?: string) {
  const saved = await api<Category>(id ? 'PUT' : 'POST', id ? `categories/${id}` : 'categories', input)
  await loadData()
  return saved
}

// Its subcategories go with it; moveTo: the category that receives their transactions
export async function deleteCategory(id: string, moveTo?: string) {
  await api('DELETE', `categories/${id}`, { moveTo })
  await loadData()
}

export async function saveSettings(settings: Settings) {
  state.data!.settings = await api<Settings>('PUT', 'settings', settings)
}

// ---------------------------------------------------------------- grocery list
export async function addGrocery(name: string, priority: Priority = 'normal', price: number | null = null) {
  const saved = await api<Grocery>('POST', 'groceries', { name, priority, price })
  ;(state.data!.groceries ??= []).push(saved)
  return saved
}

// Shown at once, put back if the server refuses
export async function updateGrocery(item: Grocery, changes: Partial<Pick<Grocery, 'name' | 'priority' | 'price' | 'done'>>) {
  const before = { ...item }
  Object.assign(item, changes, 'done' in changes ? { doneAt: changes.done ? new Date().toISOString() : null } : {})
  try {
    Object.assign(item, await api<Grocery>('PUT', `groceries/${item.id}`, changes))
  }
  catch (e) {
    Object.assign(item, before)
    throw e
  }
}

export async function deleteGrocery(id: string) {
  await api('DELETE', `groceries/${id}`)
  const list = state.data!.groceries!
  list.splice(list.findIndex(g => g.id === id), 1)
}
