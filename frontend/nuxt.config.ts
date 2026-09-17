import tailwindcss from '@tailwindcss/vite';

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['~/assets/css/tailwind.css', '~/assets/css/main.scss'],
  components: [{ path: '~/components', pathPrefix: false }],
  vite: {
    plugins: [tailwindcss()],
  },
  runtimeConfig: {
    public: {
      apiBase: 'http://localhost:3001',
      wsBase: 'ws://localhost:3001',
      backendOrigin: 'http://localhost:3001',
      yandexClientId: '',
    },
  },
});
