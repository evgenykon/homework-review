<template>
  <div class="shrink-0 border-t border-gray-800 bg-gray-900">
    <div class="flex items-center gap-1.5 overflow-x-auto px-3 py-2">
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
        class="icon-btn"
        :class="mode === 'erase' ? 'is-active' : ''"
        title="Стерка"
        @click="emit('toggleEraser')"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5">
          <path d="M4 20h16" />
          <path d="M7 20l-3-3 10.5-10.5a2 2 0 012.83 0l2.17 2.17a2 2 0 010 2.83L10 20" />
        </svg>
      </button>

      <button
        type="button"
        class="icon-btn disabled:opacity-40"
        :disabled="!canUndo"
        title="Отменить"
        @click="emit('undo')"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5">
          <path d="M9 14L4 9l5-5" />
          <path d="M4 9h10a6 6 0 016 6v0a6 6 0 01-6 6h-3" />
        </svg>
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
