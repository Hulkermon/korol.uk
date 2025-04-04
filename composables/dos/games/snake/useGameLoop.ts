import { ref, onUnmounted } from 'vue';

interface GameLoopOptions {
  updateCallback: () => void; // Function to update game state
  renderCallback: () => void; // Function to render the frame
  loopIntervalMs?: number; // Optional interval time
}

export function useGameLoop(options: GameLoopOptions) {
  const { updateCallback, renderCallback } = options;
  const loopIntervalMs = ref(options.loopIntervalMs || 150); // Make interval reactive
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
    // Use the reactive interval ref
    gameLoopInterval.value = setInterval(gameTick, loopIntervalMs.value);
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

  // Function to change the loop interval
  const setLoopInterval = (newMs: number) => {
      if (newMs <= 0) {
          console.warn("Loop interval must be positive.");
          return;
      }
      const currentlyRunning = isRunning.value;
      if (currentlyRunning) {
          stopGameLoop(); // Clear the existing interval
      }
      loopIntervalMs.value = newMs; // Update the interval duration ref
      // If it was running before, start it again with the new interval
      if (currentlyRunning) {
          startGameLoop();
      }
  };

  return {
    startGameLoop,
    stopGameLoop,
    setLoopInterval, // Expose the new function
    isRunning,
    loopIntervalMs // Expose the reactive interval if needed elsewhere
  };
}
