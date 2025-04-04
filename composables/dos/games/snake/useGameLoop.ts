import { ref, onUnmounted } from 'vue';

interface GameLoopOptions {
  updateCallback: () => void; // Function to update game state
  renderCallback: () => void; // Function to render the frame
  loopIntervalMs?: number; // Optional interval time
}

export function useGameLoop(options: GameLoopOptions) {
  const { updateCallback, renderCallback, loopIntervalMs = 150 } = options;
  const gameLoopInterval = ref<ReturnType<typeof setInterval> | null>(null);
  const isRunning = ref(false);

  const gameTick = () => {
    if (!isRunning.value) return;
    updateCallback();
    renderCallback();
  };

  const startGameLoop = () => {
    if (isRunning.value) return; // Prevent multiple loops
    isRunning.value = true;
    // Clear any existing interval just in case
    if (gameLoopInterval.value) {
      clearInterval(gameLoopInterval.value);
    }
    gameLoopInterval.value = setInterval(gameTick, loopIntervalMs);
    // Run first tick immediately
    gameTick();
  };

  const stopGameLoop = () => {
    isRunning.value = false;
    if (gameLoopInterval.value) {
      clearInterval(gameLoopInterval.value);
      gameLoopInterval.value = null;
    }
  };

  // Ensure loop is stopped when the component using this composable unmounts
  onUnmounted(() => {
    stopGameLoop();
  });

  return {
    startGameLoop,
    stopGameLoop,
    isRunning,
  };
}
