import { ref, type Ref } from 'vue';
import { titleScreen } from '~/utils/terminalMessages';
import { useCursor, type CursorPosition } from './useCursor';

export interface GridConfig {
  cols: number;
  rows: number;
  cellWidth: number;
  cellHeight: number;
  charColor: string;
  glowStrength?: number;
  backgroundColor?: string;
  scanlineOpacity?: number;
}

export function useCrtGrid(config: GridConfig) {
  // Terminal state
  const grid = ref<string[][]>([]);

  // Initialize cursor controls
  const { cursorPos, moveCursor, newLine, resetCursor } = useCursor({
    blinkIntervalMs: 500,
    cols: config.cols,
    rows: config.rows,
  });

  // Initialize the grid with spaces
  const initializeGrid = () => {
    const newGrid: string[][] = [];
    for (let y = 0; y < config.rows; y++) {
      const row: string[] = [];
      for (let x = 0; x < config.cols; x++) {
        row.push(' ');
      }
      newGrid.push(row);
    }
    return newGrid;
  };

  // Initialize the grid on creation
  grid.value = initializeGrid();

  // Write text at a specific position
  const writeTextAt = (text: string, x: number, y: number) => {
    if (y < 0 || y >= config.rows) return;

    for (let i = 0; i < text.length; i++) {
      const posX = x + i;
      if (posX >= 0 && posX < config.cols) {
        grid.value[y][posX] = text[i];
      }
    }
  };

  // Write text centered on a row
  const writeTextCentered = (text: string, y: number) => {
    if (y < 0 || y >= config.rows) return;

    const startX = Math.floor((config.cols - text.length) / 2);
    writeTextAt(text, startX, y);
  };

  // Write a character at the cursor position and advance cursor
  const writeChar = (char: string) => {
    if (char.length !== 1) return;

    grid.value[cursorPos.value.y][cursorPos.value.x] = char;

    // Move cursor forward
    if (cursorPos.value.x < config.cols - 1) {
      cursorPos.value.x++;
    } else if (cursorPos.value.y < config.rows - 1) {
      cursorPos.value.x = 0;
      cursorPos.value.y++;
    } else {
      // Scroll up when we reach the end
      cursorPos.value.x = 0;
      scrollUp();
    }
  };

  // Delete a character at the current cursor position (backspace)
  const deleteChar = () => {
    if (cursorPos.value.x > 0) {
      cursorPos.value.x--;
      grid.value[cursorPos.value.y][cursorPos.value.x] = ' ';
    } else if (cursorPos.value.y > 0) {
      cursorPos.value.y--;
      cursorPos.value.x = config.cols - 1;
      grid.value[cursorPos.value.y][cursorPos.value.x] = ' ';
    }
  };

  // Scroll the grid up by one line
  const scrollUp = () => {
    grid.value.shift();
    grid.value.push(Array(config.cols).fill(' '));
  };

  // Generate 80s style welcome screen
  const generateWelcomeScreen = () => {
    const demoGrid = initializeGrid();

    // Print title screen
    for (let i = 0; i < titleScreen.length && i < config.rows; i++) {
      setTimeout(() => {
        writeTextCentered(titleScreen[i], i + 7);
      }, i * 25);
    }

    return demoGrid;

    function writeTextCentered(text: string, y: number) {
      if (y < 0 || y >= config.rows) return;
      const startX = Math.floor((config.cols - text.length) / 2);
      for (let i = 0; i < text.length; i++) {
        demoGrid[y][startX + i] = text[i];
      }
    }

    function writeTextAt(text: string, x: number, y: number) {
      if (y < 0 || y >= config.rows) return;
      for (let i = 0; i < text.length; i++) {
        if (x + i >= 0 && x + i < config.cols) {
          demoGrid[y][x + i] = text[i];
        }
      }
    }
  };

  // Load welcome screen
  const loadWelcomeScreen = () => {
    grid.value = generateWelcomeScreen();
  };

  // Generate demo content for the grid (keeping this for compatibility)
  const generateDemoContent = () => {
    return generateWelcomeScreen();
  };

  // Load demo content (keeping this for compatibility)
  const loadDemoContent = () => {
    loadWelcomeScreen();
  };

  // Reset the grid (clear all content)
  const resetGrid = () => {
    grid.value = initializeGrid();
    resetCursor();
  };

  return {
    grid,
    cursorPos,
    config,
    writeTextAt,
    writeTextCentered,
    writeChar,
    deleteChar,
    newLine: () => newLine(scrollUp),
    scrollUp,
    moveCursor,
    loadDemoContent,
    loadWelcomeScreen,
    resetGrid,
  };
}
