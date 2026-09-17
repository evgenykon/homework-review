<template>
  <div class="flex h-full min-h-0 flex-col">
    <header class="flex h-14 shrink-0 items-center justify-between border-b border-gray-800 px-4">
      <NuxtLink
        to="/dashboard"
        class="shrink-0 text-sm text-gray-400 transition-colors hover:text-gray-200"
      >
        Назад
      </NuxtLink>
      <span class="truncate px-4 text-sm font-medium text-gray-200">
        {{ session?.name ?? 'Комната' }}
      </span>
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
          :backend-origin="backendOrigin"
          @pick-files="fileInput?.click()"
          @capture="cameraInput?.click()"
          @toggle-drawing="drawingEnabled = !drawingEnabled"
          @select-page="selectPage"
          @delete-page="deletePage"
          @toggle-chat="chatOpen = true"
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
