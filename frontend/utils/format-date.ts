export function formatDate(value: string): string {
  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('ru-RU')
}

export function formatTime(value: string): string {
  const date = new Date(value)

  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}
