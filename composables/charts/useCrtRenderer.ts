import { ref, type Ref, onUnmounted } from 'vue';
import type { GridConfig, CursorPosition } from '../terminal/useCrtGrid';

export function useCrtRenderer(
  canvas: Ref<HTMLCanvasElement | null>,
  grid: Ref<string[][]>,
  cursorPos: Ref<CursorPosition>,
  config: GridConfig
) {
  let ctx: CanvasRenderingContext2D | null = null;
  let animationFrameId: number | null = null;
  let vignetteGradient: CanvasGradient | null = null;

  // Set up canvas dimensions and context
  const setupCanvas = () => {
    if (!canvas.value) return;

    const width = config.cols * config.cellWidth;
    const height = config.rows * config.cellHeight;

    canvas.value.width = width;
    canvas.value.height = height;

    ctx = canvas.value.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingEnabled = false;
      
      // Set up font configuration once
      ctx.font = `${config.cellHeight * 0.8}px Courier New`;
      ctx.textBaseline = 'middle';
      
      // Set up glow effect configuration once
      ctx.shadowColor = config.charColor;
      ctx.shadowBlur = config.glowStrength || 0;
      
      // Create the vignette gradient once
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

    const width = config.cols * config.cellWidth;
    const height = config.rows * config.cellHeight;

    // Clear the canvas
    ctx.fillStyle = config.backgroundColor || '#0a0a0a';
    ctx.fillRect(0, 0, canvas.value.width, canvas.value.height);

    // Draw each character in the grid
    for (let y = 0; y < grid.value.length; y++) {
      for (let x = 0; x < grid.value[y].length; x++) {
        const char = grid.value[y][x];
        if (char !== ' ') {
          ctx.fillStyle = config.charColor;
          ctx.fillText(
            char,
            x * config.cellWidth + config.cellWidth * 0.15,
            y * config.cellHeight + config.cellHeight / 2
          );
        }
      }
    }

    // Draw cursor (blinking)
    const cursorVisible = Math.floor(Date.now() / 500) % 2 === 0;
    if (cursorVisible) {
      ctx.fillStyle = config.charColor;
      ctx.fillRect(
        cursorPos.value.x * config.cellWidth,
        cursorPos.value.y * config.cellHeight + config.cellHeight * 0.8,
        config.cellWidth * 0.8,
        config.cellHeight * 0.2
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
    ctx.fillStyle = `rgba(0, 0, 0, ${config.scanlineOpacity || 0.15})`;
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
