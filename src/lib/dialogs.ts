// The add / edit modals, opened from any page
import type { Category, Kind, Transaction } from './types'
import { reactive } from 'vue'

export const transactionDialog = reactive<{ open: boolean, editing: Transaction | null, type: Kind }>({
  open: false,
  editing: null,
  type: 'expense',
})

export function addTransaction(type: Kind = 'expense') {
  transactionDialog.editing = null
  transactionDialog.type = type
  transactionDialog.open = true
}

export function editTransaction(t: Transaction) {
  transactionDialog.editing = t
  transactionDialog.type = t.type
  transactionDialog.open = true
}

export const categoryDialog = reactive<{ open: boolean, editing: Category | null, type: Kind, parentId: string | null }>({
  open: false,
  editing: null,
  type: 'expense',
  parentId: null,
})

export function addCategory(type: Kind) {
  categoryDialog.editing = null
  categoryDialog.type = type
  categoryDialog.parentId = null
  categoryDialog.open = true
}

export function addSubcategory(parent: Category) {
  categoryDialog.editing = null
  categoryDialog.type = parent.type
  categoryDialog.parentId = parent.id
  categoryDialog.open = true
}

export function editCategory(c: Category) {
  categoryDialog.editing = c
  categoryDialog.type = c.type
  categoryDialog.parentId = c.parentId ?? null
  categoryDialog.open = true
}

export const settingsDialog = reactive({ open: false })
