<template>
  <div
    class="crt-container bg-[#0a0a0a] text-[#33ff00] h-screen flex justify-center items-center">
    <canvas ref="crtCanvas" class="crt-screen" />
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted, onUnmounted } from 'vue';
  import { useCrtGrid, defaultGridConfig } from '~/composables/useCrtGrid';
  import { useCrtRenderer } from '~/composables/useCrtRenderer';
  import { useCrtKeyboard } from '~/composables/useCrtKeyboard';

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
    loadDemoContent,
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
    // Load demo content
    loadDemoContent();

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
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden;
    position: relative;
  }

  .crt-screen {
    image-rendering: pixelated;
    box-shadow: 0 0 10px rgba(51, 255, 0, 0.5), 0 0 20px rgba(51, 255, 0, 0.2),
      inset 0 0 30px rgba(0, 0, 0, 0.8);
    border-radius: 10px;
    position: relative;
  }

  .crt-screen::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      rgba(18, 16, 16, 0) 50%,
      rgba(0, 0, 0, 0.25) 50%
    );
    background-size: 100% 4px;
    pointer-events: none;
    z-index: 2;
  }

  .crt-screen::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: repeating-linear-gradient(
      transparent 0px,
      rgba(0, 0, 0, 0.05) 1px,
      transparent 2px
    );
    pointer-events: none;
    z-index: 1;
  }
</style>
