import { ref } from 'vue';

export interface CursorPosition {
  x: number;
  y: number;
}

export interface CursorConfig {
  blinkIntervalMs: number;
  cols: number;
  rows: number;
}

const _config: CursorConfig = {
  blinkIntervalMs: 500,
  cols: 80,
  rows: 25,
};

export function useCursor(config: CursorConfig = _config) {
  const cursorPos = ref<CursorPosition>({ x: 0, y: 0 });
  const cursorVisible = ref(true);

  // Move cursor in a specified direction
  const moveCursor = (direction: 'left' | 'right') => {
    switch (direction) {
      case 'left':
        if (cursorPos.value.x > 0) cursorPos.value.x--;
        break;
      case 'right':
        if (cursorPos.value.x < config.cols - 1) cursorPos.value.x++;
        break;
    }
  };

  // Move cursor to specific position
  const setCursorPosition = (x: number, y: number) => {
    if (x >= 0 && x < config.cols && y >= 0 && y < config.rows) {
      cursorPos.value = { x, y };
    }
  };

  // Handle new line (Enter key)
  const newLine = (scrollUp?: () => void) => {
    cursorPos.value.x = 0;
    if (cursorPos.value.y < config.rows - 1) {
      cursorPos.value.y++;
    } else if (scrollUp) {
      scrollUp();
    }
  };

  // Reset cursor position
  const resetCursor = () => {
    cursorPos.value = { x: 0, y: 0 };
  };

  return {
    cursorPos,
    cursorVisible,
    moveCursor,
    setCursorPosition,
    newLine,
    resetCursor,
  };
}
