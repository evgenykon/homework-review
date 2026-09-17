<template>
  <div />
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

const YANDEX_SDK =
  'https://yastatic.net/s3/passport-sdk/autofill/v1/sdk-suggest-token-with-polyfills-latest.js'

onMounted(async () => {
  try {
    await loadScript(YANDEX_SDK)
    window.YaSendSuggestToken?.(window.location.origin, { flag: true })
  } catch {
    // вспомогательная страница: ошибку можно игнорировать
  }
})
</script>
