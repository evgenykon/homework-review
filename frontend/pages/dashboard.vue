<template>
  <section class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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

      <p v-if="!rooms.length" class="text-sm text-gray-400">
        Пока нет комнат.
      </p>

      <ul v-else class="space-y-1">
        <li v-for="room in rooms" :key="room.id">
          <NuxtLink
            :to="`/sessions/${room.id}`"
            class="flex items-center justify-between rounded-md px-3 py-2 transition-colors hover:bg-white/5"
          >
            <span class="text-gray-100">{{ room.name }}</span>
            <span class="text-xs text-gray-500">
              <ClientOnly>{{ formatDate(room.createdAt) }}</ClientOnly>
            </span>
          </NuxtLink>
        </li>
      </ul>
    </div>

    <div v-if="user?.type === 'parent'" class="app-card space-y-3">
      <h2 class="text-lg font-semibold text-gray-100">
        Дети
      </h2>

      <p v-if="!children.length" class="text-sm text-gray-400">
        Пока нет детей. Пригласите ребёнка по ссылке ниже.
      </p>

      <ul v-else class="space-y-1">
        <li v-for="child in children" :key="child.id">
          <NuxtLink
            :to="`/children/${child.id}`"
            class="flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-white/5"
          >
            <img
              v-if="child.photoUrl"
              :src="child.photoUrl"
              :alt="child.name"
              class="h-10 w-10 rounded-full object-cover"
            >
            <div>
              <p class="text-gray-100">{{ child.name }}</p>
              <p v-if="child.age !== null" class="text-xs text-gray-400">
                {{ child.age }} лет
              </p>
            </div>
          </NuxtLink>
        </li>
      </ul>
    </div>

    <div v-if="user?.type === 'parent'" class="app-card space-y-4">
      <div>
        <h2 class="text-lg font-semibold text-gray-100">
          Пригласить ребёнка
        </h2>
        <p class="mt-1 text-sm text-gray-400">
          Сгенерируйте ссылку и отправьте её ребёнку.
        </p>
      </div>

      <button
        type="button"
        class="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
        :disabled="loading"
        @click="createInvite"
      >
        {{ loading ? 'Генерируем…' : 'Сгенерировать инвайт' }}
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

type Invite = {
  token: string
  url: string
  expiresAt: string
}

definePageMeta({ middleware: 'auth' })

useHead({ title: 'Homework Review' })

const { user, logout } = useAuth()

const { data: children } = await useFetch('/api/children', {
  headers: useRequestHeaders(['cookie']),
  ignoreResponseError: true,
  transform: (data): Child[] => (Array.isArray(data) ? (data as Child[]) : []),
})

const { data: rooms } = await useFetch('/api/sessions', {
  headers: useRequestHeaders(['cookie']),
  ignoreResponseError: true,
  transform: (data): ChatSession[] => (Array.isArray(data) ? (data as ChatSession[]) : []),
})

const loading = ref(false)
const error = ref<string | null>(null)
const invite = ref<Invite | null>(null)
const copied = ref(false)

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
