<template>
  <section class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-3xl font-bold text-gray-100">
        Архив комнат
      </h1>
      <NuxtLink
        to="/dashboard"
        class="text-sm text-gray-400 transition-colors hover:text-gray-200"
      >
        Назад
      </NuxtLink>
    </div>

    <div class="app-card max-w-xl space-y-3">
      <p v-if="!rooms.length" class="text-sm text-gray-400">
        Архив пуст.
      </p>

      <ul v-else class="space-y-1">
        <li
          v-for="room in rooms"
          :key="room.id"
          class="flex items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-white/5"
        >
          <NuxtLink
            :to="`/sessions/${room.id}`"
            class="min-w-0 flex-1 truncate text-gray-100"
          >
            {{ room.name }}
          </NuxtLink>
          <span class="shrink-0 text-xs text-gray-500">
            <ClientOnly>{{ formatDate(room.archivedAt ?? room.createdAt) }}</ClientOnly>
          </span>
          <button
            type="button"
            class="shrink-0 rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
            :disabled="restoringId === room.id"
            @click="restoreRoom(room.id)"
          >
            Восстановить
          </button>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { RoomSession } from '~/composables/useRoom'

definePageMeta({ middleware: 'auth' })

const { data: rooms, refresh } = await useFetch('/api/sessions/archive', {
  headers: useRequestHeaders(['cookie']),
  ignoreResponseError: true,
  transform: (data): RoomSession[] => (Array.isArray(data) ? (data as RoomSession[]) : []),
})

const restoringId = ref<string | null>(null)

useSessionEvents((type) => {
  if (type === 'sessions:changed') {
    void refresh()
  }
})

const restoreRoom = async (id: string) => {
  restoringId.value = id

  try {
    await $fetch(`/api/sessions/${id}/restore`, { method: 'POST' })
    await refresh()
  } finally {
    restoringId.value = null
  }
}

useHead({ title: 'Архив комнат' })
</script>
