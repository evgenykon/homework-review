<template>
  <div class="app-card space-y-3">
    <div class="flex items-center justify-between gap-2">
      <h2 class="text-lg font-semibold text-gray-100">
        Расписание на завтра
      </h2>
      <button
        v-if="isParent"
        type="button"
        class="shrink-0 text-sm text-primary-400 transition-colors hover:text-primary-300"
        @click="openEditor"
      >
        Редактировать
      </button>
    </div>

    <div>
      <p class="text-sm text-gray-400">
        {{ tomorrowLabel }}
      </p>
      <p v-if="tomorrowContent.length" class="mt-1 whitespace-pre-wrap break-words text-sm text-gray-100">
        {{ tomorrowContent.join('\n') }}
      </p>
      <p v-else class="mt-1 text-sm text-gray-500">
        Уроков нет.
      </p>
    </div>

    <div
      v-if="editorOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/5 px-4"
      @click.self="editorOpen = false"
    >
      <div class="w-full max-w-lg rounded-lg bg-gray-800 p-5 shadow-xl">
        <h3 class="text-base font-semibold text-gray-100">
          Расписание недели
        </h3>

        <!-- Листалка дней недели -->
        <div class="mt-4 flex items-center gap-1">
          <button
            type="button"
            class="shrink-0 rounded-md px-2 py-1.5 text-sm text-gray-400 transition-colors hover:bg-white/5"
            @click="prevDay"
          >
            ‹
          </button>
          <div class="flex flex-1 gap-1">
            <button
              v-for="(label, index) in dayShort"
              :key="index"
              type="button"
              class="flex-1 rounded-md px-1 py-1.5 text-xs font-medium transition-colors"
              :class="selectedDay === index
                ? 'bg-primary-600 text-white'
                : 'bg-gray-900 text-gray-400 hover:text-gray-200'"
              @click="selectedDay = index"
            >
              {{ label }}
            </button>
          </div>
          <button
            type="button"
            class="shrink-0 rounded-md px-2 py-1.5 text-sm text-gray-400 transition-colors hover:bg-white/5"
            @click="nextDay"
          >
            ›
          </button>
        </div>

        <p class="mt-3 text-xs font-medium text-gray-400">
          {{ dayLabels[selectedDay] }}
        </p>

        <div class="mt-2 space-y-2">
          <label v-for="lessonIndex in 7" :key="lessonIndex" class="block">
            <span class="mb-1 block text-xs text-gray-500">
              {{ lessonIndex }} урок
            </span>
            <input
              v-model="draftDays[selectedDay][lessonIndex - 1]"
              type="text"
              class="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 outline-none focus:border-primary-500"
              placeholder="Например: Математика 15:00"
            >
          </label>
        </div>

        <div class="mt-5 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-md px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-white/5"
            @click="editorOpen = false"
          >
            Отмена
          </button>
          <button
            type="button"
            class="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
            :disabled="saving"
            @click="save"
          >
            {{ saving ? 'Сохраняем…' : 'Сохранить' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ isParent: boolean }>()

const dayLabels = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье']
const dayShort = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

const requestHeaders = import.meta.server ? useRequestHeaders(['cookie']) : undefined

const days = ref<string[][]>(Array.from({ length: 7 }, () => Array(7).fill('')))
const draftDays = ref<string[][]>(Array.from({ length: 7 }, () => Array(7).fill('')))
const editorOpen = ref(false)
const saving = ref(false)
const selectedDay = ref(0)

const tomorrowIndex = computed(() => {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return (tomorrow.getDay() + 6) % 7
})

const tomorrowLabel = computed(() => `Завтра, ${dayLabels[tomorrowIndex.value]}`)

const tomorrowContent = computed(() => days.value[tomorrowIndex.value]?.filter((lesson) => lesson.trim()) ?? [])

const prevDay = () => {
  selectedDay.value = (selectedDay.value + 6) % 7
}

const nextDay = () => {
  selectedDay.value = (selectedDay.value + 1) % 7
}

const openEditor = () => {
  draftDays.value = days.value.map((day) => [...day])
  selectedDay.value = tomorrowIndex.value
  editorOpen.value = true
}

const save = async () => {
  saving.value = true

  try {
    const updated = await $fetch<{ days: string[][] }>('/api/schedule', {
      method: 'PUT',
      body: { days: draftDays.value },
      headers: requestHeaders,
    })
    days.value = updated.days.map((day) => [...day])
    editorOpen.value = false
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  const data = await $fetch<{ days: string[][] }>('/api/schedule', {
    headers: requestHeaders,
    ignoreResponseError: true,
  })
  if (Array.isArray(data?.days)) {
    days.value = data.days.map((day) => (Array.isArray(day) ? day : Array(7).fill('')))
  }
})
</script>
