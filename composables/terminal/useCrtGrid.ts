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

export function useCrtGrid(initialConfig: GridConfig) {
  // Make config reactive
  const config = ref<GridConfig>(initialConfig);

  // Terminal state
  const grid = ref<string[][]>([]);

  // Initialize cursor controls - pass reactive config values
  const { cursorPos, moveCursor, newLine, resetCursor } = useCursor({
    blinkIntervalMs: 500,
    cols: config.value.cols, // Use .value
    rows: config.value.rows, // Use .value
  });

  // Initialize the grid with spaces
  const initializeGrid = () => {
    const newGrid: string[][] = [];
    for (let y = 0; y < config.value.rows; y++) { // Use .value
      const row: string[] = [];
      for (let x = 0; x < config.value.cols; x++) { // Use .value
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
    if (y < 0 || y >= config.value.rows) return; // Use .value

    for (let i = 0; i < text.length; i++) {
      const posX = x + i;
      if (posX >= 0 && posX < config.value.cols) { // Use .value
        grid.value[y][posX] = text[i];
      }
    }
  };

  // Write text centered on a row
  const writeTextCentered = (text: string, y: number) => {
    if (y < 0 || y >= config.value.rows) return; // Use .value

    const startX = Math.floor((config.value.cols - text.length) / 2); // Use .value
    writeTextAt(text, startX, y);
  };

  // Write a character at the cursor position and advance cursor
  const writeChar = (char: string) => {
    if (char.length !== 1) return;

    grid.value[cursorPos.value.y][cursorPos.value.x] = char;

    // Move cursor forward
    if (cursorPos.value.x < config.value.cols - 1) { // Use .value
      cursorPos.value.x++;
    } else if (cursorPos.value.y < config.value.rows - 1) { // Use .value
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
      cursorPos.value.x = config.value.cols - 1; // Use .value
      grid.value[cursorPos.value.y][cursorPos.value.x] = ' ';
    }
  };

  // Scroll the grid up by one line
  const scrollUp = () => {
    grid.value.shift();
    grid.value.push(Array(config.value.cols).fill(' ')); // Use .value
  };

  // Generate 80s style welcome screen
  const generateWelcomeScreen = () => {
    const demoGrid = initializeGrid();

    // Print title screen
    for (let i = 0; i < titleScreen.length && i < config.value.rows; i++) { // Use .value
      setTimeout(() => {
        writeTextCentered(titleScreen[i], i + 7);
      }, i * 25);
    }

    return demoGrid;

    function writeTextCentered(text: string, y: number) {
      if (y < 0 || y >= config.value.rows) return; // Use .value
      const startX = Math.floor((config.value.cols - text.length) / 2); // Use .value
      for (let i = 0; i < text.length; i++) {
        demoGrid[y][startX + i] = text[i];
      }
    }

    function writeTextAt(text: string, x: number, y: number) {
      if (y < 0 || y >= config.value.rows) return; // Use .value
      for (let i = 0; i < text.length; i++) {
        if (x + i >= 0 && x + i < config.value.cols) { // Use .value
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

  // Clear the grid content
  const clearGrid = () => {
    grid.value = initializeGrid();
    resetCursor();
  };

  // Update parts of the configuration reactively
  const updateConfig = (newConfig: Partial<GridConfig>) => {
    config.value = { ...config.value, ...newConfig };
    // Note: If cols/rows change, cursor logic might need re-initialization or adjustment
  };

  // Write multiple lines, handling wrapping and newlines
  const writeLines = (lines: string | string[]) => {
    const linesArray = Array.isArray(lines) ? lines : lines.split('\n');

    linesArray.forEach(line => {
      let currentLine = line;
      while (currentLine.length > 0) {
        // Check if cursor is at the start of a line, otherwise use remaining space
        const availableSpace = config.value.cols - cursorPos.value.x;
        const segment = currentLine.substring(0, availableSpace);

        writeTextAt(segment, cursorPos.value.x, cursorPos.value.y);

        // Update cursor position based on segment length
        cursorPos.value.x += segment.length;

        // Handle line wrap or end of segment
        if (cursorPos.value.x >= config.value.cols) {
          newLine(scrollUp); // Move to next line, scroll if needed
        }

        // Move to the next part of the original line
        currentLine = currentLine.substring(availableSpace);
      }
      // After processing a full original line (or wrapped parts), move to next line
      if (currentLine.length === 0) { // Ensure we only add newline if the line wasn't just wrapped
          newLine(scrollUp);
      }
    });
  };


  return {
    grid,
    cursorPos,
    config, // Expose reactive config
    writeTextAt,
    writeTextCentered,
    writeChar,
    deleteChar,
    newLine: () => newLine(scrollUp), // Expose bound newLine
    scrollUp,
    moveCursor,
    loadDemoContent,
    loadWelcomeScreen,
    resetGrid,
    clearGrid, // Expose clearGrid
    updateConfig, // Expose updateConfig
    writeLines, // Expose writeLines
  };
}
