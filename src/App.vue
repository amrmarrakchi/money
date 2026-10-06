<script setup lang="ts">
import { Toaster } from '@/components/ui/sonner'
import 'vue-sonner/style.css'
import { dark } from '@/lib/theme'
</script>

<template>
  <RouterView />
  <Toaster :theme="dark ? 'dark' : 'light'" position="top-center" rich-colors />
</template>
