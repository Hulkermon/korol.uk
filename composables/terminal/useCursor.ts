interface CursorPosition {
  x: number;
  y: number;
}

export interface CursorConfig {
  blinkIntervalMs: number;
}

const _config: CursorConfig = {
  blinkIntervalMs: 500,
};

export function useCursor(config: CursorConfig = _config) {
  const cursorPos = ref<CursorPosition>({ x: 0, y: 0 });
  const cursorVisible = ref(true);
  const blinkIntervalMs = ref(500);

  return {
    cursorPos,
    cursorVisible,
  };
}
