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
        <span
          v-if="session?.archivedAt"
          class="shrink-0 rounded-full bg-gray-700 px-2 py-0.5 text-xs text-gray-300"
        >
          Архив
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
          :can-delete="user?.type === 'parent'"
          :archived="!!session?.archivedAt"
          :archive-cutoff="archiveCutoff"
          :is-page-fresh="isPageFresh"
          :backend-origin="backendOrigin"
          @pick-files="fileInput?.click()"
          @capture="cameraInput?.click()"
          @toggle-drawing="drawingEnabled = !drawingEnabled"
          @toggle-calculator="calculatorOpen = true"
          @toggle-game="gameOpen = true"
          @select-page="selectPage"
          @delete-page="deletePage"
          @toggle-chat="chatOpen = true"
          @review="reviewOpen = true"
          @remove="deleteOpen = true"
          @restore="doRestore"
        />
      </div>

      <aside class="hidden w-96 shrink-0 flex-col border-l border-gray-800 lg:flex">
        <SessionBooks
          :session-id="sessionId"
          :books="books"
          @open="viewerBook = $event"
          @changed="refreshBooks"
        />
        <div class="min-h-0 flex-1">
          <RoomChat
            :messages="messages"
            :connected="connected"
            :current-user-id="user?.id"
            :archive-cutoff="archiveCutoff"
            @send="sendMessage"
            @open-game-result="openGameResult"
          />
        </div>
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
      :archive-cutoff="archiveCutoff"
      @close="chatOpen = false"
      @send="sendMessage"
      @open-game-result="openGameResult"
    >
      <SessionBooks
        :session-id="sessionId"
        :books="books"
        @open="viewerBook = $event"
        @changed="refreshBooks"
      />
    </ChatDrawer>

    <BookViewer
      :book="viewerBook"
      :backend-origin="backendOrigin"
      @close="viewerBook = null"
    />

    <CalculatorModal v-if="calculatorOpen" @close="calculatorOpen = false" />

    <GameModal
      v-if="gameOpen"
      :session-id="sessionId"
      :is-parent="user?.type === 'parent'"
      :game-version="gameVersion"
      @close="gameOpen = false"
      @open-result="openResult"
    />

    <GameResultModal
      v-if="resultAttemptId"
      :game-id="resultGameId!"
      :attempt-id="resultAttemptId"
      @close="resultAttemptId = null"
    />

    <div
      v-if="reviewOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/5 px-4"
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

    <div
      v-if="deleteOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/5 px-4"
      @click.self="deleteOpen = false"
    >
      <div class="w-full max-w-sm rounded-lg bg-gray-800 p-6 shadow-xl">
        <h3 class="text-lg font-semibold text-gray-100">
          Удалить комнату
        </h3>
        <p class="mt-1 text-sm text-gray-400">
          «Архивировать» — комнату можно будет восстановить. «Удалить навсегда» стирает комнату, сообщения, рисунки и файлы.
        </p>
        <div class="mt-5 flex flex-col gap-2">
          <button
            type="button"
            class="w-full rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
            :disabled="deleting"
            @click="confirmArchive"
          >
            Архивировать
          </button>
          <button
            type="button"
            class="w-full rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500 disabled:opacity-60"
            :disabled="deleting"
            @click="confirmRemove"
          >
            Удалить навсегда
          </button>
          <button
            type="button"
            class="mt-1 text-sm text-gray-400 transition-colors hover:text-gray-200"
            @click="deleteOpen = false"
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
import type { Book } from '~/types/book'

definePageMeta({ middleware: 'auth', layout: 'session' })

const route = useRoute()
const sessionId = route.params.id as string

const {
  user,
  session,
  messages,
  pages,
  books,
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
  archive,
  restore,
  remove,
  markRead,
  refreshBooks,
  isPageFresh,
  markPageSeen,
  gameVersion,
} = useRoom(sessionId)

await load()

const config = useRuntimeConfig()
const backendOrigin = config.public.backendOrigin

const drawingEnabled = ref(false)
const drawColor = ref('#000000')
const drawMode = ref<'draw' | 'erase'>('draw')
const chatOpen = ref(false)
const calculatorOpen = ref(false)
const gameOpen = ref(false)
const viewerBook = ref<Book | null>(null)
const resultGameId = ref<string | null>(null)
const resultAttemptId = ref<string | null>(null)

const openResult = (link: { gameId: string; attemptId: string }) => {
  gameOpen.value = false
  resultGameId.value = link.gameId
  resultAttemptId.value = link.attemptId
}

const openGameResult = (link: { gameId: string; attemptId: string }) => {
  resultGameId.value = link.gameId
  resultAttemptId.value = link.attemptId
}
const fileInput = ref<HTMLInputElement | null>(null)
const cameraInput = ref<HTMLInputElement | null>(null)

// После одобрения старые сообщения и фото прячутся за «Архив».
// Момент одобрения — approvedAt, который сохраняется и после того,
// как ребёнок пришлёт новые фото (статус вернётся в PENDING),
// поэтому архив остаётся архивом.
const archiveCutoff = computed(() => session.value?.approvedAt ?? null)

const canUndo = computed(() => (currentPage.value?.strokes.length ?? 0) > 0)

const statusLabel = computed(() =>
  session.value ? reviewStatusLabels[session.value.status] : '',
)
const statusClass = computed(() =>
  session.value ? reviewStatusClasses[session.value.status] : '',
)

const reviewOpen = ref(false)
const reviewing = ref(false)
const deleteOpen = ref(false)
const deleting = ref(false)

const submitReview = async (result: 'REVIEWED' | 'APPROVED') => {
  reviewing.value = true

  try {
    await review(result)
    reviewOpen.value = false
  } finally {
    reviewing.value = false
  }
}

const confirmArchive = async () => {
  deleting.value = true

  try {
    await archive()
    await navigateTo('/dashboard')
  } finally {
    deleting.value = false
  }
}

const confirmRemove = async () => {
  deleting.value = true

  try {
    await remove()
    await navigateTo('/dashboard')
  } finally {
    deleting.value = false
  }
}

const doRestore = async () => {
  await restore()
}

onMounted(() => {
  connect()
  void markRead()
})

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
  markPageSeen(id)
}

useHead({ title: computed(() => session.value?.name ?? 'Комната') })
</script>
