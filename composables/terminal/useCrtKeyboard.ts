import { onMounted, onUnmounted } from 'vue';
import type { CursorPosition } from '../terminal/useCursor';

interface KeyboardHandlers {
  onCharInput?: (char: string) => void;
  onBackspace?: () => void;
  onEnter?: () => void;
  onArrow?: (direction: 'up' | 'down' | 'left' | 'right') => void;
}

export function useCrtKeyboard(handlers: KeyboardHandlers = {}) {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Prevent default behavior for keys that might cause browser actions
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Backspace'].includes(e.key)) {
      e.preventDefault();
    }
    
    // Handle special keys
    switch (e.key) {
      case 'Backspace':
      handlers.onBackspace?.();
      break;
      case 'Enter':
      handlers.onEnter?.();
      break;
      case 'ArrowLeft':
      handlers.onArrow?.('left');
      break;
      case 'ArrowRight':
      handlers.onArrow?.('right');
      break;
      case 'ArrowUp':
      handlers.onArrow?.('up');
      break;
      case 'ArrowDown':
      handlers.onArrow?.('down');
      break;
      default:
      if (e.key.length === 1) {
        // Handle regular character input
        handlers.onCharInput?.(e.key);
      }
      break;
    }
  };

  // Set up event listeners on mount
  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown);
  });

  // Clean up on unmount
  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown);
  });

  return {
    handleKeyDown,
  };
}
