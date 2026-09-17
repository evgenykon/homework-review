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
})
</script>
