<template>
  <div class="shrink-0 border-b border-gray-800 p-3">
    <span class="text-xs font-medium uppercase tracking-wide text-gray-500">
      Книги
    </span>

    <ul v-if="books.length" class="mt-2 space-y-1">
      <li v-for="book in books" :key="book.id">
        <button
          type="button"
          class="w-full truncate text-left text-sm text-primary-400 transition-colors hover:text-primary-300"
          @click="emit('open', book)"
        >
          {{ book.title }}
        </button>
      </li>
    </ul>
    <p v-else class="mt-2 text-xs text-gray-500">
      Книг не привязано.
    </p>

    <button
      type="button"
      class="mt-2 text-xs text-gray-400 transition-colors hover:text-gray-200"
      @click="openManage"
    >
      + Добавить
    </button>

    <div
      v-if="manageOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/5 px-4"
      @click.self="manageOpen = false"
    >
      <div class="w-full max-w-md rounded-lg bg-gray-800 p-6 shadow-xl">
        <h3 class="text-lg font-semibold text-gray-100">
          Книги комнаты
        </h3>

        <p v-if="!library.length" class="mt-3 text-sm text-gray-400">
          В библиотеке нет книг.
        </p>

        <ul v-else class="mt-3 max-h-64 space-y-1 overflow-y-auto">
          <li v-for="book in library" :key="book.id">
            <label class="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-white/5">
              <input v-model="selected" type="checkbox" :value="book.id" class="h-4 w-4">
              <span class="truncate text-sm text-gray-200">{{ book.title }}</span>
            </label>
          </li>
        </ul>

        <div class="mt-4 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-md px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-white/5"
            @click="manageOpen = false"
          >
            Отмена
          </button>
          <button
            type="button"
            :disabled="saving"
            class="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
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
import type { Book } from '~/types/book'

const props = defineProps<{
  sessionId: string
  books: Book[]
}>()

const emit = defineEmits<{
  open: [book: Book]
  changed: []
}>()

const manageOpen = ref(false)
const library = ref<Book[]>([])
const selected = ref<string[]>([])
const saving = ref(false)

const openManage = async () => {
  selected.value = props.books.map((book) => book.id)

  const data = await $fetch<Book[]>('/api/books', { ignoreResponseError: true })
  library.value = Array.isArray(data) ? data : []

  manageOpen.value = true
}

const save = async () => {
  saving.value = true

  try {
    await $fetch(`/api/sessions/${props.sessionId}/books`, {
      method: 'PUT',
      body: { bookIds: selected.value },
    })
    manageOpen.value = false
    emit('changed')
  } finally {
    saving.value = false
  }
}
</script>
