import type { ReviewStatus } from '~/composables/useRoom'

export const reviewStatusLabels: Record<ReviewStatus, string> = {
  PENDING: 'Ожидает',
  REVIEWED: 'Есть замечания',
  APPROVED: 'Одобрено',
}

export const reviewStatusClasses: Record<ReviewStatus, string> = {
  PENDING: 'bg-gray-700 text-gray-200',
  REVIEWED: 'bg-yellow-600/20 text-yellow-300',
  APPROVED: 'bg-green-600/20 text-green-300',
}
