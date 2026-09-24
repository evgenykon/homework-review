<template>
  <div class="fixed inset-0 z-50 flex flex-col bg-gray-900">
    <header class="flex h-14 shrink-0 items-center gap-3 border-b border-gray-800 px-4">
      <h2 class="text-base font-semibold text-gray-100">
        Игра «Слова»
      </h2>
      <span class="flex-1" />
      <button
        v-if="view === 'play'"
        type="button"
        class="text-sm text-gray-400 transition-colors hover:text-gray-200"
        @click="backToList"
      >
        Назад
      </button>
      <button
        v-if="view === 'edit'"
        type="button"
        class="text-sm text-gray-400 transition-colors hover:text-gray-200"
        @click="view = 'list'"
      >
        Отмена
      </button>
      <button
        type="button"
        class="text-sm text-gray-400 transition-colors hover:text-gray-200"
        @click="emit('close')"
      >
        Закрыть
      </button>
    </header>

    <div class="min-h-0 flex-1 overflow-y-auto">
      <!-- Список игр -->
      <div v-if="view === 'list'" class="mx-auto max-w-3xl p-6">
        <div v-if="isParent" class="mb-4 flex items-center justify-between">
          <p class="text-sm text-gray-400">
            Игр: {{ games.length }}
          </p>
          <button
            type="button"
            class="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
            @click="openEdit(null)"
          >
            + Создать игру
          </button>
        </div>

        <div v-if="games.length === 0" class="py-16 text-center text-gray-500">
          {{ isParent ? 'Создайте первую игру' : 'Игр пока нет' }}
        </div>

        <div v-else class="flex flex-col gap-3">
          <div
            v-for="game in games"
            :key="game.id"
            class="rounded-lg border border-gray-800 bg-gray-800/50 p-4"
          >
            <div class="flex items-center gap-3">
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-gray-100">
                  {{ game.name }}
                </p>
                <p class="mt-0.5 text-xs text-gray-400">
                  {{ game.wordCount }} слов(а)
                </p>
                <p v-if="game.attempt" class="mt-1 text-xs" :class="attemptStatusClass(game.attempt.status)">
                  {{ attemptStatusLabel(game.attempt.status) }}
                </p>
              </div>

              <div class="flex shrink-0 items-center gap-2">
                <template v-if="isParent">
                  <button
                    type="button"
                    class="rounded-md bg-gray-700 px-3 py-1.5 text-xs font-medium text-gray-100 transition-colors hover:bg-gray-600"
                    @click="openEdit(game)"
                  >
                    Редактировать
                  </button>
                  <button
                    v-if="game.attempt"
                    type="button"
                    class="rounded-md bg-yellow-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-yellow-500"
                    @click="restartGame(game)"
                  >
                    Рестарт
                  </button>
                  <button
                    type="button"
                    class="rounded-md bg-red-600/80 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-600"
                    @click="removeGame(game)"
                  >
                    Удалить
                  </button>
                </template>

                <template v-else>
                  <button
                    v-if="!game.attempt"
                    type="button"
                    class="rounded-md bg-primary-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-700"
                    @click="openPlay(game)"
                  >
                    Начать
                  </button>
                  <button
                    v-else-if="game.attempt.status === 'ACTIVE'"
                    type="button"
                    class="rounded-md bg-primary-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-700"
                    @click="openPlay(game)"
                  >
                    Продолжить
                  </button>
                  <button
                    v-else-if="game.attempt.status === 'CHECKED'"
                    type="button"
                    class="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-500"
                    @click="openPlay(game)"
                  >
                    Результаты
                  </button>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Редактор игры (родитель) -->
      <div v-else-if="view === 'edit'" class="mx-auto max-w-3xl p-6">
        <label class="mb-4 block">
          <span class="mb-1 block text-xs font-medium text-gray-400">Название</span>
          <input
            v-model="draft.name"
            type="text"
            class="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 outline-none focus:border-primary-500"
            placeholder="Например: Словарные слова"
          >
        </label>

        <p class="mb-2 text-xs font-medium text-gray-400">
          Слова и ответы
        </p>
        <div class="flex flex-col gap-2">
          <div
            v-for="(row, index) in draft.words"
            :key="index"
            class="flex items-center gap-2"
          >
            <input
              v-model="row.word"
              type="text"
              class="w-1/2 rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 outline-none focus:border-primary-500"
              placeholder="Слово"
            >
            <input
              v-model="row.answer"
              type="text"
              class="w-1/2 rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 outline-none focus:border-primary-500"
              placeholder="Правильный ответ"
            >
            <button
              type="button"
              class="shrink-0 rounded-md px-2 py-2 text-sm text-gray-400 transition-colors hover:text-red-400"
              @click="removeWordRow(index)"
            >
              ×
            </button>
          </div>
        </div>

        <div class="mt-4 flex items-center gap-2">
          <button
            type="button"
            class="rounded-md bg-gray-700 px-3 py-2 text-sm text-gray-100 transition-colors hover:bg-gray-600"
            @click="addWordRow"
          >
            + Добавить слово
          </button>
          <span class="flex-1" />
          <button
            type="button"
            class="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
            :disabled="!canSaveEdit"
            @click="saveEdit"
          >
            Сохранить
          </button>
        </div>
      </div>

      <!-- Прохождение игры (ребёнок) -->
      <div v-else-if="view === 'play' && task" class="mx-auto flex min-h-full max-w-3xl flex-col p-6">
        <p class="mb-4 text-center text-sm text-gray-400">
          {{ taskName }}
        </p>

        <div
          v-if="task.attempt.status === 'CHECKED'"
          class="flex flex-1 flex-col items-center justify-center gap-4"
        >
          <p class="text-lg font-medium text-gray-100">
            Проверено
          </p>
          <p class="text-sm text-gray-400">
            Правильных ответов: {{ correctCount }} из {{ task.words.length }}
          </p>
          <ul class="w-full max-w-md flex-col gap-1.5">
            <li
              v-for="word in task.words"
              :key="word.id"
              class="flex flex-wrap items-center justify-between gap-2 rounded-md bg-gray-800/50 px-3 py-2 text-sm"
            >
              <span class="text-gray-200">{{ word.word }}</span>
              <span class="flex items-center gap-2">
                <span class="text-gray-400">{{ answerValue(word.id) }}</span>
                <span class="text-gray-500">→</span>
                <span class="text-gray-200">{{ word.answer }}</span>
                <span
                  class="rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="answerCorrectClass(word.id)"
                >
                  {{ answerCorrectLabel(word.id) }}
                </span>
              </span>
            </li>
          </ul>
          <p class="text-sm text-gray-400">
            Родитель может перезапустить игру.
          </p>
        </div>

        <div
          v-else
          class="flex min-h-0 flex-1 flex-col"
        >
          <!-- Тип 4: соединить слова и ответы -->
          <div v-if="task.attempt.taskType === 4" class="flex flex-1 gap-4">
            <div class="flex-1">
              <p class="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                Слова
              </p>
              <div class="flex flex-col gap-2">
                <button
                  v-for="word in task.words"
                  :key="word.id"
                  type="button"
                  class="flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors"
                  :class="selectedWord === word.id
                    ? 'bg-primary-600 text-white'
                    : matchedAnswer(word.id)
                      ? 'bg-green-800 text-white'
                      : 'bg-gray-800 text-gray-100 hover:bg-gray-700'"
                  @click="selectWord(word.id)"
                >
                  <span>{{ word.word }}</span>
                  <span v-if="matchedAnswer(word.id)" class="ml-2 text-xs text-green-100">
                    → {{ matchedAnswer(word.id) }}
                  </span>
                </button>
              </div>
            </div>
            <div class="flex-1">
              <p class="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                Ответы
              </p>
              <div class="flex flex-col gap-2">
                <button
                  v-for="option in task.options"
                  :key="option"
                  type="button"
                  class="flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors"
                  :class="matchedAnswers[option]
                    ? 'bg-green-700 text-white'
                    : 'bg-gray-800 text-gray-100 hover:bg-gray-700'"
                  @click="matchAnswer(option)"
                >
                  <span>{{ option }}</span>
                  <span v-if="matchedWordId(option)" class="ml-2 text-xs text-green-100">
                    → {{ wordName(matchedWordId(option)!) }}
                  </span>
                </button>
              </div>
            </div>
          </div>

          <!-- Тип 5: для каждого ответа указать слово -->
          <div v-else-if="task.attempt.taskType === 5" class="flex flex-1 gap-4">
            <div class="flex-1">
              <p class="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                Ответы
              </p>
              <div class="flex flex-col gap-2">
                <button
                  v-for="option in task.options"
                  :key="option"
                  type="button"
                  class="rounded-md px-3 py-2 text-sm transition-colors"
                  :class="selectedAnswer === option
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-800 text-gray-100 hover:bg-gray-700'"
                  @click="selectedAnswer = option"
                >
                  {{ option }}
                  <span v-if="answerForWord(answerWord[option])" class="ml-2 text-xs text-green-300">
                    → {{ answerForWord(answerWord[option]) }}
                  </span>
                </button>
              </div>
            </div>
            <div class="flex-1">
              <p class="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                Какое это слово?
              </p>
              <div class="flex flex-col gap-2">
                <button
                  v-for="word in task.words"
                  :key="word.id"
                  type="button"
                  class="rounded-md px-3 py-2 text-sm transition-colors"
                  :class="wordUsedByAnswer(word.id)
                    ? 'bg-green-800 text-white'
                    : 'bg-gray-800 text-gray-100 hover:bg-gray-700'"
                  @click="assignAnswerToWord(word.id)"
                >
                  {{ word.word }}
                </button>
              </div>
            </div>
          </div>

          <!-- Типы 1-3: по одному слову -->
          <template v-else>
            <div class="flex flex-1 flex-col items-center justify-center gap-6">
              <p class="text-sm text-gray-400">
                {{ currentIndex + 1 }} / {{ task.words.length }}
              </p>
              <p class="text-3xl font-semibold text-gray-100">
                {{ currentWord?.word }}
              </p>
              <p
                v-if="task.attempt.taskType === 2 && currentWord?.hint"
                class="rounded-md bg-gray-800/60 px-4 py-2 text-xl tracking-[0.35em] text-gray-300"
              >
                {{ currentWord.hint }}
              </p>

              <template v-if="task.attempt.taskType === 3">
                <div class="flex max-w-sm flex-wrap justify-center gap-2">
                  <button
                    v-for="option in task.options"
                    :key="option"
                    type="button"
                    class="rounded-md px-4 py-2 text-sm transition-colors"
                    :class="answers[currentWord!.id] === option
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-800 text-gray-100 hover:bg-gray-700'"
                    @click="setAnswer(currentWord!.id, option)"
                  >
                    {{ option }}
                  </button>
                </div>
              </template>

              <template v-else>
                <input
                  v-model="answerDraft"
                  type="text"
                  class="w-64 rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-center text-lg text-gray-100 outline-none focus:border-primary-500"
                  :disabled="task.attempt.status === 'SUBMITTED'"
                  placeholder="Твой ответ"
                  @keydown.enter="goNext"
                >
              </template>
            </div>
          </template>

          <div class="mt-6 flex items-center justify-center gap-3">
            <button
              v-if="task.attempt.taskType <= 3 && currentIndex > 0"
              type="button"
              class="rounded-md bg-gray-700 px-4 py-2 text-sm text-gray-100 transition-colors hover:bg-gray-600"
              @click="goPrev"
            >
              Назад
            </button>
            <button
              v-if="task.attempt.taskType <= 3 && currentIndex < task.words.length - 1"
              type="button"
              class="rounded-md bg-primary-600 px-4 py-2 text-sm text-white transition-colors hover:bg-primary-700"
              @click="goNext"
            >
              Далее
            </button>
          </div>
        </div>
      </div>

      <div v-else class="py-16 text-center text-gray-500">
        Загрузка…
      </div>
    </div>

    <!-- Фиксированная нижняя панель: всегда видна, не скроллится -->
    <div
      v-if="view === 'play' && task?.attempt.status === 'ACTIVE'"
      class="flex shrink-0 items-center justify-center border-t border-gray-800 bg-gray-900 px-4 py-4"
    >
      <button
        type="button"
        class="rounded-md bg-green-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-500 disabled:opacity-60"
        :disabled="!allAnswered"
        @click="submitAnswers"
      >
        Отправить
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
type AttemptStatus = 'ACTIVE' | 'SUBMITTED' | 'CHECKED'

