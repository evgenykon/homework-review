<template>
  <div
    class="relative flex min-h-0 flex-1 flex-col"
    @dragover.prevent
    @drop.prevent="onDrop"
  >
    <div v-if="!currentPage" class="flex flex-1 items-center justify-center p-6">
      <div class="w-full max-w-md rounded-xl border-2 border-dashed border-gray-700 p-8 text-center">
        <p class="text-gray-300">
          Перетащите изображение сюда
        </p>
        <div class="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            class="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
            @click="emit('pickFiles')"
          >
            Загрузить файл
          </button>
          <button
            type="button"
            class="rounded-md border border-gray-600 px-4 py-2 text-sm font-medium text-gray-200 transition-colors hover:bg-white/5"
            @click="emit('capture')"
          >
            Сделать снимок
          </button>
        </div>
      </div>
    </div>

    <div
      v-else
      ref="viewportEl"
      class="relative flex-1 overflow-hidden"
      :class="drawingEnabled ? '' : 'cursor-grab'"
      @wheel.prevent="onWheel"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
    >
      <div class="absolute inset-0 flex items-center justify-center">
        <p v-if="imageError" class="text-sm text-red-400">
          Не удалось загрузить изображение
        </p>
        <p v-else-if="!imageReady" class="text-sm text-gray-500">
          Загрузка…
        </p>

        <div :style="transformStyle" :class="imageReady ? '' : 'opacity-0'">
          <div
            class="relative shadow-2xl"
            :style="{ width: `${displayWidth}px`, height: `${displayHeight}px` }"
          >
            <img
              ref="imageEl"
              :src="imageUrl"
              alt=""
              class="h-full w-full select-none"
              draggable="false"
              @load="onImageLoad"
              @error="onImageError"
            >
            <DrawingCanvas
              :strokes="currentPage.strokes.map((stroke) => stroke.data)"
              :enabled="drawingEnabled"
              :width="displayWidth"
              :height="displayHeight"
              :color="drawColor"
              :mode="drawMode"
              :line-width="drawMode === 'erase' ? 24 : 3"
              @stroke-end="emit('addStroke', $event)"
            />
          </div>
        </div>
      </div>

      <p class="pointer-events-none absolute bottom-2 left-3 text-xs text-gray-500">
        Колесо — зум, перетаскивание — панорама
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { RoomPage, StrokeData } from '~/composables/useRoom'

const props = defineProps<{
  currentPage: RoomPage | null
  drawingEnabled: boolean
  drawColor: string
  drawMode: 'draw' | 'erase'
  backendOrigin: string
}>()

const emit = defineEmits<{
  pickFiles: []
  capture: []
  upload: [files: File[]]
  addStroke: [data: StrokeData]
}>()

const viewportEl = ref<HTMLElement | null>(null)
const imageEl = ref<HTMLImageElement | null>(null)
const viewportSize = reactive({ width: 0, height: 0 })
const naturalSize = reactive({ width: 0, height: 0 })
const zoom = ref(1)
const pan = reactive({ x: 0, y: 0 })
const imageError = ref(false)

const pointers = new Map<number, { x: number; y: number }>()
let panStart: { x: number; y: number; panX: number; panY: number } | null = null
let pinchStartDistance = 0
let pinchStartZoom = 1

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const imageUrl = computed(() =>
  props.currentPage ? `${props.backendOrigin}/api/pages/${props.currentPage.id}/image` : '',
)

const imageReady = computed(() => naturalSize.width > 0 && naturalSize.height > 0)

const fitScale = computed(() => {
  if (!naturalSize.width || !naturalSize.height || !viewportSize.width || !viewportSize.height) {
    return 1
  }

  const padding = 32

  return Math.min(
    (viewportSize.width - padding) / naturalSize.width,
    (viewportSize.height - padding) / naturalSize.height,
  )
})

const displayWidth = computed(() => Math.max(1, Math.round(naturalSize.width * fitScale.value)))
const displayHeight = computed(() => Math.max(1, Math.round(naturalSize.height * fitScale.value)))

const transformStyle = computed(() => ({
  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom.value})`,
  transition: pointers.size ? 'none' : 'transform 120ms ease-out',
}))

const resetView = () => {
  zoom.value = 1
  pan.x = 0
  pan.y = 0
  naturalSize.width = 0
  naturalSize.height = 0
  imageError.value = false
}

watch(viewportEl, (el, _previous, onCleanup) => {
  if (!el) {
    return
  }

  viewportSize.width = el.clientWidth
  viewportSize.height = el.clientHeight

  const observer = new ResizeObserver(() => {
    viewportSize.width = el.clientWidth
    viewportSize.height = el.clientHeight
  })

  observer.observe(el)
  onCleanup(() => observer.disconnect())
})

const onImageLoad = (event: Event) => {
  const image = event.target as HTMLImageElement
  naturalSize.width = image.naturalWidth
  naturalSize.height = image.naturalHeight
  imageError.value = false
}

const onImageError = () => {
  imageError.value = true
}

const syncNaturalSize = () => {
  const image = imageEl.value

  if (image && image.complete && image.naturalWidth > 0) {
    naturalSize.width = image.naturalWidth
    naturalSize.height = image.naturalHeight
    imageError.value = false
  }
}

onMounted(syncNaturalSize)

watch(
  () => props.currentPage?.id,
  async () => {
    resetView()
    await nextTick()
    syncNaturalSize()
  },
)

const onWheel = (event: WheelEvent) => {
  zoom.value = clamp(zoom.value * (event.deltaY < 0 ? 1.1 : 1 / 1.1), 0.2, 8)
}

const onPointerDown = (event: PointerEvent) => {
  if (props.drawingEnabled) {
    return
  }

  viewportEl.value?.setPointerCapture(event.pointerId)
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })

  if (pointers.size === 1) {
    panStart = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y }
  } else if (pointers.size === 2) {
    const [first, second] = [...pointers.values()]
    pinchStartDistance = Math.hypot(first.x - second.x, first.y - second.y)
    pinchStartZoom = zoom.value
    panStart = null
  }
}

const onPointerMove = (event: PointerEvent) => {
  if (!pointers.has(event.pointerId)) {
    return
  }

  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })

  if (pointers.size === 2) {
    const [first, second] = [...pointers.values()]
    const distance = Math.hypot(first.x - second.x, first.y - second.y)

    if (pinchStartDistance > 0) {
      zoom.value = clamp(pinchStartZoom * (distance / pinchStartDistance), 0.2, 8)
    }
  } else if (pointers.size === 1 && panStart) {
    pan.x = panStart.panX + (event.clientX - panStart.x)
    pan.y = panStart.panY + (event.clientY - panStart.y)
  }
}

const onPointerUp = (event: PointerEvent) => {
  pointers.delete(event.pointerId)

  if (pointers.size === 0) {
    panStart = null
    pinchStartDistance = 0
  }
}

const onDrop = (event: DragEvent) => {
  const files = Array.from(event.dataTransfer?.files ?? []).filter((file) =>
    file.type.startsWith('image/'),
  )

  if (files.length) {
    emit('upload', files)
  }
}
</script>
