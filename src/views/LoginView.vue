<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError } from '@/lib/api'
import { login } from '@/lib/store'

const router = useRouter()
const route = useRoute()
const username = ref('')
const password = ref('')
const error = ref('')
const busy = ref(false)

async function submit() {
  error.value = ''
  busy.value = true
  try {
    await login(username.value, password.value)
    const next = typeof route.query.next === 'string' && route.query.next.startsWith('/') ? route.query.next : '/'
    router.replace(next)
  }
  catch (e) {
    error.value = e instanceof ApiError ? e.message : 'The server cannot be reached'
  }
  finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="relative grid min-h-dvh place-items-center p-4">
    <Card class="glass-window w-full max-w-sm rounded-[40px] py-8">
      <CardHeader class="items-center text-center">
        <img src="/favicon.svg" alt="" class="mx-auto mb-2 size-14 rounded-2xl">
        <CardTitle class="text-2xl">
          Money
        </CardTitle>
        <CardDescription>Sign in to see your expenses and incomes.</CardDescription>
      </CardHeader>
      <CardContent>
        <form class="grid gap-4" @submit.prevent="submit">
          <div class="grid gap-2">
            <Label for="username">Username</Label>
            <Input id="username" v-model="username" autocomplete="username" autocapitalize="none" required />
          </div>
          <div class="grid gap-2">
            <Label for="password">Password</Label>
            <Input id="password" v-model="password" type="password" autocomplete="current-password" required />
          </div>
          <p v-if="error" class="text-sm text-destructive">
            {{ error }}
          </p>
          <Button type="submit" :disabled="busy" class="w-full">
            Sign in
          </Button>
        </form>
      </CardContent>
    </Card>
  </div>
</template>
