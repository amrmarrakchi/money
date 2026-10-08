<script setup lang="ts">
import { ArrowLeftRight, LayoutDashboard, ListChecks, ListFilter, LogOut, Plus, Settings2, Tags } from '@lucide/vue'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { addTransaction, filtersOpen, settingsDialog } from '@/lib/dialogs'
import { logout, state } from '@/lib/store'
import CategoryDialog from './CategoryDialog.vue'
import SettingsDialog from './SettingsDialog.vue'
import TransactionDialog from './TransactionDialog.vue'

const router = useRouter()
const route = useRoute()
const links = [
  { to: '/', name: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/transactions', name: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
  { to: '/groceries', name: 'groceries', label: 'Groceries', icon: ListChecks },
  { to: '/categories', name: 'categories', label: 'Categories', icon: Tags },
]
const title = computed(() => String(route.meta.title ?? ''))

function signOut() {
  logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <div class="min-h-dvh px-2 pt-2 pb-28 sm:px-6 sm:pt-6 md:pb-10 md:pl-28">
    <!-- The tab bar: an ornament beside the window, it opens to show the names when pointed at -->
    <nav
      class="group/tabs glass-thick fixed top-1/2 left-5 z-40 hidden -translate-y-1/2 flex-col gap-1 rounded-[32px] p-2 transition-[width] duration-300 hover:w-52 md:flex md:w-[60px]"
      aria-label="Pages"
    >
      <RouterLink
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        class="flex h-11 items-center gap-3 overflow-hidden rounded-full px-[11px] text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        exact-active-class="!bg-white/20 !text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.2)]"
        :aria-label="link.label"
      >
        <component :is="link.icon" class="size-5 shrink-0" />
        <span class="whitespace-nowrap opacity-0 transition-opacity duration-200 group-hover/tabs:opacity-100">{{ link.label }}</span>
      </RouterLink>
    </nav>

    <!-- The window -->
    <div class="glass-window relative mx-auto max-w-6xl rounded-[32px] sm:rounded-[44px]">
      <header class="flex items-center gap-3 px-4 pt-4 pb-1 sm:px-8 sm:pt-6">
        <img src="/favicon.svg" alt="" class="size-9 rounded-xl">
        <div class="min-w-0">
          <div class="text-xs text-white/60">
            Money
          </div>
          <div class="truncate text-lg leading-tight">
            {{ title }}
          </div>
        </div>
        <div class="ml-auto flex items-center gap-2">
          <Button class="hidden sm:inline-flex" @click="addTransaction()">
            <Plus /> Add
          </Button>
          <Button
            v-if="route.name === 'transactions'"
            :variant="filtersOpen ? 'default' : 'secondary'"
            size="icon"
            class="sm:hidden"
            aria-label="Filters"
            :aria-pressed="filtersOpen"
            @click="filtersOpen = !filtersOpen"
          >
            <ListFilter />
          </Button>
          <Button size="icon" class="sm:hidden" aria-label="Add" @click="addTransaction()">
            <Plus />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <Button variant="secondary" size="icon" aria-label="Account">
                {{ state.user?.name.charAt(0) }}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" class="w-52">
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
              <DropdownMenuItem @select="signOut">
                <LogOut /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main class="px-3 pt-4 pb-5 sm:px-8 sm:pb-8">
        <RouterView />
      </main>
    </div>
    <!-- The window bar, under the window -->
    <div class="mx-auto mt-3 hidden h-1.5 w-28 rounded-full bg-white/25 md:block" aria-hidden="true" />

    <!-- Phones: the tab bar floats at the bottom -->
    <nav class="glass-thick fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 grid grid-cols-4 gap-1 rounded-full p-1.5 md:hidden" aria-label="Pages">
      <RouterLink
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        class="flex flex-col items-center gap-0.5 rounded-full py-2 text-[11px] text-white/65"
        exact-active-class="!bg-white/18 !text-white"
      >
        <component :is="link.icon" class="size-5" />
        {{ link.label }}
      </RouterLink>
    </nav>

    <TransactionDialog />
    <CategoryDialog />
    <SettingsDialog />
  </div>
</template>
