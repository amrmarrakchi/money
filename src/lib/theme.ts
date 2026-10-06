import { ref } from 'vue'

export const dark = ref(document.documentElement.classList.contains('dark'))

export function setDark(value: boolean) {
  dark.value = value
  document.documentElement.classList.toggle('dark', value)
  try { localStorage.setItem('money-theme', value ? 'dark' : 'light') } catch {}
}
