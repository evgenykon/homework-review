export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const url = getRequestURL(event)
  const path = url.pathname.replace(/^\/api/, '')
  const method = event.method
  const cookie = getHeader(event, 'cookie')

  const body = method === 'GET' || method === 'HEAD' ? undefined : await readBody(event)

  const response = await $fetch.raw(`${config.public.apiBase}/api${path}${url.search}`, {
    method,
    body,
    headers: cookie ? { cookie } : undefined,
    redirect: 'manual',
    ignoreResponseError: true,
  })

  for (const value of response.headers.getSetCookie()) {
    appendResponseHeader(event, 'set-cookie', value)
  }

  const location = response.headers.get('location')

  if (location && response.status >= 300 && response.status < 400) {
    return sendRedirect(event, location, response.status)
  }

  setResponseStatus(event, response.status)
  return response._data
})
