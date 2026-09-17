<template>
  <div class="shrink-0 border-t border-gray-800 bg-gray-900">
    <div class="flex items-center gap-2 overflow-x-auto px-3 py-2">
      <span class="shrink-0 text-xs text-gray-500">Цвет</span>

      <button
        v-for="color in colors"
        :key="color.value"
        type="button"
        class="h-7 w-7 shrink-0 rounded-full border-2 transition-transform hover:scale-110"
        :class="
          selectedColor === color.value && mode === 'draw'
            ? 'border-white'
            : 'border-gray-600'
        "
        :style="{ backgroundColor: color.value }"
        :title="color.label"
        @click="emit('selectColor', color.value)"
      />

      <div class="mx-1 h-8 w-px shrink-0 bg-gray-700" />

      <button
        type="button"
        class="shrink-0 rounded-md border px-3 py-1.5 text-sm transition-colors"
        :class="
          mode === 'erase'
            ? 'border-primary-500 bg-primary-600 text-white'
            : 'border-gray-600 text-gray-200 hover:bg-white/5'
        "
        @click="emit('toggleEraser')"
      >
        Стерка
      </button>

      <button
        type="button"
        class="shrink-0 rounded-md border border-gray-600 px-3 py-1.5 text-sm text-gray-200 transition-colors hover:bg-white/5 disabled:opacity-40"
        :disabled="!canUndo"
        @click="emit('undo')"
      >
        Undo
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const colors = [
  { value: '#000000', label: 'Чёрный' },
  { value: '#2563eb', label: 'Синий' },
  { value: '#ef4444', label: 'Красный' },
  { value: '#16a34a', label: 'Зелёный' },
]

defineProps<{
  selectedColor: string
  mode: 'draw' | 'erase'
  canUndo: boolean
}>()

const emit = defineEmits<{
  selectColor: [color: string]
  toggleEraser: []
  undo: []
}>()
</script>
