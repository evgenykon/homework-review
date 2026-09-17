<template>
  <section class="space-y-6">
    <h1 class="text-3xl font-bold text-gray-100">
      Homework Review
    </h1>
    <p class="text-gray-300">
      Nuxt 4 · TypeScript · Vue · Tailwind CSS · SCSS
    </p>

    <div class="app-card max-w-md space-y-4">
      <template v-if="user">
        <div class="flex items-center gap-3">
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
      </template>

      <template v-else>
        <p class="text-sm text-gray-400">Войдите, чтобы продолжить</p>
        <a
          href="/api/auth/yandex"
          class="inline-block rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
        >
          Войти через Яндекс
        </a>
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
type User = {
  id: string
  name: string
  photoUrl: string | null
  age: number | null
  type: 'parent' | 'child'
}

useHead({ title: 'Homework Review' })

const { data: user } = await useFetch('/api/auth/me', {
  headers: useRequestHeaders(['cookie']),
  ignoreResponseError: true,
  transform: (data): User | null =>
    data && typeof data === 'object' && 'id' in data ? (data as User) : null,
})

const logout = async () => {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await reloadNuxtApp()
}
</script>
