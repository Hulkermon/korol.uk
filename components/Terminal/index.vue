<template>
  <div class="crt-container">
    <canvas ref="crtCanvas" class="crt-screen" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed, type Ref } from 'vue'; // Explicitly import Ref
// Import the DOS command processor and types
import { useDosCommands, type DosCommandContext } from '@/composables/dos/useDosCommands';
// Import the CRT composables using alias
import { useCrtGrid, type GridConfig } from '@/composables/terminal/useCrtGrid';
import { useCrtRenderer } from '@/composables/terminal/useCrtRenderer';
import { useCrtKeyboard } from '@/composables/terminal/useCrtKeyboard';

// --- Props ---
const props = defineProps<{
  // Function to process commands, passed from parent
  processCommandFunction: (input: string) => Promise<string | string[] | symbol | null>;
  currentPathString: string;
  terminalColor: string;
  clearScreenSignal: symbol;
}>();


// --- Canvas and Grid Setup ---
const crtCanvas = ref<HTMLCanvasElement | null>(null);
const currentInputLine = ref(''); // Buffer for the current line being typed

// Map color names to hex values for the grid config
const colorMap: Record<string, string> = {
    green: '#33ff33',
    yellow: '#ffff33',
    cyan: '#33ffff',
    white: '#c0c0c0',
    red: '#ff6b6b',
    pink: '#ff99cc',
};

// Initial Grid Config (color will be updated by watch)
const gridConfig: GridConfig = {
    cols: 80, // Standard DOS width
    rows: 36, // Standard DOS height
    cellWidth: 12,
    cellHeight: 20,
    charColor: colorMap[props.terminalColor] || colorMap['white'], // Initial color
    glowStrength: 1,
    backgroundColor: 'black',
    scanlineOpacity: 0.1,
  };

  // Initialize the CRT grid API
  const gridApi = useCrtGrid(gridConfig);

  // Initialize the renderer API
  const rendererApi = useCrtRenderer(
    crtCanvas,
    gridApi.grid,
    gridApi.cursorPos,
    gridApi.config // Pass the reactive config ref
  );

  // --- Command Processing Logic ---
  const handleEnter = async () => {
      const commandToProcess = currentInputLine.value;
      currentInputLine.value = ''; // Clear input buffer

      gridApi.newLine(); // Move cursor to next line in canvas

      const result = await props.processCommandFunction(commandToProcess);

      if (result === props.clearScreenSignal) {
          gridApi.clearGrid();
      } else if (typeof result === 'string' || Array.isArray(result)) {
          // Only write if it's string or string array
          gridApi.writeLines(result);
      }
      // If result is null (e.g., command had no output), do nothing extra

      // Write the new prompt after processing
      gridApi.writeTextAt(props.currentPathString, 0, gridApi.cursorPos.value.y);
  };


  // --- Keyboard Input Handling ---
  useCrtKeyboard({
    onCharInput: (char) => {
      currentInputLine.value += char;
      gridApi.writeChar(char); // Display char on canvas
    },
    onBackspace: () => {
      if (currentInputLine.value.length > 0) {
        currentInputLine.value = currentInputLine.value.slice(0, -1);
        gridApi.deleteChar(); // Delete char on canvas
      }
    },
    onEnter: handleEnter, // Call our command processing logic
    onArrow: gridApi.moveCursor, // Use grid's cursor movement
  });

  // --- Watchers ---
  // Update grid color when prop changes
  watch(() => props.terminalColor, (newColorName) => {
      const newHexColor = colorMap[newColorName.toLowerCase()] || colorMap['white'];
      gridApi.updateConfig({ charColor: newHexColor });
  });

  // --- Lifecycle Hooks ---
  onMounted(() => {
    // Optional: Clear welcome screen if not desired
    // gridApi.clearGrid();

    // Write initial prompt
    gridApi.writeTextAt(props.currentPathString, 0, gridApi.cursorPos.value.y);

    // Start the rendering loop
    rendererApi.startRendering();

    // Set up window resize handler
    window.addEventListener('resize', rendererApi.handleResize);
  });

  onUnmounted(() => {
    window.removeEventListener('resize', rendererApi.handleResize);
    rendererApi.stopRendering();
  });
</script>

<style scoped>
  .crt-container {
    /* Keep container styles */
    @apply flex h-screen justify-center items-center bg-[#0a0a0a];
  }

  .crt-screen {
    /* Keep screen styles */
    image-rendering: pixelated;
    box-shadow: 0 0 10px rgba(51, 255, 0, 0.5), 0 0 20px rgba(51, 255, 0, 0.2),
      inset 0 0 30px rgba(0, 0, 0, 0.8);
    border-radius: 16px;
    position: relative;
  }
</style>
