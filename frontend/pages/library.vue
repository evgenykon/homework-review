<template>
  <section class="space-y-6">
    <div class="flex items-center justify-between gap-3">
      <h1 class="text-3xl font-bold text-gray-100">
        Библиотека
      </h1>
      <div class="flex shrink-0 items-center gap-3">
        <button
          type="button"
          class="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
          @click="openAdd"
        >
          Добавить
        </button>
        <NuxtLink
          to="/dashboard"
          class="text-sm text-gray-400 transition-colors hover:text-gray-200"
        >
          Назад
        </NuxtLink>
      </div>
    </div>

    <div class="app-card max-w-2xl space-y-3">
      <p v-if="!books.length" class="text-sm text-gray-400">
        Книг пока нет.
      </p>

      <ul v-else class="space-y-1">
        <li
          v-for="book in books"
          :key="book.id"
          class="flex items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-white/5"
        >
          <div class="min-w-0 flex-1">
            <p class="truncate text-gray-100">
              {{ book.title }}
            </p>
            <p class="text-xs text-gray-500">
              <ClientOnly>{{ formatDate(book.createdAt) }}</ClientOnly> · {{ formatSize(book.size) }}
            </p>
          </div>

          <button
            type="button"
            class="shrink-0 rounded-md border border-gray-600 px-3 py-1.5 text-sm text-gray-200 transition-colors hover:bg-white/5"
            @click="viewerBook = book"
          >
            Открыть
          </button>

          <button
            type="button"
            class="shrink-0 rounded-md border border-red-500/60 px-3 py-1.5 text-sm text-red-300 transition-colors hover:bg-red-500/10 disabled:opacity-60"
            :disabled="removingId === book.id"
            @click="removeBook(book.id)"
          >
            Удалить
          </button>
        </li>
      </ul>
    </div>

    <BookViewer
      :book="viewerBook"
      :backend-origin="backendOrigin"
      @close="viewerBook = null"
    />

    <div
      v-if="addOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/5 px-4"
      @click.self="closeAdd"
    >
      <div class="w-full max-w-md rounded-lg bg-gray-800 p-6 shadow-xl">
        <h3 class="text-lg font-semibold text-gray-100">
          Добавить книгу
        </h3>

        <form class="mt-4 space-y-4" @submit.prevent="submit">
          <input
            v-model="title"
            type="text"
            required
            placeholder="Название книги"
            class="w-full rounded-md border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-gray-200"
          >

          <div
            class="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-colors"
            :class="dragging ? 'border-primary-500' : 'border-gray-600'"
            @click="fileInput?.click()"
            @dragover.prevent="dragging = true"
            @dragleave.prevent="dragging = false"
            @drop.prevent="onDrop"
          >
            <p class="text-sm text-gray-300">
              {{ file ? file.name : 'Перетащите файл сюда или нажмите' }}
            </p>
            <p class="mt-1 text-xs text-gray-500">
              PDF или другой документ
            </p>
          </div>

          <input
            ref="fileInput"
            type="file"
            accept=".pdf,application/pdf"
            class="hidden"
            @change="onFileChange"
          >

          <p v-if="error" class="text-sm text-red-400">
            {{ error }}
          </p>

          <div class="flex justify-end gap-2">
            <button
              type="button"
              class="rounded-md px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-white/5"
              @click="closeAdd"
            >
              Отмена
            </button>
            <button
              type="submit"
              :disabled="uploading || !file"
              class="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
            >
              {{ uploading ? 'Загружаем…' : 'Добавить' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { Book } from '~/types/book'

definePageMeta({ middleware: 'auth' })

const config = useRuntimeConfig()
const backendOrigin = config.public.backendOrigin

const { data: books, refresh } = await useFetch('/api/books', {
  headers: useRequestHeaders(['cookie']),
  ignoreResponseError: true,
  transform: (data): Book[] => (Array.isArray(data) ? (data as Book[]) : []),
})

useSessionEvents((type) => {
  if (type === 'library:changed') {
    void refresh()
  }
})

const fileUrl = (id: string) => `${config.public.backendOrigin}/api/books/${id}/file`

const formatSize = (bytes: number) => {
  if (!bytes) {
    return ''
  }

  if (bytes < 1024) {
    return `${bytes} Б`
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} КБ`
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`
}

const addOpen = ref(false)
const viewerBook = ref<Book | null>(null)
const title = ref('')
const file = ref<File | null>(null)
const dragging = ref(false)
const uploading = ref(false)
const error = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const removingId = ref<string | null>(null)

const openAdd = () => {
  title.value = ''
  file.value = null
  error.value = null
  addOpen.value = true
}

const closeAdd = () => {
  addOpen.value = false
}

const setFile = (selected: File | null) => {
  file.value = selected

  if (selected && !title.value) {
    title.value = selected.name.replace(/\.[^.]+$/, '')
  }
}

const onFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  setFile(input.files?.[0] ?? null)
  input.value = ''
}

const onDrop = (event: DragEvent) => {
  dragging.value = false
  setFile(event.dataTransfer?.files?.[0] ?? null)
}

const submit = async () => {
  if (!file.value) {
    return
  }

  uploading.value = true
  error.value = null

  try {
    const form = new FormData()
    form.append('title', title.value)
    form.append('file', file.value)

    await $fetch('/api/books', { method: 'POST', body: form })
    addOpen.value = false
    await refresh()
  } catch {
    error.value = 'Не удалось загрузить книгу'
  } finally {
    uploading.value = false
  }
}

const removeBook = async (id: string) => {
  removingId.value = id

  try {
    await $fetch(`/api/books/${id}`, { method: 'DELETE' })
    await refresh()
  } finally {
    removingId.value = null
  }
}

useHead({ title: 'Библиотека' })
</script>
