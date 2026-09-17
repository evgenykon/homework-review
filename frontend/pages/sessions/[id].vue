<template>
  <div class="flex h-full min-h-0 flex-col">
    <header class="flex h-14 shrink-0 items-center gap-3 border-b border-gray-800 px-4">
      <NuxtLink
        to="/dashboard"
        class="shrink-0 text-sm text-gray-400 transition-colors hover:text-gray-200"
      >
        Назад
      </NuxtLink>

      <div class="flex min-w-0 flex-1 items-center justify-center gap-2">
        <span class="truncate text-sm font-medium text-gray-200">
          {{ session?.name ?? 'Комната' }}
        </span>
        <span
          v-if="session"
          class="shrink-0 rounded-full px-2 py-0.5 text-xs"
          :class="statusClass"
        >
          {{ statusLabel }}
        </span>
      </div>

      <span class="w-10 shrink-0" />
    </header>

    <div class="flex min-h-0 flex-1">
      <div class="flex min-h-0 flex-1 flex-col">
        <Whiteboard
          :current-page="currentPage"
          :drawing-enabled="drawingEnabled"
          :draw-color="drawColor"
          :draw-mode="drawMode"
          :backend-origin="backendOrigin"
          @pick-files="fileInput?.click()"
          @capture="cameraInput?.click()"
          @upload="uploadPages"
          @add-stroke="onStroke"
        />

        <DrawingToolbar
          v-if="drawingEnabled"
          :selected-color="drawColor"
          :mode="drawMode"
          :can-undo="canUndo"
          @select-color="selectColor"
          @toggle-eraser="toggleEraser"
          @undo="undo"
        />

        <MediaToolbar
          :pages="pages"
          :current-page-id="currentPageId"
          :drawing-enabled="drawingEnabled"
          :can-review="user?.type === 'parent'"
          :backend-origin="backendOrigin"
          @pick-files="fileInput?.click()"
          @capture="cameraInput?.click()"
          @toggle-drawing="drawingEnabled = !drawingEnabled"
          @select-page="selectPage"
          @delete-page="deletePage"
          @toggle-chat="chatOpen = true"
          @review="reviewOpen = true"
        />
      </div>

      <aside class="hidden w-96 shrink-0 flex-col border-l border-gray-800 lg:flex">
        <RoomChat
          :messages="messages"
          :connected="connected"
          :current-user-id="user?.id"
          @send="sendMessage"
        />
      </aside>
    </div>

    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      multiple
      class="hidden"
      @change="onFileChange"
    >
    <input
      ref="cameraInput"
      type="file"
      accept="image/*"
      capture="environment"
      class="hidden"
      @change="onFileChange"
    >

    <ChatDrawer
      :open="chatOpen"
      :messages="messages"
      :connected="connected"
      :current-user-id="user?.id"
      @close="chatOpen = false"
      @send="sendMessage"
    />

    <div
      v-if="reviewOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      @click.self="reviewOpen = false"
    >
      <div class="w-full max-w-sm rounded-lg bg-gray-800 p-6 shadow-xl">
        <h3 class="text-lg font-semibold text-gray-100">
          Review
        </h3>
        <p class="mt-1 text-sm text-gray-400">
          Выберите результат проверки.
        </p>
        <div class="mt-5 flex flex-col gap-2">
          <button
            type="button"
            class="w-full rounded-md bg-yellow-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-yellow-500 disabled:opacity-60"
            :disabled="reviewing"
            @click="submitReview('REVIEWED')"
          >
            Есть замечания
          </button>
          <button
            type="button"
            class="w-full rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-500 disabled:opacity-60"
            :disabled="reviewing"
            @click="submitReview('APPROVED')"
          >
            Одобрено
          </button>
          <button
            type="button"
            class="mt-1 text-sm text-gray-400 transition-colors hover:text-gray-200"
            @click="reviewOpen = false"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { StrokeData } from '~/composables/useRoom'

definePageMeta({ middleware: 'auth', layout: 'session' })

const route = useRoute()
const sessionId = route.params.id as string

const {
  user,
  session,
  messages,
  pages,
  currentPage,
  currentPageId,
  connected,
  load,
  connect,
  sendMessage,
  uploadPages,
  deletePage,
  addStroke,
  undoLastStroke,
  review,
} = useRoom(sessionId)

await load()

const config = useRuntimeConfig()
const backendOrigin = config.public.backendOrigin

const drawingEnabled = ref(false)
const drawColor = ref('#000000')
const drawMode = ref<'draw' | 'erase'>('draw')
const chatOpen = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const cameraInput = ref<HTMLInputElement | null>(null)

const canUndo = computed(() => (currentPage.value?.strokes.length ?? 0) > 0)

const statusLabel = computed(() =>
  session.value ? reviewStatusLabels[session.value.status] : '',
)
const statusClass = computed(() =>
  session.value ? reviewStatusClasses[session.value.status] : '',
)

const reviewOpen = ref(false)
const reviewing = ref(false)

const submitReview = async (result: 'REVIEWED' | 'APPROVED') => {
  reviewing.value = true

  try {
    await review(result)
    reviewOpen.value = false
  } finally {
    reviewing.value = false
  }
}

onMounted(connect)

const selectColor = (color: string) => {
  drawColor.value = color
  drawMode.value = 'draw'
}

const toggleEraser = () => {
  drawMode.value = drawMode.value === 'erase' ? 'draw' : 'erase'
}

const undo = async () => {
  if (currentPage.value) {
    await undoLastStroke(currentPage.value.id)
  }
}

const onFileChange = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''

  if (files.length) {
    await uploadPages(files)
  }
}

const onStroke = async (data: StrokeData) => {
  if (currentPage.value) {
    await addStroke(currentPage.value.id, data)
  }
}

const selectPage = (id: string) => {
  currentPageId.value = id
}

useHead({ title: computed(() => session.value?.name ?? 'Комната') })
</script>
