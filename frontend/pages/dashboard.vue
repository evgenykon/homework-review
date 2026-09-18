<template>
  <section class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
    <ClientOnly>
      <div
        v-if="notificationsSupported && notificationPermission !== 'granted'"
        class="app-card flex items-center justify-between gap-3"
      >
        <span class="text-sm text-gray-400">
          Включить уведомления о сообщениях и изменениях?
        </span>
        <button
          type="button"
          class="shrink-0 rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
          @click="requestNotifications"
        >
          Включить
        </button>
      </div>
    </ClientOnly>

    <div class="app-card space-y-4">
      <div v-if="user" class="flex items-center gap-3">
        <img
          v-if="user.photoUrl"
          :src="user.photoUrl"
          :alt="user.name"
          class="h-12 w-12 rounded-full object-cover"
        >
        <div>
          <p class="font-medium text-gray-100">{{ user.name }}</p>
          <p class="text-sm text-gray-400">
            {{ user.type === 'parent' ? 'Родитель' : 'Ребёнок' }}
            <template v-if="user.age !== null"> · {{ user.age }} лет</template>
          </p>
        </div>
      </div>

      <button
        type="button"
        class="text-sm text-gray-400 transition-colors hover:text-gray-200"
        @click="logout"
      >
        Выйти
      </button>
    </div>

    <div class="app-card space-y-3">
      <h2 class="text-lg font-semibold text-gray-100">
        Комнаты
      </h2>

      <template v-if="!rooms.length">
        <p class="text-sm text-gray-400">
          Пока нет комнат.
        </p>
        <button
          v-if="user?.type === 'parent'"
          type="button"
          class="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
          :disabled="!children.length"
          @click="openCreateRoom"
        >
          Создать комнату
        </button>
        <p v-if="user?.type === 'parent' && !children.length" class="text-xs text-gray-500">
          Сначала пригласите ребёнка.
        </p>
      </template>

      <ul v-else class="space-y-1">
        <li v-for="room in rooms" :key="room.id">
          <NuxtLink
            :to="`/sessions/${room.id}`"
            class="flex items-center justify-between gap-3 rounded-md px-3 py-2 transition-colors hover:bg-white/5"
          >
            <span class="flex min-w-0 items-center gap-2">
              <span class="truncate text-gray-100">{{ room.name }}</span>
              <span
                v-if="room.unreadCount"
                class="shrink-0 rounded-full bg-primary-600 px-2 py-0.5 text-xs font-medium text-white"
              >
                {{ room.unreadCount }}
              </span>
            </span>
            <span class="flex shrink-0 items-center gap-2">
              <span
                v-if="room.status"
                class="rounded-full px-2 py-0.5 text-xs"
                :class="reviewStatusClasses[room.status]"
              >
                {{ reviewStatusLabels[room.status] }}
              </span>
              <span class="text-xs text-gray-500">
                <ClientOnly>{{ formatDate(room.createdAt) }}</ClientOnly>
              </span>
            </span>
          </NuxtLink>
        </li>
      </ul>
    </div>

    <div class="app-card space-y-3">
      <h2 class="text-lg font-semibold text-gray-100">
        Библиотека
      </h2>
      <NuxtLink
        to="/library"
        class="inline-block self-start rounded-md border border-gray-600 px-4 py-2 text-sm text-gray-200 transition-colors hover:bg-white/5"
      >
        Библиотека ({{ books.length }})
      </NuxtLink>
    </div>

    <div v-if="user?.type === 'parent' && archivedRooms.length" class="app-card space-y-3">
      <h2 class="text-lg font-semibold text-gray-100">
        Архив
      </h2>
      <NuxtLink
        to="/archive"
        class="inline-block self-start rounded-md border border-gray-600 px-4 py-2 text-sm text-gray-200 transition-colors hover:bg-white/5"
      >
        Архив комнат ({{ archivedRooms.length }})
      </NuxtLink>
    </div>

    <div v-if="user?.type === 'parent'" class="app-card space-y-3">
      <h2 class="text-lg font-semibold text-gray-100">
        Дети
      </h2>

      <p v-if="!children.length" class="text-sm text-gray-400">
        Пока нет детей.
      </p>

      <ul v-else class="space-y-1">
        <li
          v-for="child in children"
          :key="child.id"
          class="flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-white/5"
        >
          <img
            v-if="child.photoUrl"
            :src="child.photoUrl"
            :alt="child.name"
            class="h-10 w-10 rounded-full object-cover"
          >
          <NuxtLink :to="`/children/${child.id}`" class="min-w-0 flex-1">
            <p class="truncate text-gray-100">{{ child.name }}</p>
            <p v-if="child.age !== null" class="text-xs text-gray-400">
              {{ child.age }} лет
            </p>
          </NuxtLink>
          <button
            type="button"
            class="shrink-0 text-sm text-red-300 transition-colors hover:text-red-200 disabled:opacity-60"
            :disabled="unlinkingId === child.id"
            @click="unlinkChild(child.id)"
          >
            Отвязать
          </button>
        </li>
      </ul>

      <button
        type="button"
        class="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
        :disabled="loading"
        @click="createInvite"
      >
        {{ loading ? 'Генерируем…' : '+ Добавить ребёнка' }}
      </button>

      <div v-if="invite" class="space-y-2">
        <input
          :value="invite.url"
          readonly
          class="w-full rounded-md border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-gray-200"
        >
        <button
          type="button"
          class="text-sm text-primary-400 transition-colors hover:text-primary-300"
          @click="copyLink"
        >
          {{ copied ? 'Скопировано' : 'Скопировать ссылку' }}
        </button>
        <p class="text-xs text-gray-500">
          Действует до {{ formattedExpiry }}
        </p>
      </div>

      <p v-if="error" class="text-sm text-red-400">
        {{ error }}
      </p>
    </div>

    <div
      v-if="createRoomOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      @click.self="createRoomOpen = false"
    >
      <div class="w-full max-w-sm rounded-lg bg-gray-800 p-6 shadow-xl">
        <h3 class="text-lg font-semibold text-gray-100">
          Новая комната
        </h3>
        <form class="mt-4 space-y-4" @submit.prevent="submitCreateRoom">
          <select
            v-model="newRoomChildId"
            required
            class="w-full rounded-md border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-gray-200"
          >
            <option v-for="child in children" :key="child.id" :value="child.id">
              {{ child.name }}
            </option>
          </select>
          <input
            v-model="newRoomName"
            type="text"
            required
            placeholder="Название комнаты"
            class="w-full rounded-md border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-gray-200"
          >
          <p v-if="createRoomError" class="text-sm text-red-400">
            {{ createRoomError }}
          </p>
          <div class="flex justify-end gap-2">
            <button
              type="button"
              class="rounded-md px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-white/5"
              @click="createRoomOpen = false"
            >
              Отмена
            </button>
            <button
              type="submit"
              :disabled="creatingRoom"
              class="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
            >
              {{ creatingRoom ? 'Создаём…' : 'Создать' }}
            </button>
          </div>
        </form>
      </div>
    </div>
    <div class="pointer-events-none fixed bottom-4 right-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
      <TransitionGroup
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="translate-y-2 opacity-0"
        enter-to-class="translate-y-0 opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="pointer-events-auto rounded-lg bg-gray-800 p-3 shadow-lg ring-1 ring-gray-700"
        >
          <p class="text-sm font-medium text-gray-100">
            {{ toast.title }}
          </p>
          <p class="mt-0.5 break-words text-sm text-gray-400">
            {{ toast.body }}
          </p>
        </div>
      </TransitionGroup>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { ReviewStatus } from '~/composables/useRoom'

