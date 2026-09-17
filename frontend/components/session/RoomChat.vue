<template>
  <div class="flex h-full min-h-0 flex-col">
    <div ref="scrollEl" class="flex-1 space-y-2 overflow-y-auto p-3">
      <p v-if="!messages.length" class="text-sm text-gray-400">
        Сообщений пока нет.
      </p>

      <div
        v-for="message in messages"
        :key="message.id"
        class="flex"
        :class="message.senderId === currentUserId ? 'justify-end' : 'justify-start'"
      >
        <div
          class="max-w-[80%] rounded-lg px-3 py-2"
          :class="
            message.senderId === currentUserId
              ? 'bg-gray-100 text-gray-900'
              : 'bg-gray-800 text-gray-100'
          "
        >
          <p class="whitespace-pre-wrap break-words text-sm">
            {{ message.body }}
          </p>
          <p class="mt-1 text-right text-[10px] text-gray-500">
            <ClientOnly>{{ formatTime(message.createdAt) }}</ClientOnly>
          </p>
        </div>
      </div>
    </div>

    <form class="shrink-0 border-t border-gray-800 p-3" @submit.prevent="submit">
      <div class="flex gap-2">
        <input
          v-model="draft"
          type="text"
          placeholder="Сообщение"
          class="min-w-0 flex-1 rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-200"
        >
        <button
          type="submit"
          :disabled="!connected || !draft.trim()"
          class="shrink-0 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
        >
          Отправить
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import type { ChatMessage } from '~/composables/useRoom'

const props = defineProps<{
  messages: ChatMessage[]
  connected: boolean
  currentUserId?: string
}>()

const emit = defineEmits<{ send: [body: string] }>()

const draft = ref('')
const scrollEl = ref<HTMLElement | null>(null)

const submit = () => {
  const body = draft.value.trim()

  if (!body) {
    return
  }

  emit('send', body)
  draft.value = ''
}

watch(
  () => props.messages.length,
  async () => {
    await nextTick()

    if (scrollEl.value) {
      scrollEl.value.scrollTop = scrollEl.value.scrollHeight
    }
  },
)
</script>