type GameMeta = {
  id: string
  name: string
  wordCount: number
  createdAt: string
  updatedAt: string
  attempt: { id: string; taskType: number; status: AttemptStatus } | null
}

type GameTask = {
  attempt: { id: string; taskType: number; status: AttemptStatus }
  words: { id: string; word: string; answer?: string; hint?: string }[]
  options: string[]
  answers: { wordId: string; value: string; correct?: boolean }[]
}

type WordRow = { word: string; answer: string }

const props = defineProps<{
  sessionId: string
  isParent: boolean
  gameVersion: number
}>()

const emit = defineEmits<{ close: [] }>()

const games = ref<GameMeta[]>([])
const view = ref<'list' | 'edit' | 'play'>('list')
const loading = ref(false)

const draft = ref<{ id: string | null; name: string; words: WordRow[] }>({
  id: null,
  name: '',
  words: [],
})

const activeGame = ref<GameMeta | null>(null)
const task = ref<GameTask | null>(null)

const answers = ref<Record<string, string>>({})
const answerDraft = ref('')
const currentIndex = ref(0)
const selectedWord = ref<string | null>(null)
const selectedAnswer = ref<string | null>(null)
const matchedAnswers = ref<Record<string, string>>({})
const answerWord = ref<Record<string, string>>({})

