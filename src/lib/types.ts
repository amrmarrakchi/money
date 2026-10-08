export type Kind = 'expense' | 'income'

export interface Category {
  id: string
  type: Kind
  name: string
  color: string
  parentId?: string | null // a subcategory: the id of its category
}

export interface Transaction {
  id: string
  type: Kind
  amount: number
  categoryId: string
  date: string // YYYY-MM-DD
  note: string
  createdAt?: string
  updatedAt?: string
}

export type Priority = 'high' | 'normal' | 'low'

export interface Grocery {
  id: string
  name: string
  priority: Priority
  price?: number | null // optional
  done: boolean
  doneAt?: string | null
  createdAt?: string
}

export interface Settings {
  currency: string
}

export interface UserData {
  settings: Settings
  categories: Category[]
  transactions: Transaction[]
  groceries?: Grocery[]
}

export interface User {
  username: string
  name: string
}
