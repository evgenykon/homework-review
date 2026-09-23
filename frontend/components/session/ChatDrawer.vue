<template>
  <div
    v-if="open"
    class="fixed inset-0 z-40 flex flex-col justify-end bg-black/5"
    @click.self="emit('close')"
  >
    <div class="flex h-[75vh] flex-col rounded-t-2xl bg-gray-900">
      <div class="flex shrink-0 items-center justify-between border-b border-gray-800 px-4 py-3">
        <span class="text-sm font-medium text-gray-200">Чат</span>
        <button
          type="button"
          class="text-sm text-gray-400 transition-colors hover:text-gray-200"
          @click="emit('close')"
        >
          Закрыть
        </button>
      </div>
      <slot />
      <div class="min-h-0 flex-1">
        <RoomChat
          :messages="messages"
          :connected="connected"
          :current-user-id="currentUserId"
          :archive-cutoff="archiveCutoff"
          @send="emit('send', $event)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ChatMessage } from '~/composables/useRoom'

defineProps<{
  open: boolean
  messages: ChatMessage[]
  connected: boolean
  currentUserId?: string
  archiveCutoff?: string | null
}>()

const emit = defineEmits<{
  close: []
  send: [body: string]
}>()
</script>
