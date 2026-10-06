// The signed-in user and their data, shared by every page
import type { Category, Settings, Transaction, User, UserData } from './types'
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
export const currency = computed(() => state.data?.settings.currency ?? 'MAD')
export const categoryById = computed(() => new Map(categories.value.map(c => [c.id, c])))

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

export async function saveCategory(input: CategoryInput, id?: string) {
  const saved = await api<Category>(id ? 'PUT' : 'POST', id ? `categories/${id}` : 'categories', input)
  const list = state.data!.categories
  const index = list.findIndex(c => c.id === saved.id)
  if (index >= 0) list[index] = saved
  else list.push(saved)
  return saved
}

// moveTo: the category that receives its transactions
export async function deleteCategory(id: string, moveTo?: string) {
  await api('DELETE', `categories/${id}`, { moveTo })
  if (moveTo) for (const t of state.data!.transactions) if (t.categoryId === id) t.categoryId = moveTo
  const list = state.data!.categories
  list.splice(list.findIndex(c => c.id === id), 1)
}

export async function saveSettings(settings: Settings) {
  state.data!.settings = await api<Settings>('PUT', 'settings', settings)
}
