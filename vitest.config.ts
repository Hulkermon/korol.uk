import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue'; // Required for Vue component testing
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue()], // Add Vue plugin
  test: {
    globals: true, // Use Vitest global APIs (describe, it, etc.) without importing
    environment: 'jsdom', // Simulate browser environment for component testing
    // If using @vue/test-utils:
    deps: {
        inline: ['@vue/test-utils']
    },
  },
  resolve: {
    alias: {
      // Define aliases to match Nuxt/tsconfig
      '@': resolve(__dirname, '.'), // Alias @ to the project root
      '~': resolve(__dirname, '.'), // Alias ~ to the project root
      // Add other aliases from tsconfig.json if needed
    },
  },
});
