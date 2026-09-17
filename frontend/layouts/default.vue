<template>
  <div class="min-h-screen bg-gray-900 text-gray-100">
    <header class="bg-gray-800 shadow-md">
      <div class="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
        <NuxtLink to="/" class="text-xl font-bold text-gray-100">
          Homework Review
        </NuxtLink>
      </div>
    </header>

    <main class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <slot />
    </main>
  </div>
</template>
