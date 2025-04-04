<template>
  <div class="crt-container">
    <canvas ref="crtCanvas" class="crt-screen" />
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted, onUnmounted, watch, computed, defineExpose } from 'vue'; // Import defineExpose, remove provide
  // Import the DOS command processor and types
  import { type HistoryEntry } from '@/composables/dos/useDosCommands'; // Import HistoryEntry
  // Import the CRT composables using alias
  import { useCrtGrid, type GridConfig } from '@/composables/terminal/useCrtGrid';
  import { useCrtRenderer } from '@/composables/terminal/useCrtRenderer';
  import { useCrtKeyboard } from '@/composables/terminal/useCrtKeyboard';
  import { titleScreen } from '@/utils/terminalMessages'; // Import titleScreen
  import { useSnakeGame } from '@/composables/dos/games/useSnakeGame'; // Import Snake Game

  // --- Props ---
  const props = defineProps<{
    // Function to process commands, passed from parent
    processCommandFunction: (input: string) => Promise<string | string[] | symbol | null>;
    currentPathString: string;
    terminalColor: string;
    clearScreenSignal: symbol;
    /** includes input, output and errors */
    terminalHistory: HistoryEntry[];
  }>();

  // --- Canvas and Grid Setup ---
  const crtCanvas = ref<HTMLCanvasElement | null>(null);
  const currentInputLine = ref(''); // Buffer for the current line being typed
  const commandHistoryIndex = ref(-1); // Index for history navigation

  // --- Game Mode State ---
  const isGameModeActive = ref(false);
  const savedGridState = ref<string[][] | null>(null);
  const savedCursorPos = ref<{ x: number; y: number } | null>(null);
  const snakeGame = useSnakeGame(); // Instantiate the snake game composable

  // --- Computed Properties ---
  // Filter for input history only
  const inputHistory = computed(() => [
    ...props.terminalHistory.filter((entry) => entry.type === 'input'),
  ]);

  const prefixLength = computed(() => {
    return props.currentPathString.length + 1;
  });

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
  const _cols = 120;
  const _rows = 36;
  const _rows4by3 = (_cols * _cellWidth * 3) / 4 / _cellHeight; // 4:3 aspect ratio

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
    // Removed isGameModeActive argument
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
    gridApi.cursorPos.value.x = prefixLength.value;
    // Reset history index after submitting a command
    commandHistoryIndex.value = inputHistory.value.length; // Set to the end of the history
  };

  // --- Game Mode Control ---
  const enterGameMode = () => {
    // Save current terminal state
    savedGridState.value = JSON.parse(JSON.stringify(gridApi.grid.value)); // Deep copy
    savedCursorPos.value = { ...gridApi.cursorPos.value };

    isGameModeActive.value = true;
    gridApi.clearGrid(); // Clear screen for the game
    snakeGame.startGame(gridApi); // Start the snake game logic
  };

  const exitGameMode = () => {
    snakeGame.stopGame(); // Stop the game loop
    isGameModeActive.value = false;

    // Restore terminal state
    if (savedGridState.value) {
      gridApi.grid.value = savedGridState.value;
    }
    if (savedCursorPos.value) {
      gridApi.cursorPos.value = savedCursorPos.value;
    } else {
      // Fallback if somehow savedCursorPos is null
      gridApi.cursorPos.value = { x: prefixLength.value, y: gridApi.grid.value.length -1 };
    }

    // Clear saved state
    savedGridState.value = null;
    savedCursorPos.value = null;

    // Optional: Redraw the prompt at the restored cursor position if needed
    // gridApi.writeTextAt(props.currentPathString, 0, gridApi.cursorPos.value.y);
    // gridApi.cursorPos.value.x = prefixLength.value;
  };

  // Provide APIs for commands/composables
  provide('gridApi', gridApi);
  // Provide APIs for commands/composables - REMOVED provide
  // provide('gridApi', gridApi);
  // provide('enterGameMode', enterGameMode);
  // provide('exitGameMode', exitGameMode);

  // Expose functions and refs for parent component access
  defineExpose({
    enterGameMode,
    exitGameMode,
    gridApi // Expose gridApi so the command context can access it
  });

  // --- Helper Functions ---
  // Replaces the current input line visually and updates state
  const replaceCurrentInputLine = (newText: string) => {
    const promptLen = prefixLength.value;
    const currentLineY = gridApi.cursorPos.value.y;

    // Clear existing input on the grid line
    gridApi.writeTextAt(' '.repeat(gridApi.config.value.cols), promptLen, currentLineY);

    // Update state and write new text
    currentInputLine.value = newText;
    gridApi.writeTextAt(newText, promptLen, currentLineY);

    // Set cursor position to the end of the new input
    gridApi.cursorPos.value.x = promptLen + newText.length;
  };

  // --- Keyboard Input Handling (Normal Mode) ---
  useCrtKeyboard({
    onCharInput: (char) => {
      // Only handle if not in game mode
      if (!isGameModeActive.value) {
        currentInputLine.value += char;
        gridApi.writeChar(char);
      }
    },
    onBackspace: () => {
      if (!isGameModeActive.value) {
        currentInputLine.value = currentInputLine.value.slice(0, -1);
        gridApi.deleteChar(prefixLength.value);
      }
    },
    onEnter: () => {
      if (!isGameModeActive.value) {
        handleEnter();
      }
    },
    onArrow: (direction) => {
      // Only handle left/right for cursor movement in normal mode
      if (!isGameModeActive.value) {
        if (direction === 'left') {
          if (gridApi.cursorPos.value.x > prefixLength.value) {
            gridApi.moveCursor('left');
          }
        } else if (direction === 'right') {
          if (gridApi.cursorPos.value.x < prefixLength.value + currentInputLine.value.length) {
            gridApi.moveCursor('right');
          }
        }
      }
    },
    onHistoryUp: () => {
      if (!isGameModeActive.value) {
        if (inputHistory.value.length === 0) return;
        commandHistoryIndex.value = Math.max(0, commandHistoryIndex.value - 1);
        const historyEntry = inputHistory.value[commandHistoryIndex.value];
        const commandText = (historyEntry?.text as string)?.substring(prefixLength.value) || '';
        replaceCurrentInputLine(commandText);
      }
    },
    onHistoryDown: () => {
      if (!isGameModeActive.value) {
        if (inputHistory.value.length === 0) return;
        commandHistoryIndex.value = Math.min(
          inputHistory.value.length,
          commandHistoryIndex.value + 1
        );
        if (commandHistoryIndex.value === inputHistory.value.length) {
           replaceCurrentInputLine('');
        } else {
          const historyEntry = inputHistory.value[commandHistoryIndex.value];
          const commandText = (historyEntry?.text as string)?.substring(prefixLength.value) || '';
          replaceCurrentInputLine(commandText);
        }
      }
    },
    // Removed onEscape and game-specific logic from here
  });

  // --- Game Mode Keyboard Handling ---
  const handleGameKeyDown = (e: KeyboardEvent) => {
    if (!isGameModeActive.value) return; // Only act if game is active

    let handled = true; // Assume handled unless proven otherwise
    const key = e.key.toLowerCase();

    switch (key) {
      case 'arrowup':
      case 'w':
        snakeGame.changeDirection('up');
        break;
      case 'arrowdown':
      case 's':
        snakeGame.changeDirection('down');
        break;
      case 'arrowleft':
      case 'a':
        snakeGame.changeDirection('left');
        break;
      case 'arrowright':
      case 'd':
        snakeGame.changeDirection('right');
        break;
      case 'r':
        if (snakeGame.isGameOver.value) {
          snakeGame.resetGame();
        } else {
          handled = false; // Don't prevent default if not game over
        }
        break;
      case 'escape':
        exitGameMode();
        break;
      default:
        handled = false; // Key wasn't a game control key
        break;
    }

    if (handled) {
      e.preventDefault(); // Prevent default browser actions for game keys
      e.stopPropagation(); // Prevent useCrtKeyboard listener from firing
    }
  };

  // --- Watchers ---
  // Update grid color when prop changes
  watch(
    () => props.terminalColor,
    (newColorName) => {
      const newHexColor = colorMap[newColorName.toLowerCase()] || colorMap['white'];
      gridApi.updateConfig({ charColor: newHexColor });
    }
  );

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
    gridApi.cursorPos.value.x = prefixLength.value;

    // Start the rendering loop
    rendererApi.startRendering();

    // Set up window resize handler
    window.addEventListener('resize', rendererApi.handleResize);
    // Add game keydown listener
    window.addEventListener('keydown', handleGameKeyDown, true); // Use capture phase
  });

  onUnmounted(() => {
    window.removeEventListener('resize', rendererApi.handleResize);
    // Remove game keydown listener
    window.removeEventListener('keydown', handleGameKeyDown, true);
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