type Child = {
  id: string
  name: string
  photoUrl: string | null
  age: number | null
}

type ChatSession = {
  id: string
  name: string
  status: ReviewStatus
  unreadCount: number
  childId: string
  parentId: string
  createdAt: string
}

type Book = {
  id: string
  title: string
  mimeType: string
  size: number
  createdAt: string
}

type Invite = {
  token: string
  url: string
  expiresAt: string
}

definePageMeta({ middleware: 'auth' })

useHead({ title: 'Homework Review' })

const { user, logout } = useAuth()

const {
  supported: notificationsSupported,
  permission: notificationPermission,
  request: requestNotifications,
} = useNotifications()

const { toasts } = useToasts()

const { data: children, refresh: refreshChildren } = await useFetch('/api/children', {
  headers: useRequestHeaders(['cookie']),
  ignoreResponseError: true,
  transform: (data): Child[] => (Array.isArray(data) ? (data as Child[]) : []),
})

const { data: rooms, refresh: refreshRooms } = await useFetch('/api/sessions', {
  headers: useRequestHeaders(['cookie']),
  ignoreResponseError: true,
  transform: (data): ChatSession[] => (Array.isArray(data) ? (data as ChatSession[]) : []),
})

const { data: archivedRooms, refresh: refreshArchived } = await useFetch('/api/sessions/archive', {
  headers: useRequestHeaders(['cookie']),
  ignoreResponseError: true,
  transform: (data): ChatSession[] => (Array.isArray(data) ? (data as ChatSession[]) : []),
})

const { data: books, refresh: refreshBooks } = await useFetch('/api/books', {
  headers: useRequestHeaders(['cookie']),
  ignoreResponseError: true,
  transform: (data): Book[] => (Array.isArray(data) ? (data as Book[]) : []),
})

useSessionEvents((type) => {
  if (type === 'sessions:changed') {
    void refreshRooms()
    void refreshArchived()
  }

  if (type === 'library:changed') {
    void refreshBooks()
  }
})

const createRoomOpen = ref(false)
const unlinkingId = ref<string | null>(null)
const newRoomChildId = ref('')
const newRoomName = ref('')
const creatingRoom = ref(false)
const createRoomError = ref<string | null>(null)

const openCreateRoom = () => {
  newRoomChildId.value = children.value?.[0]?.id ?? ''
  newRoomName.value = ''
  createRoomError.value = null
  createRoomOpen.value = true
}

const submitCreateRoom = async () => {
  creatingRoom.value = true
  createRoomError.value = null

  try {
    await $fetch(`/api/children/${newRoomChildId.value}/sessions`, {
      method: 'POST',
      body: { name: newRoomName.value },
    })
    createRoomOpen.value = false
    await refreshRooms()
  } catch {
    createRoomError.value = 'Не удалось создать комнату'
  } finally {
    creatingRoom.value = false
  }
}

const loading = ref(false)
const error = ref<string | null>(null)
const invite = ref<Invite | null>(null)
const copied = ref(false)

const unlinkChild = async (id: string) => {
  unlinkingId.value = id

  try {
    await $fetch(`/api/children/${id}`, { method: 'DELETE' })
    await refreshChildren()
  } finally {
    unlinkingId.value = null
  }
}

const createInvite = async () => {
  loading.value = true
  error.value = null
  copied.value = false

  try {
    invite.value = await $fetch<Invite>('/api/invites', { method: 'POST' })
  } catch {
    error.value = 'Не удалось создать инвайт'
  } finally {
    loading.value = false
  }
}

const copyLink = async () => {
  if (!invite.value) {
    return
  }

  await navigator.clipboard.writeText(invite.value.url)
  copied.value = true
}

const formattedExpiry = computed(() =>
  invite.value ? new Date(invite.value.expiresAt).toLocaleString() : '',
)
</script>
