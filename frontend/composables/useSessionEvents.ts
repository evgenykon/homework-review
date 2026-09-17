export function useSessionEvents(onEvent: (type: string) => void) {
  const config = useRuntimeConfig()
  let socket: WebSocket | null = null

  onMounted(() => {
    socket = new WebSocket(`${config.public.wsBase}/ws`)

    socket.addEventListener('message', (event) => {
      const payload = JSON.parse(event.data as string) as { type: string }

      if (payload.type === 'sessions:changed' || payload.type === 'library:changed') {
        onEvent(payload.type)
      }
    })
  })

  onBeforeUnmount(() => {
    socket?.close()
  })
}
