export type Toast = {
  id: number
  title: string
  body: string
}

let sequence = 0

export function useToasts() {
  const toasts = useState<Toast[]>('toasts', () => [])

  const dismiss = (id: number) => {
    toasts.value = toasts.value.filter((toast) => toast.id !== id)
  }

  const push = (toast: Omit<Toast, 'id'>, ttl = 5000) => {
    const id = ++sequence

    toasts.value = [...toasts.value, { id, ...toast }]
    setTimeout(() => dismiss(id), ttl)
  }

  return { toasts, push, dismiss }
}
