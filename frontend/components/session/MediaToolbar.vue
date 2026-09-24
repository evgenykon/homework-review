<template>
  <div class="shrink-0 border-t border-gray-800 bg-gray-900">
    <div class="flex items-center gap-1.5 px-3 py-2">
      <div class="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto">
        <button
          type="button"
          class="icon-btn"
          title="Загрузить файл"
          @click="emit('pickFiles')"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5">
            <path d="M12 16V4m0 0l-4 4m4-4l4 4" />
            <path d="M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3" />
          </svg>
        </button>
        <button
          type="button"
          class="icon-btn"
          title="Сделать снимок"
          @click="emit('capture')"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5">
            <path d="M4 7h3l2-3h6l2 3h3a1 1 0 011 1v11a1 1 0 01-1 1H4a1 1 0 01-1-1V8a1 1 0 011-1z" />
            <circle cx="12" cy="13" r="3.5" />
          </svg>
        </button>
        <button
          type="button"
          class="icon-btn"
          :class="drawingEnabled ? 'is-active' : ''"
          title="Рисовать"
          @click="emit('toggleDrawing')"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5">
            <path d="M17 3l4 4L8 20l-5 1 1-5L17 3z" />
          </svg>
        </button>
        <button
          type="button"
          class="icon-btn"
          title="Калькулятор"
          @click="emit('toggleCalculator')"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5">
            <rect x="5" y="3" width="14" height="18" rx="2" />
            <path d="M8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01" />
          </svg>
        </button>
        <button
          type="button"
          class="icon-btn"
          title="Игра"
          @click="emit('toggleGame')"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5">
            <path d="M6 11h4m-2-2v4" />
            <path d="M14 10h.01M17 13h.01" />
            <path d="M17.32 5H6.68a4 4 0 00-3.98 3.6l-.7 7a3 3 0 005.7 1.4L8 19h8l.3-2a3 3 0 005.7-1.4l-.7-7A4 4 0 0017.32 5z" />
          </svg>
        </button>

        <div
          v-if="visiblePages.length || hiddenPages.length"
          class="mx-1 h-8 w-px shrink-0 bg-gray-700"
        />

        <button
          v-if="hiddenPages.length && !photosOpen"
          type="button"
          class="icon-btn relative"
          title="Архив"
          @click="photosOpen = true"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5">
            <rect x="3" y="4" width="18" height="4" rx="1" />
            <path d="M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8" />
            <path d="M10 12h4" />
          </svg>
          <span class="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-600 px-1 text-[10px] font-medium leading-none text-white">
            {{ hiddenPages.length }}
          </span>
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

      <div class="flex shrink-0 items-center gap-1.5">
        <button
          v-if="archived"
          type="button"
          class="icon-btn is-active"
          title="Восстановить"
          @click="emit('restore')"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5">
            <path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>

        <template v-else>
          <button
            v-if="canReview"
            type="button"
            class="icon-btn is-active"
            title="Ревью"
            @click="emit('review')"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
            </svg>
          </button>

          <button
            v-if="canDelete"
            type="button"
            class="icon-btn danger"
            title="Удалить"
            @click="emit('remove')"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5">
              <path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
              <path d="M10 11v6M14 11v6" />
            </svg>
          </button>
        </template>

        <button
          type="button"
          class="icon-btn lg:hidden"
          title="Чат"
          @click="emit('toggleChat')"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5">
            <path d="M21 12a8 8 0 01-8 8H4l2-3a8 8 0 1115-5z" />
          </svg>
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
  toggleGame: []
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
