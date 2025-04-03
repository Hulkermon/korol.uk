import { ref, type Ref, onUnmounted } from 'vue';
import type { GridConfig } from './useCrtGrid';
import type { CursorPosition } from './useCursor';

export function useCrtRenderer(
  canvas: Ref<HTMLCanvasElement | null>,
  grid: Ref<string[][]>,
  cursorPos: Ref<CursorPosition>,
  config: Ref<GridConfig> // Accept reactive config
) {
  let ctx: CanvasRenderingContext2D | null = null;
  let animationFrameId: number | null = null;
  let vignetteGradient: CanvasGradient | null = null;

  // Set up canvas dimensions and context
  const setupCanvas = () => {
    if (!canvas.value) return;

    const width = config.value.cols * config.value.cellWidth; // Use .value
    const height = config.value.rows * config.value.cellHeight; // Use .value

    canvas.value.width = width;
    canvas.value.height = height;

    ctx = canvas.value.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingEnabled = false;

      // Font and glow might need to be reset if config changes, handle in render?
      // Or assume they don't change often after initial setup. Let's keep setup here for now.
      ctx.font = `${config.value.cellHeight * 0.8}px Courier New`; // Use .value
      ctx.textBaseline = 'middle';

      // Create the vignette gradient once (assuming size doesn't change)
      vignetteGradient = ctx.createRadialGradient(
        width / 2,
        height / 2,
        height / 10,
        width / 2,
        height / 2,
        width
      );
      vignetteGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
      vignetteGradient.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
    }
  };

  // Main render function
  const render = () => {
    if (!ctx || !canvas.value || !grid.value) return;

    const width = config.value.cols * config.value.cellWidth; // Use .value
    const height = config.value.rows * config.value.cellHeight; // Use .value

    // Clear the canvas
    ctx.fillStyle = config.value.backgroundColor || '#0a0a0a'; // Use .value
    ctx.fillRect(0, 0, canvas.value.width, canvas.value.height);

    // Set dynamic properties for each frame
    ctx.shadowColor = config.value.charColor; // Use .value
    ctx.shadowBlur = config.value.glowStrength || 0; // Use .value
    ctx.fillStyle = config.value.charColor; // Use .value

    // Draw each character in the grid
    for (let y = 0; y < grid.value.length; y++) {
      for (let x = 0; x < grid.value[y].length; x++) {
        const char = grid.value[y][x];
        if (char !== ' ') {
          // Fill style is already set above
          ctx.fillText(
            char,
            x * config.value.cellWidth + config.value.cellWidth * 0.15, // Use .value
            y * config.value.cellHeight + config.value.cellHeight / 2 // Use .value
          );
        }
      }
    }

    // Draw cursor (blinking)
    const cursorVisible = Math.floor(Date.now() / 500) % 2 === 0;
    if (cursorVisible) {
      // Fill style is already set above
      ctx.fillRect(
        cursorPos.value.x * config.value.cellWidth, // Use .value
        cursorPos.value.y * config.value.cellHeight + config.value.cellHeight * 0.8, // Use .value
        config.value.cellWidth * 0.8, // Use .value
        config.value.cellHeight * 0.2 // Use .value
      );
    }

    // Apply CRT effects
    applyCrtEffects(width, height);

    // Request next frame
    animationFrameId = requestAnimationFrame(render);
  };

  // Apply CRT visual effects (scanlines, vignette, etc.)
  const applyCrtEffects = (width: number, height: number) => {
    if (!ctx) return;

    // Draw scan lines
    ctx.fillStyle = `rgba(0, 0, 0, ${config.value.scanlineOpacity || 0.15})`; // Use .value
    for (let y = 0; y < height; y += 2) {
      ctx.fillRect(0, y, width, 1);
    }

    // CRT vignette effect (darker corners)
    if (vignetteGradient) {
      ctx.fillStyle = vignetteGradient;
      ctx.fillRect(0, 0, width, height);
    }

    // Random slight noise/flicker effect
    if (Math.random() > 0.98) {
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.02})`;
      ctx.fillRect(0, 0, width, height);
    }
  };

  // Start the rendering loop
  const startRendering = () => {
    setupCanvas();
    render();
  };

  // Stop the rendering loop
  const stopRendering = () => {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  };

  // Handle window resize
  const handleResize = () => {
    setupCanvas();
  };

  // Clean up on unmount
  onUnmounted(() => {
    stopRendering();
  });

  return {
    setupCanvas,
    startRendering,
    stopRendering,
    handleResize,
  };
}
