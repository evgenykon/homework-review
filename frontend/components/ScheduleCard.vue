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
      <p v-if="tomorrowContent" class="mt-1 whitespace-pre-wrap break-words text-sm text-gray-100">
        {{ tomorrowContent }}
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
      <div class="w-full max-w-md rounded-lg bg-gray-800 p-5 shadow-xl">
        <h3 class="text-base font-semibold text-gray-100">
          Расписание недели
        </h3>
        <div class="mt-4 max-h-[60vh] space-y-2 overflow-y-auto">
          <label v-for="(label, index) in dayLabels" :key="index" class="block">
            <span class="mb-1 block text-xs font-medium text-gray-400">
              {{ label }}
            </span>
            <input
              v-model="draftDays[index]"
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

const days = ref<string[]>(Array(7).fill(''))
const editorOpen = ref(false)
const saving = ref(false)
const draftDays = ref<string[]>(Array(7).fill(''))

const tomorrowIndex = computed(() => {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return (tomorrow.getDay() + 6) % 7
})

const tomorrowLabel = computed(() => `Завтра, ${dayLabels[tomorrowIndex.value]}`)

const tomorrowContent = computed(() => days.value[tomorrowIndex.value]?.trim() ?? '')

const openEditor = () => {
  draftDays.value = [...days.value]
  editorOpen.value = true
}

const save = async () => {
  saving.value = true

  try {
    const updated = await $fetch<{ days: string[] }>('/api/schedule', {
      method: 'PUT',
      body: { days: draftDays.value },
      headers: requestHeaders,
    })
    days.value = updated.days
    editorOpen.value = false
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  const data = await $fetch<{ days: string[] }>('/api/schedule', {
    headers: requestHeaders,
    ignoreResponseError: true,
  })
  if (data?.days) {
    days.value = data.days
  }
})
</script>
