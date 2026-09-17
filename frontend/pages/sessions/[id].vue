<template>
  <section class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-3xl font-bold text-gray-100">
        Чат
      </h1>
      <NuxtLink
        to="/dashboard"
        class="text-sm text-gray-400 transition-colors hover:text-gray-200"
      >
        Назад
      </NuxtLink>
    </div>

    <div class="app-card max-w-xl space-y-4">
      <div class="max-h-96 space-y-2 overflow-y-auto">
        <p v-if="!messages.length" class="text-sm text-gray-400">
          Сообщений пока нет.
        </p>

        <div
          v-for="message in messages"
          :key="message.id"
          class="rounded-md bg-white/5 px-3 py-2"
        >
          <p class="text-sm text-gray-100">
            {{ message.body }}
          </p>
          <p class="mt-1 text-xs text-gray-500">
            {{ message.senderId === user?.id ? 'Вы' : 'Собеседник' }}
            · {{ new Date(message.createdAt).toLocaleTimeString() }}
          </p>
        </div>
      </div>

      <form class="flex gap-2" @submit.prevent="send">
        <input
          v-model="draft"
          type="text"
          placeholder="Сообщение"
          class="flex-1 rounded-md border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-gray-200"
        >
        <button
          type="submit"
          :disabled="!connected || !draft.trim()"
          class="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
        >
          Отправить
        </button>
      </form>

      <p class="text-xs text-gray-500">
        {{ connected ? 'Подключено' : 'Подключение…' }}
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
type ChatMessage = {
  id: number
  sessionId: string
  senderId: string
  body: string
  createdAt: string
}

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const sessionId = route.params.id as string
const { user } = useAuth()
const config = useRuntimeConfig()

const { data: initial } = await useFetch(`/api/sessions/${sessionId}/messages`, {
  headers: useRequestHeaders(['cookie']),
  ignoreResponseError: true,
  transform: (data): ChatMessage[] => (Array.isArray(data) ? (data as ChatMessage[]) : []),
})

const messages = ref<ChatMessage[]>(initial.value ?? [])
const draft = ref('')
const connected = ref(false)
let socket: WebSocket | null = null

onMounted(() => {
  socket = new WebSocket(`${config.public.wsBase}/ws?sessionId=${encodeURIComponent(sessionId)}`)

  socket.addEventListener('open', () => {
    connected.value = true
  })

  socket.addEventListener('close', () => {
    connected.value = false
  })

  socket.addEventListener('message', (event) => {
    const payload = JSON.parse(event.data as string) as { type: string; message?: ChatMessage }

    if (payload.type === 'message' && payload.message) {
      messages.value.push(payload.message)
    }
  })
})

onBeforeUnmount(() => {
  socket?.close()
})

const send = () => {
  const body = draft.value.trim()

  if (!body || !socket || socket.readyState !== WebSocket.OPEN) {
    return
  }

  socket.send(JSON.stringify({ body }))
  draft.value = ''
}

useHead({ title: 'Чат' })
</script>