const requestHeaders = import.meta.server ? useRequestHeaders(['cookie']) : undefined

const taskName = computed(() => {
  switch (task.value?.attempt.taskType) {
    case 1:
      return 'Задание 1. Впиши ответ (самое сложное)'
    case 2:
      return 'Задание 2. Слово с пропущенными буквами'
    case 3:
      return 'Задание 3. Выбери правильный ответ'
    case 4:
      return 'Задание 4. Соедини слово и ответ'
    case 5:
      return 'Задание 5. Укажи, к какому слову относится ответ'
    default:
      return ''
  }
})

const currentWord = computed(() => task.value?.words[currentIndex.value] ?? null)

const canSaveEdit = computed(
  () =>
    draft.value.name.trim() !== '' &&
    draft.value.words.length > 0 &&
    draft.value.words.every((row) => row.word.trim() !== '' && row.answer.trim() !== ''),
)

const allAnswered = computed(() => {
  if (!task.value) {
    return false
  }

  const type = task.value.attempt.taskType

  if (type === 4) {
    return task.value.words.every((word) => Object.values(matchedAnswers.value).includes(word.id))
  }

  if (type === 5) {
    return task.value.options.every((option) => answerWord.value[option])
  }

  return task.value.words.every((word) => answers.value[word.id]?.trim())
})

