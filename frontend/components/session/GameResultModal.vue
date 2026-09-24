<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" @click.self="emit('close')">
    <div class="flex max-h-[90%] w-full max-w-lg flex-col rounded-lg bg-gray-800 p-5 shadow-xl">
      <div class="flex items-center justify-between">
        <h3 class="text-base font-semibold text-gray-100">
          Результат игры
        </h3>
        <button
          type="button"
          class="text-sm text-gray-400 transition-colors hover:text-gray-200"
          @click="emit('close')"
        >
          Закрыть
        </button>
      </div>

      <p v-if="task" class="mt-2 text-sm text-gray-400">
        Правильных ответов: {{ correctCount }} из {{ task.words.length }}
      </p>

      <div class="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto">
        <p v-if="loading" class="py-8 text-center text-sm text-gray-500">
          Загрузка…
        </p>
        <p v-else-if="!task" class="py-8 text-center text-sm text-gray-500">
          Результат не найден.
        </p>
        <div
          v-for="word in task?.words"
          v-else
          :key="word.id"
          class="rounded-md bg-gray-900/50 px-3 py-2"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="text-sm text-gray-100">{{ word.word }}</span>
            <span
              class="rounded-full px-2 py-0.5 text-xs font-medium"
              :class="answerClass(word.id)"
            >
              {{ answerLabel(word.id) }}
            </span>
          </div>
          <div class="mt-1 flex items-center gap-2 text-sm">
            <span class="text-gray-400">{{ answerValue(word.id) }}</span>
            <span class="text-gray-500">→</span>
            <span class="text-gray-200">{{ word.answer }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
type AttemptStatus = 'ACTIVE' | 'SUBMITTED' | 'CHECKED'

type GameTask = {
  attempt: { id: string; taskType: number; status: AttemptStatus }
  words: { id: string; word: string; answer?: string; hint?: string }[]
  options: string[]
  answers: { wordId: string; value: string; correct?: boolean }[]
}

const props = defineProps<{
  gameId: string
  attemptId: string
}>()

const emit = defineEmits<{ close: [] }>()

const task = ref<GameTask | null>(null)
const loading = ref(true)

const requestHeaders = import.meta.server ? useRequestHeaders(['cookie']) : undefined

const correctCount = computed(
  () => task.value?.answers.filter((answer) => answer.correct).length ?? 0,
)

const answerValue = (wordId: string) =>
  task.value?.answers.find((item) => item.wordId === wordId)?.value ?? ''

const answerLabel = (wordId: string) => {
  const answer = task.value?.answers.find((item) => item.wordId === wordId)
  return answer?.correct ? 'Верно' : 'Неверно'
}

const answerClass = (wordId: string) => {
  const answer = task.value?.answers.find((item) => item.wordId === wordId)
  return answer?.correct
    ? 'bg-green-600/20 text-green-300'
    : 'bg-red-600/20 text-red-300'
}

const load = async () => {
  loading.value = true

  try {
    const data = await $fetch<GameTask>(`/api/games/${props.gameId}/attempts/${props.attemptId}`, {
      headers: requestHeaders,
      ignoreResponseError: true,
    })

    task.value = data && data.attempt ? data : null
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void load()
})
</script>
