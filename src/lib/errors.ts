import { toast } from 'vue-sonner'
import { router } from '@/router'
import { ApiError } from './api'
import { logout } from './store'

// One place for failed calls: a toast, or back to the sign-in page when the session ended
export function showError(e: unknown) {
  if (e instanceof ApiError && e.status === 401) {
    logout()
    router.push({ name: 'login' })
    toast.error('Your session ended, please sign in again')
    return
  }
  toast.error(e instanceof Error ? e.message : 'Something went wrong')
}
