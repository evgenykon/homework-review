<template>
  <div
    v-if="book"
    class="fixed inset-0 z-50 flex flex-col bg-black/70 p-4"
    @click.self="emit('close')"
  >
    <div class="mx-auto flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-gray-800">
      <div class="flex shrink-0 items-center justify-between gap-3 border-b border-gray-700 px-4 py-3">
        <span class="truncate text-sm font-medium text-gray-100">
          {{ book.title }}
        </span>
        <button
          type="button"
          class="shrink-0 text-sm text-gray-400 transition-colors hover:text-gray-200"
          @click="emit('close')"
        >
          Закрыть
        </button>
      </div>
      <iframe
        :src="`${backendOrigin}/api/books/${book.id}/file`"
        :title="book.title"
        class="min-h-0 w-full flex-1 border-0 bg-white"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Book } from '~/types/book'

defineProps<{
  book: Book | null
  backendOrigin: string
}>()

const emit = defineEmits<{ close: [] }>()
</script>
