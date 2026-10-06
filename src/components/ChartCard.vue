<script setup lang="ts">
import { BarChart3, TableIcon } from '@lucide/vue'
import { ref } from 'vue'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

defineProps<{ title: string, description?: string, table?: boolean }>()
const asTable = ref(false)
</script>

<template>
  <Card class="min-w-0">
    <CardHeader>
      <CardTitle>{{ title }}</CardTitle>
      <CardDescription v-if="description">
        {{ description }}
      </CardDescription>
      <CardAction v-if="table">
        <Button variant="ghost" size="icon-sm" :aria-label="asTable ? 'Show as chart' : 'Show as table'" :title="asTable ? 'Show as chart' : 'Show as table'" @click="asTable = !asTable">
          <BarChart3 v-if="asTable" />
          <TableIcon v-else />
        </Button>
      </CardAction>
    </CardHeader>
    <CardContent>
      <slot v-if="asTable && table" name="table" />
      <slot v-else />
    </CardContent>
  </Card>
</template>
