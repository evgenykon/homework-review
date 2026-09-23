<template>
  <section class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-3xl font-bold text-gray-100">
        {{ child?.name ?? 'Ребёнок' }}
      </h1>
      <NuxtLink
        to="/dashboard"
        class="text-sm text-gray-400 transition-colors hover:text-gray-200"
      >
        Назад
      </NuxtLink>
    </div>

    <div class="app-card max-w-xl space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold text-gray-100">
          Комнаты чата
        </h2>
        <button
          type="button"
          class="rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
          @click="openModal"
        >
          Создать чат
        </button>
      </div>

      <p v-if="!sessions.length" class="text-sm text-gray-400">
        Пока нет комнат.
      </p>

      <ul v-else class="space-y-1">
        <li v-for="session in sessions" :key="session.id">
          <NuxtLink
            :to="`/sessions/${session.id}`"
            class="flex items-center justify-between rounded-md px-3 py-2 transition-colors hover:bg-white/5"
          >
            <span class="text-gray-100">{{ session.name }}</span>
            <span class="text-xs text-gray-500">
              <ClientOnly>{{ formatDate(session.createdAt) }}</ClientOnly>
            </span>
          </NuxtLink>
        </li>
      </ul>
    </div>

    <div
      v-if="modalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/5 px-4"
      @click.self="closeModal"
    >
      <div class="w-full max-w-sm rounded-lg bg-gray-800 p-6 shadow-xl">
        <h3 class="text-lg font-semibold text-gray-100">
          Новый чат
        </h3>
        <form class="mt-4 space-y-4" @submit.prevent="submit">
          <input
            v-model="name"
            type="text"
            required
            placeholder="Название чата"
            class="w-full rounded-md border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-gray-200"
          >
          <p v-if="error" class="text-sm text-red-400">
            {{ error }}
          </p>
          <div class="flex justify-end gap-2">
            <button
              type="button"
              class="rounded-md px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-white/5"
              @click="closeModal"
            >
              Отмена
            </button>
            <button
              type="submit"
              :disabled="creating"
              class="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
            >
              {{ creating ? 'Создаём…' : 'Создать' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
type Child = {
  id: string
  name: string
  photoUrl: string | null
  age: number | null
}

type ChatSession = {
  id: string
  name: string
  childId: string
  parentId: string
  createdAt: string
}

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const childId = route.params.id as string

const { data: child } = await useFetch(`/api/children/${childId}`, {
  headers: useRequestHeaders(['cookie']),
  ignoreResponseError: true,
  transform: (data): Child | null =>
    data && typeof data === 'object' && 'id' in data ? (data as Child) : null,
})

const { data: sessions, refresh } = await useFetch(`/api/children/${childId}/sessions`, {
  headers: useRequestHeaders(['cookie']),
  ignoreResponseError: true,
  default: () => [] as ChatSession[],
  transform: (data): ChatSession[] => (Array.isArray(data) ? (data as ChatSession[]) : []),
})

const modalOpen = ref(false)
const name = ref('')
const creating = ref(false)
const error = ref<string | null>(null)

const openModal = () => {
  name.value = ''
  error.value = null
  modalOpen.value = true
}

const closeModal = () => {
  modalOpen.value = false
}

const submit = async () => {
  creating.value = true
  error.value = null

  try {
    await $fetch(`/api/children/${childId}/sessions`, {
      method: 'POST',
      body: { name: name.value },
    })
    modalOpen.value = false
    await refresh()
  } catch {
    error.value = 'Не удалось создать чат'
  } finally {
    creating.value = false
  }
}

useHead({ title: computed(() => child.value?.name ?? 'Комнаты чата') })
</script>
