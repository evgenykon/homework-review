export type AuthUser = {
  id: string
  name: string
  photoUrl: string | null
  age: number | null
  type: 'parent' | 'child'
}

export function useAuth() {
  const user = useState<AuthUser | null>('auth-user', () => null)
  const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined

  const fetchUser = async (): Promise<AuthUser | null> => {
    const data = await $fetch('/api/auth/me', {
      headers,
      ignoreResponseError: true,
    })

    user.value = data && typeof data === 'object' && 'id' in data ? (data as AuthUser) : null
    return user.value
  }

  const logout = async (): Promise<void> => {
    await $fetch('/api/auth/logout', { method: 'POST' })
    user.value = null
    await navigateTo('/login')
  }

  return { user, fetchUser, logout }
}
