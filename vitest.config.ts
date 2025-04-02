import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'happy-dom', // Use happy-dom for DOM simulation
    setupFiles: [], // We might add setup files later if needed
    include: ['tests/**/*.test.ts'], // Look for tests in a 'tests' directory
    deps: {
      inline: ['@nuxt/test-utils'] // Ensure Nuxt test utils are processed correctly
    }
  },
})
