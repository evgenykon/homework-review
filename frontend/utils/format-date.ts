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

const MONTHS = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
]

export function dayKey(value: string): string {
  return value.slice(0, 10)
}

export function formatDayLabel(value: string): string {
  const [year, month, day] = value.slice(0, 10).split('-')
  const monthIndex = Number(month) - 1

  if (!year || Number.isNaN(monthIndex) || !MONTHS[monthIndex]) {
    return ''
  }

  return `${Number(day)} ${MONTHS[monthIndex]} ${year}`
}

