<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
    @click.self="emit('close')"
  >
    <div class="w-full max-w-xs rounded-lg bg-gray-800 p-4 shadow-xl">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-semibold text-gray-100">
          Калькулятор
        </h3>
        <button
          type="button"
          class="text-sm text-gray-400 transition-colors hover:text-gray-200"
          @click="emit('close')"
        >
          Закрыть
        </button>
      </div>

      <div class="mt-3 rounded-md bg-gray-900 px-3 py-2 text-right">
        <p class="h-4 truncate text-xs text-gray-500">
          {{ expression }}
        </p>
        <p class="truncate text-2xl font-medium text-gray-100">
          {{ display }}
        </p>
      </div>

      <div class="mt-3 grid grid-cols-4 gap-2">
        <button
          v-for="key in keys"
          :key="key.label"
          type="button"
          class="h-11 rounded-md text-sm font-medium transition-colors"
          :class="key.class"
          @click="key.action"
        >
          {{ key.label }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
type Operator = '+' | '-' | '*' | '/'

const emit = defineEmits<{ close: [] }>()

const display = ref('0')
const stored = ref<number | null>(null)
const operator = ref<Operator | null>(null)
const waiting = ref(false)
const failed = ref(false)

const operatorSymbols: Record<Operator, string> = {
  '+': '+',
  '-': '−',
  '*': '×',
  '/': '÷',
}

const format = (value: number): string => {
  if (!Number.isFinite(value)) {
    return 'Ошибка'
  }

  return String(Number(value.toPrecision(12)))
}

const expression = computed(() =>
  stored.value !== null && operator.value
    ? `${format(stored.value)} ${operatorSymbols[operator.value]}`
    : '',
)

const clear = () => {
  display.value = '0'
  stored.value = null
  operator.value = null
  waiting.value = false
  failed.value = false
}

const inputDigit = (digit: string) => {
  if (failed.value) {
    clear()
  }

  if (waiting.value) {
    display.value = digit
    waiting.value = false
    return
  }

  display.value = display.value === '0' ? digit : display.value + digit
}

const inputDot = () => {
  if (failed.value) {
    clear()
  }

  if (waiting.value) {
    display.value = '0.'
    waiting.value = false
    return
  }

  if (!display.value.includes('.')) {
    display.value += '.'
  }
}

const backspace = () => {
  if (failed.value || waiting.value) {
    return
  }

  display.value = display.value.length > 1 ? display.value.slice(0, -1) : '0'

  if (display.value === '-') {
    display.value = '0'
  }
}

const toggleSign = () => {
  if (failed.value || display.value === '0') {
    return
  }

  display.value = display.value.startsWith('-')
    ? display.value.slice(1)
    : `-${display.value}`
}

const percent = () => {
  if (failed.value) {
    return
  }

  display.value = format(Number(display.value) / 100)
}

const calculate = (left: number, right: number, op: Operator): number => {
  switch (op) {
    case '+':
      return left + right
    case '-':
      return left - right
    case '*':
      return left * right
    case '/':
      return right === 0 ? Number.NaN : left / right
  }
}

const chooseOperator = (op: Operator) => {
  if (failed.value) {
    return
  }

  if (stored.value !== null && operator.value && !waiting.value) {
    const result = calculate(stored.value, Number(display.value), operator.value)

    if (!Number.isFinite(result)) {
      display.value = 'Ошибка'
      failed.value = true
      return
    }

    stored.value = result
    display.value = format(result)
  } else {
    stored.value = Number(display.value)
  }

  operator.value = op
  waiting.value = true
}

const equals = () => {
  if (failed.value || stored.value === null || !operator.value) {
    return
  }

  const result = calculate(stored.value, Number(display.value), operator.value)

  stored.value = null
  operator.value = null
  waiting.value = true
  display.value = format(result)
  failed.value = display.value === 'Ошибка'
}

const buttonClass = 'bg-gray-700 text-gray-100 hover:bg-gray-600'
const operatorClass = 'bg-primary-600 text-white hover:bg-primary-700'
const clearClass = 'bg-red-600/80 text-white hover:bg-red-600'

const keys = computed(() => [
  { label: 'C', class: clearClass, action: clear },
  { label: '⌫', class: buttonClass, action: backspace },
  { label: '%', class: buttonClass, action: percent },
  { label: '÷', class: operatorClass, action: () => chooseOperator('/') },
  { label: '7', class: buttonClass, action: () => inputDigit('7') },
  { label: '8', class: buttonClass, action: () => inputDigit('8') },
  { label: '9', class: buttonClass, action: () => inputDigit('9') },
  { label: '×', class: operatorClass, action: () => chooseOperator('*') },
  { label: '4', class: buttonClass, action: () => inputDigit('4') },
  { label: '5', class: buttonClass, action: () => inputDigit('5') },
  { label: '6', class: buttonClass, action: () => inputDigit('6') },
  { label: '−', class: operatorClass, action: () => chooseOperator('-') },
  { label: '1', class: buttonClass, action: () => inputDigit('1') },
  { label: '2', class: buttonClass, action: () => inputDigit('2') },
  { label: '3', class: buttonClass, action: () => inputDigit('3') },
  { label: '+', class: operatorClass, action: () => chooseOperator('+') },
  { label: '±', class: buttonClass, action: toggleSign },
  { label: '0', class: buttonClass, action: () => inputDigit('0') },
  { label: '.', class: buttonClass, action: inputDot },
  { label: '=', class: operatorClass, action: equals },
])

const onKeydown = (event: KeyboardEvent) => {
  const { key } = event

  if (/^\d$/.test(key)) {
    inputDigit(key)
  } else if (key === '.' || key === ',') {
    inputDot()
  } else if (key === '+' || key === '-' || key === '*' || key === '/') {
    chooseOperator(key)
  } else if (key === 'Enter' || key === '=') {
    equals()
  } else if (key === 'Backspace') {
    backspace()
  } else if (key === 'Delete') {
    clear()
  } else if (key === '%') {
    percent()
  } else if (key === 'Escape') {
    emit('close')
    return
  } else {
    return
  }

  event.preventDefault()
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>
