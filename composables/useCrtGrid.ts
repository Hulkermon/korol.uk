import { ref, type Ref } from 'vue';
import { logo, systemInfo } from "~/utils/terminalMessages";

export interface GridConfig {
  cols: number;
  rows: number;
  cellWidth: number;
  cellHeight: number;
  charColor: string;
  glowStrength?: number;
  backgroundColor?: string;
  scanlineOpacity?: number;
  refreshRate?: number;
}

export const defaultGridConfig: GridConfig = {
  cols: 128,
  rows: 48,
  cellWidth: 12,
  cellHeight: 20,
  charColor: '#33ff00', // Classic green terminal color
  glowStrength: 3,
  backgroundColor: '#0a0a0a',
  scanlineOpacity: 0.15,
  refreshRate: 60,
};

export interface CursorPosition {
  x: number;
  y: number;
}

export function useCrtGrid(config: GridConfig = defaultGridConfig) {
  // Terminal state
  const grid = ref<string[][]>([]);
  const cursorPos = ref<CursorPosition>({ x: 0, y: 0 });
  // Add a new state to track if we're waiting for initial keypress
  const waitingForKeyPress = ref(true);

  // Extracted logic for handling initial keypress
  const handleInitialKeyPress = () => {
    waitingForKeyPress.value = false;
    resetGrid();
    cursorPos.value = { x: 0, y: config.rows - 1 }; // Position cursor at bottom left
  };

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
    // First keypress should just clear the screen if we're in waiting mode
    if (waitingForKeyPress.value) {
      handleInitialKeyPress();
      return;
    }

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
    // Ignore backspace when in waiting mode
    if (waitingForKeyPress.value) {
      handleInitialKeyPress();
      return;
    }

    if (cursorPos.value.x > 0) {
      cursorPos.value.x--;
      grid.value[cursorPos.value.y][cursorPos.value.x] = ' ';
    } else if (cursorPos.value.y > 0) {
      cursorPos.value.y--;
      cursorPos.value.x = config.cols - 1;
      grid.value[cursorPos.value.y][cursorPos.value.x] = ' ';
    }
  };

  // Handle new line (Enter key)
  const newLine = () => {
    // Treat Enter as any key when in waiting mode
    if (waitingForKeyPress.value) {
      handleInitialKeyPress();
      return;
    }

    cursorPos.value.x = 0;
    if (cursorPos.value.y < config.rows - 1) {
      cursorPos.value.y++;
    } else {
      scrollUp();
    }
  };

  // Scroll the grid up by one line
  const scrollUp = () => {
    grid.value.shift();
    grid.value.push(Array(config.cols).fill(' '));
  };

  // Move cursor in a specified direction
  const moveCursor = (direction: 'up' | 'down' | 'left' | 'right') => {
    // Treat arrow keys as any key when in waiting mode
    if (waitingForKeyPress.value) {
      handleInitialKeyPress();
      return;
    }

    switch (direction) {
      case 'up':
        if (cursorPos.value.y > 0) cursorPos.value.y--;
        break;
      case 'down':
        if (cursorPos.value.y < config.rows - 1) cursorPos.value.y++;
        break;
      case 'left':
        if (cursorPos.value.x > 0) cursorPos.value.x--;
        break;
      case 'right':
        if (cursorPos.value.x < config.cols - 1) cursorPos.value.x++;
        break;
    }
  };

  // Generate 80s style welcome screen
  const generateWelcomeScreen = () => {
    const demoGrid = initializeGrid();
    
    // Add logo at top
    for (let i = 0; i < logo.length && i < config.rows; i++) {
      writeTextCentered(logo[i], i + 1);
    }

    // Add system info after logo
    for (let i = 0; i < systemInfo.length && i + 18 < config.rows; i++) {
      writeTextCentered(systemInfo[i], i + 18);
    }
    
    return demoGrid;
    
    function writeTextCentered(text: string, y: number) {
      if (y < 0 || y >= config.rows) return;
      const startX = Math.floor((config.cols - text.length) / 2);
      for (let i = 0; i < text.length; i++) {
        if (startX + i >= 0 && startX + i < config.cols) {
          demoGrid[y][startX + i] = text[i];
        }
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
    waitingForKeyPress.value = true;
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
    cursorPos.value = { x: 0, y: 0 };
  };

  return {
    grid,
    cursorPos,
    config,
    writeTextAt,
    writeTextCentered,
    writeChar,
    deleteChar,
    newLine,
    scrollUp,
    moveCursor,
    loadDemoContent,
    loadWelcomeScreen,
    waitingForKeyPress,
    resetGrid,
  };
}
