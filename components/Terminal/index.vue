<template>
  <div class="crt-container">
    <canvas ref="crtCanvas" class="crt-screen" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed, type Ref, type PropType } from 'vue'; // Import PropType
// Import the DOS command processor and types
import { useDosCommands, type DosCommandContext, type HistoryEntry } from '@/composables/dos/useDosCommands'; // Import HistoryEntry
// Import the CRT composables using alias
import { useCrtGrid, type GridConfig } from '@/composables/terminal/useCrtGrid';
import { useCrtRenderer } from '@/composables/terminal/useCrtRenderer';
import { useCrtKeyboard } from '@/composables/terminal/useCrtKeyboard';
import { titleScreen } from '@/utils/terminalMessages'; // Import titleScreen

// --- Props ---
const props = defineProps<{
  // Function to process commands, passed from parent
  processCommandFunction: (input: string) => Promise<string | string[] | symbol | null>;
  currentPathString: string;
  terminalColor: string;
  clearScreenSignal: symbol;
  commandHistory: HistoryEntry[]; // Add commandHistory prop type
}>();


// --- Canvas and Grid Setup ---
const crtCanvas = ref<HTMLCanvasElement | null>(null);
const currentInputLine = ref(''); // Buffer for the current line being typed
const commandHistoryIndex = ref(-1); // Index for history navigation

// --- Computed Properties ---
// Filter for input history only
const inputHistory = computed(() =>
  props.commandHistory.filter(entry => entry.type === 'input')
);

// Map color names to hex values for the grid config
const colorMap: Record<string, string> = {
    green: '#33ff33',
    yellow: '#ffff33',
    cyan: '#33ffff',
    white: '#c0c0c0',
    red: '#ff6b6b',
    pink: '#ff99cc',
};

const _cellWidth = 12;
const _cellHeight = 20;
const _cols = 120
const _rows = 36;
const _rows4by3 = _cols * _cellWidth * 3 / 4 / _cellHeight; // 4:3 aspect ratio

// Initial Grid Config (color will be updated by watch)
const gridConfig: GridConfig = {
    cols: _cols,
    rows: _rows,
    cellWidth: _cellWidth,
    cellHeight: _cellHeight,
    charColor: colorMap[props.terminalColor] || colorMap['green'], // Initial color
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
      // Reset cursor position to be after the prompt
      gridApi.cursorPos.value.x = props.currentPathString.length;
      // Reset history index after submitting a command
      commandHistoryIndex.value = -1;
  };

  // --- Helper Functions ---
  // Replaces the current input line visually and updates state
  const replaceCurrentInputLine = (newText: string) => {
      const promptLen = props.currentPathString.length;
      const currentLineY = gridApi.cursorPos.value.y;

      // Clear existing input on the grid line
      for (let x = promptLen; x < gridApi.config.value.cols; x++) {
          gridApi.grid.value[currentLineY][x] = ' ';
      }

      // Update state and write new text
      currentInputLine.value = newText;
      gridApi.writeTextAt(newText, promptLen, currentLineY);

      // Set cursor position to the end of the new input
      gridApi.cursorPos.value.x = promptLen + newText.length;
  };


  // --- Keyboard Input Handling ---
  useCrtKeyboard({
    onCharInput: (char) => {
      currentInputLine.value += char;
      // Prevent typing over the grid width
      if (gridApi.cursorPos.value.x < gridApi.config.value.cols) {
          currentInputLine.value += char;
          gridApi.writeChar(char); // Display char on canvas
      }
    },
    onBackspace: () => {
      // Check if cursor is after the prompt before deleting
      if (gridApi.cursorPos.value.x > props.currentPathString.length) {
        currentInputLine.value = currentInputLine.value.slice(0, -1);
        gridApi.deleteChar(props.currentPathString.length); // Pass prompt length
      }
    },
    onEnter: handleEnter, // Call our command processing logic
    onArrow: (direction) => { // Handle arrows selectively
        if (direction === 'left') {
            // Prevent moving left of the prompt
            if (gridApi.cursorPos.value.x > props.currentPathString.length) {
                gridApi.moveCursor('left');
            }
        } else if (direction === 'right') {
            // Prevent moving past the end of the current input + prompt
            if (gridApi.cursorPos.value.x < props.currentPathString.length + currentInputLine.value.length) {
                 gridApi.moveCursor('right');
            }
        }
    },
    onHistoryUp: () => {
        if (inputHistory.value.length === 0) return;
        commandHistoryIndex.value = Math.max(0, commandHistoryIndex.value - 1);
        const historyEntry = inputHistory.value[commandHistoryIndex.value];
        // Strip the original prompt part (e.g., "C:\> ") before replacing
        const commandText = (historyEntry?.text as string)?.substring(props.currentPathString.length) || '';
        replaceCurrentInputLine(commandText);
    },
    onHistoryDown: () => {
        if (inputHistory.value.length === 0) return;
        commandHistoryIndex.value = Math.min(inputHistory.value.length - 1, commandHistoryIndex.value + 1);
        const historyEntry = inputHistory.value[commandHistoryIndex.value];
        const commandText = (historyEntry?.text as string)?.substring(props.currentPathString.length) || '';
        replaceCurrentInputLine(commandText);
        // TODO: Optionally handle going past the end (index > length-1) to clear the line
    }, // <-- Add missing comma here
  });

  // --- Watchers ---
  // Update grid color when prop changes
  watch(() => props.terminalColor, (newColorName) => {
      const newHexColor = colorMap[newColorName.toLowerCase()] || colorMap['white'];
      gridApi.updateConfig({ charColor: newHexColor });
  });

  // --- Lifecycle Hooks ---
  onMounted(() => {
    // Clear the grid first to ensure a blank slate
    gridApi.clearGrid();

    // Write the title screen centered, starting from row 1 (index 0)
    titleScreen.forEach((line, index) => {
        // Add a small top margin, e.g., start at row 1 or 2
        const startRow = 1;
        if (index + startRow < gridApi.config.value.rows) {
             gridApi.writeTextCentered(line, index + startRow);
        }
    });

    // Set cursor position after title screen (e.g., below the title)
    // Find the last line of the title screen + some padding
    const lastTitleLine = titleScreen.length + 1; // +1 for the startRow offset
    const promptRow = Math.min(lastTitleLine + 2, gridApi.config.value.rows - 1); // Ensure it's within bounds
    gridApi.cursorPos.value = { x: 0, y: promptRow };

    // Write initial prompt at the new cursor position
    gridApi.writeTextAt(props.currentPathString, 0, gridApi.cursorPos.value.y);
    // Set cursor x position after the prompt
    gridApi.cursorPos.value.x = props.currentPathString.length;

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
