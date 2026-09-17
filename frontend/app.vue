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
  link: [
    { rel: 'manifest', href: '/manifest.webmanifest' },
    { rel: 'icon', href: '/favicon.ico', sizes: 'any' },
    { rel: 'icon', type: 'image/png', href: '/favicon-32.png', sizes: '32x32' },
    { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
  ],
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
