<script setup lang="ts">
import { Toaster } from '@/components/ui/sonner'
import 'vue-sonner/style.css'
</script>

<template>
  <RouterView />
  <Toaster theme="dark" position="top-center" rich-colors />
</template>
