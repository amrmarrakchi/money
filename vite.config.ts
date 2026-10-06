import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { apiMiddleware } from './server/api.js'

// The JSON API runs inside the dev server, so `npm run dev` is the only command needed
export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    {
      name: 'money-api',
      configureServer(server) {
        server.middlewares.use(apiMiddleware)
      },
    },
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
