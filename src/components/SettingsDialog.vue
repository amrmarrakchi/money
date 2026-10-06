<script setup lang="ts">
import { ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { settingsDialog as dialog } from '@/lib/dialogs'
import { showError } from '@/lib/errors'
import { currency, saveSettings } from '@/lib/store'

const value = ref('')
watch(() => dialog.open, (open) => { if (open) value.value = currency.value })

async function submit() {
  try {
    await saveSettings({ currency: value.value.trim() })
    toast.success('Settings saved')
    dialog.open = false
  }
  catch (e) {
    showError(e)
  }
}
</script>

<template>
  <Dialog v-model:open="dialog.open">
    <DialogContent class="sm:max-w-sm">
      <DialogHeader>
        <DialogTitle>Settings</DialogTitle>
        <DialogDescription>Shown after every amount.</DialogDescription>
      </DialogHeader>
      <form id="settings-form" class="grid gap-2" @submit.prevent="submit">
        <Label for="s-currency">Currency</Label>
        <Input id="s-currency" v-model="value" maxlength="8" placeholder="MAD" />
      </form>
      <DialogFooter>
        <Button variant="outline" @click="dialog.open = false">
          Cancel
        </Button>
        <Button type="submit" form="settings-form">
          Save
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
