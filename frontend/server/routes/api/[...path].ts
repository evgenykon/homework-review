export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const url = getRequestURL(event)
  const path = url.pathname.replace(/^\/api/, '')
  const method = event.method

  const body = method === 'GET' || method === 'HEAD' ? undefined : await readBody(event)

  return await $fetch(`${config.public.apiBase}/api${path}${url.search}`, {
    method,
    body,
  })
})
