<template>
  <canvas
    ref="canvasEl"
    class="absolute inset-0 touch-none"
    :class="enabled ? 'cursor-crosshair' : 'pointer-events-none'"
    :style="{ width: `${width}px`, height: `${height}px` }"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
  />
</template>

<script setup lang="ts">
import type { StrokeData, StrokePoint } from '~/composables/useRoom'

const props = withDefaults(
  defineProps<{
    strokes: StrokeData[]
    enabled: boolean
    width: number
    height: number
    color?: string
    lineWidth?: number
    mode?: 'draw' | 'erase'
  }>(),
  {
    color: '#ef4444',
    lineWidth: 3,
    mode: 'draw',
  },
)

const emit = defineEmits<{ strokeEnd: [data: StrokeData] }>()

const canvasEl = ref<HTMLCanvasElement | null>(null)
const current = ref<StrokePoint[]>([])
const drawing = ref(false)

const setupCanvas = () => {
  const canvas = canvasEl.value

  if (!canvas) {
    return
  }

  const dpr = window.devicePixelRatio || 1
  canvas.width = Math.max(1, Math.round(props.width * dpr))
  canvas.height = Math.max(1, Math.round(props.height * dpr))

  const context = canvas.getContext('2d')
  context?.setTransform(dpr, 0, 0, dpr, 0, 0)
}

const drawStroke = (
  context: CanvasRenderingContext2D,
  points: StrokePoint[],
  color: string,
  lineWidth: number,
  mode: 'draw' | 'erase',
) => {
  if (points.length === 0) {
    return
  }

  context.globalCompositeOperation = mode === 'erase' ? 'destination-out' : 'source-over'
  context.strokeStyle = mode === 'erase' ? '#000000' : color
  context.lineWidth = lineWidth
  context.lineCap = 'round'
  context.lineJoin = 'round'
  context.beginPath()

  points.forEach((point, index) => {
    const x = point.x * props.width
    const y = point.y * props.height

    if (index === 0) {
      context.moveTo(x, y)
    } else {
      context.lineTo(x, y)
    }
  })

  context.stroke()
}

const redraw = () => {
  const context = canvasEl.value?.getContext('2d')

  if (!context) {
    return
  }

  context.globalCompositeOperation = 'source-over'
  context.clearRect(0, 0, props.width, props.height)

  for (const stroke of props.strokes) {
    drawStroke(context, stroke.points, stroke.color, stroke.width, stroke.mode ?? 'draw')
  }

  drawStroke(context, current.value, props.color, props.lineWidth, props.mode)
  context.globalCompositeOperation = 'source-over'
}

const pointFromEvent = (event: PointerEvent): StrokePoint | null => {
  const canvas = canvasEl.value

  if (!canvas) {
    return null
  }

  const rect = canvas.getBoundingClientRect()

  if (rect.width === 0 || rect.height === 0) {
    return null
  }

  return {
    x: (event.clientX - rect.left) / rect.width,
    y: (event.clientY - rect.top) / rect.height,
  }
}

const onPointerDown = (event: PointerEvent) => {
  if (!props.enabled) {
    return
  }

  const point = pointFromEvent(event)

  if (!point) {
    return
  }

  drawing.value = true
  current.value = [point]
  canvasEl.value?.setPointerCapture(event.pointerId)
  redraw()
}

const onPointerMove = (event: PointerEvent) => {
  if (!drawing.value) {
    return
  }

  const point = pointFromEvent(event)

  if (!point) {
    return
  }

  current.value.push(point)
  redraw()
}

const onPointerUp = () => {
  if (!drawing.value) {
    return
  }

  drawing.value = false

  if (current.value.length > 1) {
    emit('strokeEnd', {
      points: [...current.value],
      color: props.color,
      width: props.lineWidth,
      mode: props.mode,
    })
  }

  current.value = []
  redraw()
}

watch(
  [() => props.strokes, () => props.width, () => props.height],
  async () => {
    await nextTick()
    setupCanvas()
    redraw()
  },
  { deep: true, immediate: true },
)

onMounted(() => {
  setupCanvas()
  redraw()
})
</script>
