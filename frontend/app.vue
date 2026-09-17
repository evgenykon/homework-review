<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
const darkMode = useCookie<boolean>('dark-mode', { default: () => false })

useHead({
  htmlAttrs: {
    class: computed(() => (darkMode.value ? 'dark' : '')),
  },
  link: [{ rel: 'manifest', href: '/manifest.webmanifest' }],
  meta: [{ name: 'theme-color', content: '#111827' }],
})

onMounted(() => {
  if (import.meta.dev || !('serviceWorker' in navigator)) {
    return
  }

  navigator.serviceWorker.register('/sw.js').catch(() => {
    // PWA-регистрация не критична
  })
})
</script>
