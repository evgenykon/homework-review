import type { NotificationPayload } from '~/composables/useNotifications'

export function useSessionEvents(onEvent: (type: string) => void) {
  const config = useRuntimeConfig()
  const { notify } = useNotifications()
  let socket: WebSocket | null = null

  onMounted(() => {
    socket = new WebSocket(`${config.public.wsBase}/ws`)

    socket.addEventListener('message', (event) => {
      const payload = JSON.parse(event.data as string) as { type: string } & NotificationPayload

      if (payload.type === 'sessions:changed' || payload.type === 'library:changed') {
        onEvent(payload.type)
      } else if (payload.type === 'notification') {
        notify(payload)
      }
    })
  })

  onBeforeUnmount(() => {
    socket?.close()
  })
}
