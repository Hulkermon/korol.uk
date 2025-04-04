import { ref, type Ref } from 'vue';
import { type useCrtGrid } from '@/composables/terminal/useCrtGrid'; // Import the composable itself

// Infer the type from the return value of useCrtGrid
type GridApi = ReturnType<typeof useCrtGrid>;

interface Position {
  x: number;
  y: number;
}

type Direction = 'up' | 'down' | 'left' | 'right';

// Define ASCII characters for border
const BORDER_TL = '╔';
const BORDER_TR = '╗';
const BORDER_BL = '╚';
const BORDER_BR = '╝';
const BORDER_H = '═';
const BORDER_V = '║';
const SNAKE_HEAD = 'O';
const SNAKE_BODY = 'o';
const FOOD = '*';

export function useSnakeGame() {
  const snakeBody = ref<Position[]>([]);
  const foodPosition = ref<Position | null>(null);
  const direction = ref<Direction>('right');
  const score = ref(0);
  const isGameOver = ref(false);
  const gameLoopInterval = ref<ReturnType<typeof setInterval> | null>(null); // Use correct interval type
  const gridApi = ref<GridApi | null>(null);
  const gridConfig = ref<{ cols: number; rows: number } | null>(null);

  const gameWidth = ref(0);
  const gameHeight = ref(0);
  const gameOffsetX = ref(0); // Left border offset
  const gameOffsetY = ref(1); // Top border offset + score line

  let inputBuffer: Direction | null = null; // Buffer next direction input

  const getRandomPosition = (): Position => {
    if (!gridConfig.value) return { x: 0, y: 0 }; // Should not happen
    const x = gameOffsetX.value + Math.floor(Math.random() * gameWidth.value);
    const y = gameOffsetY.value + 1 + Math.floor(Math.random() * gameHeight.value); // +1 for top border
    return { x, y };
  };

  const placeFood = () => {
    if (!gridConfig.value) return;
    let newFoodPos: Position;
    do {
      newFoodPos = getRandomPosition();
    } while (snakeBody.value.some(segment => segment.x === newFoodPos.x && segment.y === newFoodPos.y));
    foodPosition.value = newFoodPos;
  };

  const drawBorder = () => {
    if (!gridApi.value || !gridConfig.value) return;
    const api = gridApi.value;
    const { cols, rows } = gridConfig.value;

    // Top border (Row 1)
    api.writeTextAt(BORDER_TL, 0, 1);
    for (let x = 1; x < cols - 1; x++) api.writeTextAt(BORDER_H, x, 1);
    api.writeTextAt(BORDER_TR, cols - 1, 1);

    // Bottom border (Row rows-1)
    api.writeTextAt(BORDER_BL, 0, rows - 1);
    for (let x = 1; x < cols - 1; x++) api.writeTextAt(BORDER_H, x, rows - 1);
    api.writeTextAt(BORDER_BR, cols - 1, rows - 1);

    // Left & Right borders
    for (let y = 2; y < rows - 1; y++) {
      api.writeTextAt(BORDER_V, 0, y);
      api.writeTextAt(BORDER_V, cols - 1, y);
    }
  };

  const drawScore = () => {
     if (!gridApi.value || !gridConfig.value) return;
     const api = gridApi.value;
     const { cols } = gridConfig.value;
     const scoreText = `Score: ${score.value}`;
     const scoreX = cols - scoreText.length - 2; // Right-aligned on row 0
     api.writeTextAt(' '.repeat(cols), 0, 0); // Clear score line first
     api.writeTextAt(scoreText, scoreX >= 0 ? scoreX : 0, 0);
  };

  const drawGameOver = () => {
    if (!gridApi.value || !gridConfig.value) return;
    const api = gridApi.value;
    const { cols, rows } = gridConfig.value;
    const centerX = Math.floor(cols / 2);
    const centerY = Math.floor(rows / 2);

    const gameOverMsg = "GAME OVER";
    const scoreMsg = `Final Score: ${score.value}`;
    const retryMsg = "Press R to Retry, ESC to Quit";

    api.writeTextAt(gameOverMsg, centerX - Math.floor(gameOverMsg.length / 2), centerY - 1);
    api.writeTextAt(scoreMsg, centerX - Math.floor(scoreMsg.length / 2), centerY);
    api.writeTextAt(retryMsg, centerX - Math.floor(retryMsg.length / 2), centerY + 2);
  };


  const gameLoop = () => {
    if (!gridApi.value || !gridConfig.value) return;
    const api = gridApi.value;

    api.clearGrid(); // Clear entire grid
    drawBorder();
    drawScore();

    if (isGameOver.value) {
      drawGameOver();
      // Stop further game logic processing for this tick
      return;
    }

    // Process buffered input
    if (inputBuffer) {
        // Prevent immediate reversal
        const currentDir = direction.value;
        if (
            !(inputBuffer === 'up' && currentDir === 'down') &&
            !(inputBuffer === 'down' && currentDir === 'up') &&
            !(inputBuffer === 'left' && currentDir === 'right') &&
            !(inputBuffer === 'right' && currentDir === 'left')
        ) {
            direction.value = inputBuffer;
        }
        inputBuffer = null; // Clear buffer
    }


    // Calculate new head position
    const head = { ...snakeBody.value[0] };
    switch (direction.value) {
      case 'up': head.y--; break;
      case 'down': head.y++; break;
      case 'left': head.x--; break;
      case 'right': head.x++; break;
    }

    // Check for collisions (walls and self)
    const hitLeftWall = head.x <= gameOffsetX.value;
    const hitRightWall = head.x >= gameOffsetX.value + gameWidth.value + 1; // +1 because border is at cols-1
    const hitTopWall = head.y <= gameOffsetY.value; // Border is at row 1
    const hitBottomWall = head.y >= gameOffsetY.value + gameHeight.value + 1; // Border is at rows-1
    const hitSelf = snakeBody.value.slice(1).some(segment => segment.x === head.x && segment.y === head.y);

    if (hitLeftWall || hitRightWall || hitTopWall || hitBottomWall || hitSelf) {
      isGameOver.value = true;
      stopGame(); // Stop the interval immediately
      // Redraw one last time to show game over screen
      api.clearGrid();
      drawBorder();
      drawScore();
      drawGameOver();
      return; // Exit loop
    }

    // Move snake
    snakeBody.value.unshift(head); // Add new head

    // Check for food collision
    if (foodPosition.value && head.x === foodPosition.value.x && head.y === foodPosition.value.y) {
      score.value++;
      placeFood(); // Place new food
      // Don't remove tail, snake grows
    } else {
      snakeBody.value.pop(); // Remove tail if no food eaten
    }

    // Draw food
    if (foodPosition.value) {
      api.writeTextAt(FOOD, foodPosition.value.x, foodPosition.value.y);
    }

    // Draw snake
    snakeBody.value.forEach((segment, index) => {
      api.writeTextAt(index === 0 ? SNAKE_HEAD : SNAKE_BODY, segment.x, segment.y);
    });
  };

  const startGame = (api: GridApi) => {
    gridApi.value = api;
    gridConfig.value = { cols: api.config.value.cols, rows: api.config.value.rows };
    gameWidth.value = gridConfig.value.cols - 2; // Account for left/right borders
    gameHeight.value = gridConfig.value.rows - 3; // Account for top/bottom borders and score line

    resetGame(); // Initialize and start loop
  };

  const stopGame = () => {
    if (gameLoopInterval.value) {
      clearInterval(gameLoopInterval.value);
      gameLoopInterval.value = null;
    }
  };

  const resetGame = () => {
    stopGame(); // Ensure any existing loop is stopped
    score.value = 0;
    isGameOver.value = false;
    direction.value = 'right';
    inputBuffer = null;

    // Initial snake position (centered-ish)
    const startX = gameOffsetX.value + Math.floor(gameWidth.value / 2);
    const startY = gameOffsetY.value + 1 + Math.floor(gameHeight.value / 2);
    snakeBody.value = [{ x: startX, y: startY }, { x: startX - 1, y: startY }];

    placeFood();

    // Start the game loop
    gameLoopInterval.value = setInterval(gameLoop, 150); // Adjust speed as needed
  };

  const changeDirection = (newDirection: Direction) => {
     // Buffer the input to be processed at the start of the next game loop tick
     // This prevents issues with multiple inputs within a single tick
     inputBuffer = newDirection;
  };

  return {
    startGame,
    stopGame,
    resetGame,
    changeDirection,
    isGameOver, // Expose for keyboard handler logic
  };
}