const correctCount = computed(
  () => task.value?.answers.filter((answer) => answer.correct).length ?? 0,
)

const answerValue = (wordId: string) => {
  const answer = task.value?.answers.find((item) => item.wordId === wordId)
  return answer?.value ?? ''
}

const answerCorrectLabel = (wordId: string) => {
  const answer = task.value?.answers.find((item) => item.wordId === wordId)
  return answer?.correct ? 'Верно' : 'Неверно'
}

const answerCorrectClass = (wordId: string) => {
  const answer = task.value?.answers.find((item) => item.wordId === wordId)
  return answer?.correct
    ? 'bg-green-600/20 text-green-300'
    : 'bg-red-600/20 text-red-300'
}

const answerForWord = (wordId: string | undefined) => {
  if (!wordId) {
    return ''
  }
  return task.value?.words.find((word) => word.id === wordId)?.word ?? ''
}

const wordUsedByAnswer = (wordId: string) =>
  Object.values(answerWord.value).includes(wordId)

const matchedWordId = (option: string) => matchedAnswers.value[option] ?? undefined

const matchedAnswer = (wordId: string) =>
  task.value?.options.find((option) => matchedAnswers.value[option] === wordId)

const wordName = (wordId: string) =>
  task.value?.words.find((word) => word.id === wordId)?.word ?? ''

const attemptStatusLabel = (status: AttemptStatus) => {
  switch (status) {
    case 'ACTIVE':
      return 'В процессе'
    case 'SUBMITTED':
      return 'Отправлено на проверку'
    case 'CHECKED':
      return 'Проверено'
  }
}

const attemptStatusClass = (status: AttemptStatus) => {
  switch (status) {
    case 'ACTIVE':
      return 'text-blue-300'
    case 'SUBMITTED':
      return 'text-yellow-300'
    case 'CHECKED':
      return 'text-green-300'
  }
}

const load = async () => {
  loading.value = true

  try {
    const data = await $fetch<GameMeta[]>(`/api/sessions/${props.sessionId}/games`, {
      headers: requestHeaders,
      ignoreResponseError: true,
    })

    games.value = Array.isArray(data) ? data : []
  } finally {
    loading.value = false
  }
}

const openEdit = (game: GameMeta | null) => {
  if (game) {
    draft.value = { id: game.id, name: game.name, words: [] }
    void loadWords(game.id)
  } else {
    draft.value = { id: null, name: '', words: [{ word: '', answer: '' }] }
  }

  view.value = 'edit'
}

const loadWords = async (gameId: string) => {
  const data = await $fetch<{ id: string; name: string; words: { id: string; word: string; answer: string }[] }>(
    `/api/games/${gameId}`,
    { headers: requestHeaders, ignoreResponseError: true },
  )

  if (data?.words) {
    draft.value = {
      id: data.id,
      name: data.name,
      words: data.words.map((row) => ({ word: row.word, answer: row.answer })),
    }
  }
}

