<template>
  <div class="shrink-0 border-t border-gray-800 bg-gray-900">
    <div class="flex items-center gap-2 px-3 py-2">
      <div class="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
        <button
          type="button"
          class="shrink-0 rounded-md border border-gray-600 px-3 py-1.5 text-sm text-gray-200 transition-colors hover:bg-white/5"
          @click="emit('pickFiles')"
        >
          Файл
        </button>
        <button
          type="button"
          class="shrink-0 rounded-md border border-gray-600 px-3 py-1.5 text-sm text-gray-200 transition-colors hover:bg-white/5"
          @click="emit('capture')"
        >
          Снимок
        </button>
        <button
          type="button"
          class="shrink-0 rounded-md border px-3 py-1.5 text-sm transition-colors"
          :class="
            drawingEnabled
              ? 'border-primary-500 bg-primary-600 text-white'
              : 'border-gray-600 text-gray-200 hover:bg-white/5'
          "
          @click="emit('toggleDrawing')"
        >
          Рисовать
        </button>
        <button
          type="button"
          class="shrink-0 rounded-md border border-gray-600 px-3 py-1.5 text-sm text-gray-200 transition-colors hover:bg-white/5"
          @click="emit('toggleCalculator')"
        >
          Калькулятор
        </button>

        <div
          v-if="visiblePages.length || hiddenPages.length"
          class="mx-1 h-8 w-px shrink-0 bg-gray-700"
        />

        <button
          v-if="hiddenPages.length && !photosOpen"
          type="button"
          class="shrink-0 rounded-md border border-gray-600 px-3 py-1.5 text-sm text-gray-200 transition-colors hover:bg-white/5"
          @click="photosOpen = true"
        >
          Архив ({{ hiddenPages.length }})
        </button>

        <div v-if="visiblePages.length" class="flex shrink-0 items-center gap-2">
          <div v-for="page in visiblePages" :key="page.id" class="group relative">
            <button
              type="button"
              class="block h-12 w-12 overflow-hidden rounded-md border-2"
              :class="page.id === currentPageId ? 'border-primary-500' : 'border-transparent'"
              @click="emit('selectPage', page.id)"
            >
              <img
                :src="`${backendOrigin}/media/${page.fileName}`"
                :alt="`Страница ${page.position + 1}`"
                loading="lazy"
                decoding="async"
                class="h-full w-full object-cover"
              >
            </button>
            <div
              class="photo-fresh pointer-events-none absolute inset-0 rounded-md"
              :class="isPageFresh(page) ? 'opacity-100' : 'opacity-0'"
            />
            <button
              type="button"
              class="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] leading-none text-white group-hover:flex"
              @click.stop="emit('deletePage', page.id)"
            >
              ×
            </button>
          </div>
        </div>
      </div>

      <div class="flex shrink-0 items-center gap-2">
        <button
          v-if="archived"
          type="button"
          class="rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
          @click="emit('restore')"
        >
          Восстановить
        </button>

        <template v-else>
          <button
            v-if="canReview"
            type="button"
            class="rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
            @click="emit('review')"
          >
            Review
          </button>

          <button
            v-if="canDelete"
            type="button"
            class="rounded-md border border-red-500/60 px-3 py-1.5 text-sm text-red-300 transition-colors hover:bg-red-500/10"
            @click="emit('remove')"
          >
            Удалить
          </button>
        </template>

        <button
          type="button"
          class="rounded-md border border-gray-600 px-3 py-1.5 text-sm text-gray-200 transition-colors hover:bg-white/5 lg:hidden"
          @click="emit('toggleChat')"
        >
          Чат
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { RoomPage } from '~/composables/useRoom'

const props = defineProps<{
  pages: RoomPage[]
  currentPageId: string | null
  drawingEnabled: boolean
  canReview: boolean
  canDelete: boolean
  archived: boolean
  archiveCutoff: string | null
  isPageFresh: (page: RoomPage) => boolean
  backendOrigin: string
}>()

const emit = defineEmits<{
  pickFiles: []
  capture: []
  toggleDrawing: []
  toggleCalculator: []
  selectPage: [id: string]
  deletePage: [id: string]
  toggleChat: []
  review: []
  remove: []
  restore: []
}>()

const photosOpen = ref(false)

watch(
  () => props.archiveCutoff,
  () => {
    photosOpen.value = false
  },
)

const hiddenPages = computed(() => {
  const cutoff = props.archiveCutoff

  return cutoff
    ? props.pages.filter((page) => new Date(page.createdAt) <= new Date(cutoff))
    : []
})

const visiblePages = computed(() => {
  const cutoff = props.archiveCutoff

  if (!cutoff || photosOpen.value) {
    return props.pages
  }

  return props.pages.filter((page) => new Date(page.createdAt) > new Date(cutoff))
})
</script>
