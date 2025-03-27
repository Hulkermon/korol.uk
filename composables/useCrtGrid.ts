import { ref, type Ref } from 'vue';

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
  cols: 80,
  rows: 24,
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

  // Handle new line (Enter key)
  const newLine = () => {
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

  // Generate demo content for the grid
  const generateDemoContent = () => {
    const demoGrid = initializeGrid();

    // Header row
    const headerText = '*** CRT TERMINAL EMULATOR ***';
    for (let i = 0; i < headerText.length; i++) {
      if (i < config.cols) {
        demoGrid[1][Math.floor((config.cols - headerText.length) / 2) + i] =
          headerText[i];
      }
    }

    // Add some static content
    const lines = [
      '',
      'SYSTEM READY',
      'MEMORY CHECK: OK',
      'CPU STATUS: NOMINAL',
      '',
      'C:\\> TYPE README.TXT',
      '',
      'This is a canvas-based CRT terminal emulator',
      'that mimics the look and feel of old green',
      'phosphor monitors. Each cell in this grid',
      'can display exactly one ASCII character.',
      '',
      'Press any key to activate cursor...',
    ];

    for (let i = 0; i < lines.length && i + 3 < config.rows; i++) {
      const line = lines[i];
      for (let j = 0; j < line.length && j < config.cols; j++) {
        demoGrid[i + 3][j] = line[j];
      }
    }

    // Add some ASCII art
    const asciiArt = [
      '   ╔════════════╗',
      '   ║ TERMINAL   ║',
      '   ╚════════════╝',
    ];

    for (let i = 0; i < asciiArt.length && i + 18 < config.rows; i++) {
      const line = asciiArt[i];
      for (let j = 0; j < line.length && j < config.cols; j++) {
        demoGrid[i + 18][j + 10] = line[j];
      }
    }

    // Add current date
    const dateText = `DATE: ${new Date().toLocaleDateString()}`;
    for (let i = 0; i < dateText.length; i++) {
      if (i < config.cols) demoGrid[config.rows - 2][i] = dateText[i];
    }

    return demoGrid;
  };

  // Load demo content
  const loadDemoContent = () => {
    grid.value = generateDemoContent();
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
    resetGrid,
  };
}