const addWordRow = () => {
  draft.value.words.push({ word: '', answer: '' })
}

const removeWordRow = (index: number) => {
  draft.value.words.splice(index, 1)
}

const saveEdit = async () => {
  const payload = {
    name: draft.value.name,
    words: draft.value.words,
  }

  if (draft.value.id) {
    await $fetch(`/api/games/${draft.value.id}`, {
      method: 'PUT',
      body: payload,
      headers: requestHeaders,
    })
  } else {
    await $fetch(`/api/sessions/${props.sessionId}/games`, {
      method: 'POST',
      body: payload,
      headers: requestHeaders,
    })
  }

  view.value = 'list'
  await load()
}

const removeGame = async (game: GameMeta) => {
  await $fetch(`/api/games/${game.id}`, { method: 'DELETE', headers: requestHeaders })
  await load()
}

const restartGame = async (game: GameMeta) => {
  await $fetch(`/api/games/${game.id}/restart`, {
    method: 'POST',
    headers: requestHeaders,
  })
  await load()
}

const openPlay = async (game: GameMeta) => {
  activeGame.value = game
  view.value = 'play'
  task.value = null

  const existing = await $fetch<GameTask | null>(`/api/games/${game.id}/attempt`, {
    headers: requestHeaders,
    ignoreResponseError: true,
  })

  if (existing?.attempt) {
    applyTask(existing)
  } else {
    const started = await $fetch<GameTask>(`/api/games/${game.id}/attempts`, {
      method: 'POST',
      headers: requestHeaders,
    })
    applyTask(started)
  }
}

const applyTask = (data: GameTask) => {
  task.value = data
  answers.value = {}
  answerDraft.value = ''
  currentIndex.value = 0
  selectedWord.value = null
  selectedAnswer.value = null
  matchedAnswers.value = {}
  answerWord.value = {}
}

const backToList = () => {
  view.value = 'list'
  task.value = null
  activeGame.value = null
}

const setAnswer = (wordId: string, value: string) => {
  answers.value = { ...answers.value, [wordId]: value }
}

const goNext = () => {
  if (currentWord.value && !answers.value[currentWord.value.id]) {
    answers.value = { ...answers.value, [currentWord.value.id]: answerDraft.value }
  }

  if (currentIndex.value < task.value!.words.length - 1) {
    currentIndex.value++
    answerDraft.value = ''
  }
}

const goPrev = () => {
  if (currentIndex.value > 0) {
    currentIndex.value--
    answerDraft.value = answers.value[currentWord.value?.id ?? ''] ?? ''
  }
}

const selectWord = (wordId: string) => {
  selectedWord.value = wordId
}

const matchAnswer = (option: string) => {
  if (selectedWord.value) {
    matchedAnswers.value = { ...matchedAnswers.value, [option]: selectedWord.value }
    selectedWord.value = null
  }
}

const assignAnswerToWord = (wordId: string) => {
  if (selectedAnswer.value) {
    answerWord.value = { ...answerWord.value, [selectedAnswer.value]: wordId }
    selectedAnswer.value = null
  }
}

const buildAnswers = () => {
  if (!task.value) {
    return []
  }

  const type = task.value.attempt.taskType

  if (type === 4) {
    return task.value.options
      .filter((option) => matchedAnswers.value[option])
      .map((option) => ({ wordId: matchedAnswers.value[option], value: option }))
  }

  if (type === 5) {
    return task.value.options
      .filter((option) => answerWord.value[option])
      .map((option) => ({ wordId: answerWord.value[option], value: option }))
  }

  return task.value.words.map((word) => ({
    wordId: word.id,
    value: answers.value[word.id] ?? '',
  }))
}

const submitAnswers = async () => {
  if (!activeGame.value) {
    return
  }

  const updated = await $fetch<GameTask>(`/api/games/${activeGame.value.id}/attempt`, {
    method: 'POST',
    body: { answers: buildAnswers() },
    headers: requestHeaders,
  })

  task.value = updated
  await load()

  // После отправки ответов закрываем модалку — в чате появится системное
  // сообщение о том, что ответ отправлен на проверку.
  emit('close')
}

watch(
  () => props.gameVersion,
  async () => {
    if (view.value === 'list') {
      await load()
    } else if (view.value === 'play' && activeGame.value) {
      // Родитель мог изменить игру — сбрасываем попытку ребёнка.
      await openPlay(activeGame.value)
    }
  },
)

onMounted(() => {
  void load()
})
</script>
