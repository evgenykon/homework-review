<template>
  <div
    v-if="book"
    class="fixed inset-0 z-50 flex items-center justify-center p-4"
    :class="collapsed ? 'pointer-events-none bg-transparent' : 'bg-black/70'"
  >
    <div
      class="pointer-events-auto flex w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-gray-800 shadow-xl"
      :class="collapsed ? 'h-auto' : 'h-full'"
      :style="{ transform: `translate(${position.x}px, ${position.y}px)` }"
    >
      <div
        class="flex shrink-0 cursor-move touch-none select-none items-center justify-between gap-3 border-b border-gray-700 px-4 py-3"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
      >
        <span class="truncate text-sm font-medium text-gray-100">
          {{ book.title }}
        </span>
        <div class="flex shrink-0 items-center gap-3">
          <button
            type="button"
            class="text-sm text-gray-400 transition-colors hover:text-gray-200"
            @pointerdown.stop
            @click="collapsed = !collapsed"
          >
            {{ collapsed ? 'Развернуть' : 'Свернуть' }}
          </button>
          <button
            type="button"
            class="text-sm text-gray-400 transition-colors hover:text-gray-200"
            @pointerdown.stop
            @click="emit('close')"
          >
            Закрыть
          </button>
        </div>
      </div>

      <div class="min-h-0 overflow-hidden" :class="collapsed ? 'h-0' : 'flex-1'">
        <iframe
          :src="fileUrl"
          :title="book.title"
          class="h-full w-full border-0 bg-white"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Book } from '~/types/book'

const props = defineProps<{
  book: Book | null
  backendOrigin: string
}>()

const emit = defineEmits<{ close: [] }>()

const collapsed = ref(false)
const dragging = ref(false)
const position = reactive({ x: 0, y: 0 })
let origin = { x: 0, y: 0, px: 0, py: 0 }

const fileUrl = computed(() =>
  props.book ? `${props.backendOrigin}/api/books/${props.book.id}/file` : '',
)

watch(
  () => props.book?.id,
  (id) => {
    if (id) {
      position.x = 0
      position.y = 0
      collapsed.value = false
    }
  },
)

const onPointerDown = (event: PointerEvent) => {
  dragging.value = true
  origin = { x: event.clientX, y: event.clientY, px: position.x, py: position.y }
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

const onPointerMove = (event: PointerEvent) => {
  if (!dragging.value) {
    return
  }

  position.x = origin.px + (event.clientX - origin.x)
  position.y = origin.py + (event.clientY - origin.y)
}

const onPointerUp = () => {
  dragging.value = false
}
</script>
