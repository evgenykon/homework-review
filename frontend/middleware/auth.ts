export default defineNuxtRouteMiddleware(async (to) => {
  const { user, fetchUser } = useAuth()
  const current = user.value ?? (await fetchUser())

  if (!current) {
    return to.path === '/login' ? undefined : navigateTo('/login')
  }

  if (to.path === '/' || to.path === '/login') {
    return navigateTo('/dashboard')
  }

  return undefined
})
