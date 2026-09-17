<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
    <header class="bg-white dark:bg-gray-800 shadow-md">
      <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <NuxtLink to="/" class="text-xl font-bold text-gray-800 dark:text-gray-100">
          Homework Review
        </NuxtLink>
        <button type="button" class="app-button px-3 py-1 text-sm" @click="toggleDarkMode">
          {{ isDark ? 'Light' : 'Dark' }}
        </button>
      </div>
    </header>

    <main class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
const darkMode = useCookie<boolean>('dark-mode', { default: () => false })
const isDark = computed(() => darkMode.value)

const toggleDarkMode = () => {
  darkMode.value = !isDark.value
}
</script>
