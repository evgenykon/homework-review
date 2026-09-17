export type NotificationPayload = {
  kind: string
  title: string
  body: string
  sessionId?: string
}

const DEBOUNCE_MS = 3000

export function useNotifications() {
  const permission = useState<NotificationPermission>('notification-permission', () => 'default')
  const lastShown = useState<Record<string, number>>('notification-last-shown', () => ({}))
  const unread = useState<number>('notification-unread', () => 0)
  const mounted = ref(false)
  const { push } = useToasts()

  const supported = computed(() => mounted.value && 'Notification' in window)

  const updateTitle = () => {
    const base = document.title.replace(/^\(\d+\)\s*/, '')
    document.title = unread.value > 0 ? `(${unread.value}) ${base}` : base
  }

  const request = async () => {
    if (!import.meta.client || !('Notification' in window)) {
      return
    }

    permission.value = await Notification.requestPermission()
  }

  const notify = (payload: NotificationPayload) => {
    if (!import.meta.client) {
      return
    }

    const key = `${payload.kind}:${payload.sessionId ?? ''}`
    const now = Date.now()

    if (now - (lastShown.value[key] ?? 0) < DEBOUNCE_MS) {
      return
    }

    lastShown.value = { ...lastShown.value, [key]: now }

    push({ title: payload.title, body: payload.body })
    unread.value += 1
    updateTitle()

    if (permission.value === 'granted' && 'Notification' in window && document.hidden) {
      new Notification(payload.title, { body: payload.body, tag: key })
    }
  }

  const onFocus = () => {
    unread.value = 0
    updateTitle()
  }

  onMounted(() => {
    mounted.value = true

    if ('Notification' in window) {
      permission.value = Notification.permission
    }

    window.addEventListener('focus', onFocus)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('focus', onFocus)
  })

  return { supported, permission, request, notify }
}
