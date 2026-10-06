<script setup lang="ts">
import { ArrowLeftRight, LayoutDashboard, LogOut, Moon, Plus, Settings2, Sun, Tags } from '@lucide/vue'
import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { addTransaction, settingsDialog } from '@/lib/dialogs'
import { logout, state } from '@/lib/store'
import { dark, setDark } from '@/lib/theme'
import CategoryDialog from './CategoryDialog.vue'
import SettingsDialog from './SettingsDialog.vue'
import TransactionDialog from './TransactionDialog.vue'

const router = useRouter()
const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { to: '/categories', label: 'Categories', icon: Tags },
]

function signOut() {
  logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <div class="min-h-dvh pb-20 md:pb-0">
    <header class="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
      <div class="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <RouterLink to="/" class="flex items-center gap-2.5">
          <img src="/favicon.svg" alt="" class="size-8">
          <span class="text-lg tracking-tight">Money</span>
        </RouterLink>

        <nav class="ml-4 hidden items-center gap-1 md:flex">
          <RouterLink
            v-for="link in links"
            :key="link.to"
            :to="link.to"
            class="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            exact-active-class="!bg-accent !text-accent-foreground"
          >
            {{ link.label }}
          </RouterLink>
        </nav>

        <div class="ml-auto flex items-center gap-2">
          <Button class="hidden md:inline-flex" @click="addTransaction()">
            <Plus /> Add
          </Button>
          <Button variant="ghost" size="icon" :aria-label="dark ? 'Light mode' : 'Dark mode'" @click="setDark(!dark)">
            <Sun v-if="dark" />
            <Moon v-else />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <Button variant="outline" size="icon" class="rounded-full" aria-label="Account">
                {{ state.user?.name.charAt(0) }}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" class="w-48">
              <DropdownMenuLabel>
                {{ state.user?.name }}
                <div class="text-xs text-muted-foreground">
                  @{{ state.user?.username }}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem @select="settingsDialog.open = true">
                <Settings2 /> Settings
              </DropdownMenuItem>
              <DropdownMenuItem @select="setDark(!dark)">
                <Sun v-if="dark" /><Moon v-else /> {{ dark ? 'Light mode' : 'Dark mode' }}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem @select="signOut">
                <LogOut /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-6xl px-4 py-6">
      <RouterView />
    </main>

    <!-- Phones: the pages at the bottom, the add button in the middle -->
    <nav class="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <RouterLink
        v-for="link in links.slice(0, 2)"
        :key="link.to"
        :to="link.to"
        class="flex flex-col items-center gap-1 py-2.5 text-[11px] text-muted-foreground"
        exact-active-class="!text-primary"
      >
        <component :is="link.icon" class="size-5" />
        {{ link.label }}
      </RouterLink>
      <button class="flex flex-col items-center gap-1 py-2.5 text-[11px] text-primary" @click="addTransaction()">
        <span class="-mt-6 grid size-11 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg"><Plus class="size-5" /></span>
        Add
      </button>
      <RouterLink
        :to="links[2].to"
        class="flex flex-col items-center gap-1 py-2.5 text-[11px] text-muted-foreground"
        exact-active-class="!text-primary"
      >
        <Tags class="size-5" />
        {{ links[2].label }}
      </RouterLink>
    </nav>

    <TransactionDialog />
    <CategoryDialog />
    <SettingsDialog />
  </div>
</template>
