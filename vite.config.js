import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Split heavy, page-specific libraries into their own chunks so the
        // first paint (home page) doesn't download Firebase or the PDF engine.
        // Rolldown (Vite 8) requires manualChunks as a function.
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('firebase'))               return 'firebase'
            if (id.includes('@ceereals/vue-pdf'))      return 'pdf'
            if (id.includes('@internationalized/date')) return 'datefns'
          }
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://195.201.238.233',
        changeOrigin: true,
      },
    },
  },
})
