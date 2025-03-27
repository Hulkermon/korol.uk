import { onMounted, onUnmounted } from 'vue';
import type { CursorPosition } from './useCrtGrid';

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
    if (e.key === 'Backspace') {
      handlers.onBackspace?.();
    } else if (e.key === 'Enter') {
      handlers.onEnter?.();
    } else if (e.key === 'ArrowLeft') {
      handlers.onArrow?.('left');
    } else if (e.key === 'ArrowRight') {
      handlers.onArrow?.('right');
    } else if (e.key === 'ArrowUp') {
      handlers.onArrow?.('up');
    } else if (e.key === 'ArrowDown') {
      handlers.onArrow?.('down');
    } else if (e.key.length === 1) {
      // Handle regular character input
      handlers.onCharInput?.(e.key);
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
