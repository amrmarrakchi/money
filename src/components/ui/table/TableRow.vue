<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { cn } from "@/lib/utils"

const props = defineProps<{
  class?: HTMLAttributes["class"]
}>()
</script>

<template>
  <tr
    data-slot="table-row"
    :class="cn('hover:bg-white/5 data-[state=selected]:bg-white/10 border-b border-white/6 transition-colors', props.class)"
  >
    <slot />
  </tr>
</template>
