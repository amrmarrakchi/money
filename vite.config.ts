import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// The API is the Laravel app in backend/. In development, `npm run dev` forwards /api to `php artisan serve`;
// the build is written into backend/public, so one domain serves the frontend and the API
export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/api': process.env.API_URL || 'http://127.0.0.1:8000',
    },
  },
  build: {
    outDir: 'backend/public',
    emptyOutDir: false, // backend/public also holds Laravel's index.php and .htaccess
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
