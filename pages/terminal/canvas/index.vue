<template>
  <div
    class="crt-container">
    <canvas ref="crtCanvas" class="crt-screen" />
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted, onUnmounted } from 'vue';
  import { useCrtGrid, defaultGridConfig } from '~/composables/terminal/useCrtGrid';
  import { useCrtRenderer } from '~/composables/charts/useCrtRenderer';
  import { useCrtKeyboard } from '~/composables/terminal/useCrtKeyboard';

  // Canvas reference
  const crtCanvas = ref<HTMLCanvasElement | null>(null);

  // Initialize the CRT grid with default settings
  const {
    grid,
    cursorPos,
    config,
    writeChar,
    deleteChar,
    newLine,
    moveCursor,
    loadWelcomeScreen,
  } = useCrtGrid(defaultGridConfig);

  // Initialize the renderer
  const { startRendering, stopRendering, handleResize } = useCrtRenderer(
    crtCanvas,
    grid,
    cursorPos,
    config
  );

  // Set up keyboard handling
  useCrtKeyboard({
    onCharInput: writeChar,
    onBackspace: deleteChar,
    onEnter: newLine,
    onArrow: moveCursor,
  });

  // Setup on mount
  onMounted(() => {
    // Load welcome screen instead of demo content
    loadWelcomeScreen();

    // Start the rendering loop
    startRendering();

    // Set up window resize handler
    window.addEventListener('resize', handleResize);
  });

  // Clean up on unmount
  onUnmounted(() => {
    window.removeEventListener('resize', handleResize);
    stopRendering();
  });
</script>

<style scoped>
  .crt-container {
    @apply flex h-screen justify-center items-center bg-[#0a0a0a] text-[#33ff00];
  }

  .crt-screen {
    image-rendering: pixelated;
    box-shadow: 0 0 10px rgba(51, 255, 0, 0.5), 0 0 20px rgba(51, 255, 0, 0.2),
      inset 0 0 30px rgba(0, 0, 0, 0.8);
    border-radius: 10px;
    position: relative;
  }
</style>
