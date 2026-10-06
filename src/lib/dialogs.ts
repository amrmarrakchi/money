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

export const categoryDialog = reactive<{ open: boolean, editing: Category | null, type: Kind }>({
  open: false,
  editing: null,
  type: 'expense',
})

export function addCategory(type: Kind) {
  categoryDialog.editing = null
  categoryDialog.type = type
  categoryDialog.open = true
}

export function editCategory(c: Category) {
  categoryDialog.editing = c
  categoryDialog.type = c.type
  categoryDialog.open = true
}

export const settingsDialog = reactive({ open: false })
