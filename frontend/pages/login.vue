<template>
  <section class="flex min-h-[70vh] flex-col items-center justify-center gap-6">
    <div id="yandex-button" class="ya-button" />

    <a
      v-if="showFallback"
      :href="loginHref"
      class="inline-block rounded-lg bg-primary-600 px-12 py-5 text-xl font-medium text-white transition-colors hover:bg-primary-700"
    >
      Войти с Яндекс ID
    </a>

    <p v-if="error" class="max-w-md text-center text-sm text-red-400">
      {{ error }}
    </p>
  </section>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

useHead({ title: 'Вход' })

const YANDEX_SDK =
  'https://yastatic.net/s3/passport-sdk/autofill/v1/sdk-suggest-with-polyfills-latest.js'

const clientId = useRuntimeConfig().public.yandexClientId
const route = useRoute()
const invite = typeof route.query.invite === 'string' ? route.query.invite : null
const showFallback = ref(!clientId)
const error = ref<string | null>(null)

const loginHref = computed(() => {
  if (!invite) {
    return '/api/auth/yandex'
  }

  const params = new URLSearchParams({ role: 'child', invite })
  return `/api/auth/yandex?${params.toString()}`
})

onMounted(async () => {
  if (!clientId) {
    return
  }

  try {
    await loadScript(YANDEX_SDK)

    const suggest = window.YaAuthSuggest

    if (!suggest) {
      throw new Error('Яндекс SDK не загрузился')
    }

    const origin = window.location.origin

    const result = await suggest.init(
      {
        client_id: clientId,
        response_type: 'token',
        redirect_uri: `${origin}/suggest/token`,
      },
      origin,
      {
        view: 'button',
        parentId: 'yandex-button',
        buttonView: 'main',
        buttonTheme: 'dark',
        buttonSize: 'xxl',
        buttonBorderRadius: 8,
        buttonIcon: 'ya',
      },
    )

    if (result.status === 'error') {
      throw new Error(`Яндекс SDK: ${result.code ?? 'unknown error'}`)
    }

    setTimeout(() => {
      const container = document.getElementById('yandex-button')

      if (container && container.childElementCount === 0) {
        showFallback.value = true
      }
    }, 3000)

    const data = typeof result.handler === 'function' ? await result.handler() : result
    const token = data.access_token ?? data.token

    if (!token) {
      throw new Error('Яндекс не вернул токен')
    }

    await $fetch('/api/auth/yandex/token', {
      method: 'POST',
      body: { token, invite },
    })
    await navigateTo('/dashboard')
  } catch (e) {
    console.error('[yandex] auth failed', e)
    error.value = e instanceof Error ? e.message : String(e)
    showFallback.value = true
  }
})
</script>
