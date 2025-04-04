import { ref, type Ref, computed } from 'vue'; // Import computed
import { type useCrtGrid } from '@/composables/terminal/useCrtGrid'; // Import the composable itself

// Infer the type from the return value of useCrtGrid
type GridApi = ReturnType<typeof useCrtGrid>;

// Define the options structure expected by startGame
interface SnakeGameOptions {
  isTron: boolean;
  // Add future options here
}

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
const SIDEBAR_V = '│'; // Character for sidebar separator
const SNAKE_HEAD = 'O';
const SNAKE_BODY = 'o';
const FOOD = '*';
const TRON_TRAIL = '.';

export function useSnakeGame() {
  const snakeBody = ref<Position[]>([]);
  const foodPosition = ref<Position | null>(null);
  const direction = ref<Direction>('right');
  const score = ref(0);
  const isGameOver = ref(false);
  const gameLoopInterval = ref<ReturnType<typeof setInterval> | null>(null);
  const gridApi = ref<GridApi | null>(null);
  const gridConfig = ref<{ cols: number; rows: number } | null>(null);

  // Game options
  const isTronMode = ref(false);
  const trails = ref<Set<string>>(new Set()); // Set to store "x,y" trail coordinates

  // Layout
  const sidebarWidth = ref(20); // Width of the sidebar area
  const gameWidth = ref(0); // Play area width
  const gameHeight = ref(0); // Play area height (excluding borders)
  const gameOffsetX = ref(0); // Always 0 for left border
  const gameOffsetY = ref(0); // Always 0 for top border

  let inputBuffer: Direction | null = null; // Buffer next direction input

  // --- Helper Functions ---
  const getRandomPosition = (): Position => {
    if (!gridConfig.value) return { x: 0, y: 0 };
    // Ensure spawning within the game area (inside borders)
    const x = gameOffsetX.value + 1 + Math.floor(Math.random() * (gameWidth.value - 2));
    const y = gameOffsetY.value + 1 + Math.floor(Math.random() * (gameHeight.value - 2));
    return { x, y };
  };

  const posToString = (pos: Position): string => `${pos.x},${pos.y}`;

  const placeFood = () => {
    if (!gridConfig.value) return;
    let newFoodPos: Position;
    do {
      newFoodPos = getRandomPosition();
    } while (snakeBody.value.some(segment => segment.x === newFoodPos.x && segment.y === newFoodPos.y));
    foodPosition.value = newFoodPos;
  };

  // --- Rendering Functions ---
  const drawBorderAndSidebar = () => {
    if (!gridApi.value || !gridConfig.value) return;
    const api = gridApi.value;
    const { rows } = gridConfig.value;
    const gw = gameWidth.value; // Use calculated game width

    // Top border (Row 0 of game area)
    api.writeTextAt(BORDER_TL, 0, 0);
    for (let x = 1; x < gw -1; x++) api.writeTextAt(BORDER_H, x, 0);
    api.writeTextAt(BORDER_TR, gw - 1, 0);

    // Bottom border (Row rows-1)
    api.writeTextAt(BORDER_BL, 0, rows - 1);
    for (let x = 1; x < gw - 1; x++) api.writeTextAt(BORDER_H, x, rows - 1);
    api.writeTextAt(BORDER_BR, gw - 1, rows - 1);

    // Left border (Col 0)
    for (let y = 1; y < rows - 1; y++) {
      api.writeTextAt(BORDER_V, 0, y);
    }

    // Sidebar separator (Col gw)
    for (let y = 0; y < rows; y++) {
        api.writeTextAt(SIDEBAR_V, gw, y);
    }
  };

  const drawSidebarContent = () => {
     if (!gridApi.value || !gridConfig.value) return;
     const api = gridApi.value;
     const { rows } = gridConfig.value;
     const sidebarX = gameWidth.value + 2; // Start drawing 2 cols after separator
     const availableSidebarWidth = gridConfig.value.cols - gameWidth.value - 1;

     // Clear sidebar area first (optional, but good practice)
     for (let y = 0; y < rows; y++) {
         api.writeTextAt(' '.repeat(availableSidebarWidth), sidebarX -1 , y); // Clear from separator onwards
     }

     // Draw Score
     const scoreText = `Score: ${score.value}`;
     api.writeTextAt(scoreText, sidebarX, 2);

     // Draw Mode Indicator
     if (isTronMode.value) {
         api.writeTextAt("[TRON]", sidebarX, 4);
     }
     // Add other mode indicators later (Powerups, Gateways)

     // Add legend later if needed
  };

  const drawGameOver = () => {
    if (!gridApi.value || !gridConfig.value) return;
    // Draw within the game area
    const api = gridApi.value;
    const { rows } = gridConfig.value;
    const centerX = Math.floor(gameWidth.value / 2); // Center within game area
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
    drawBorderAndSidebar(); // Draw new layout
    drawSidebarContent(); // Draw sidebar info

    if (isGameOver.value) {
      drawGameOver();
      // Stop further game logic processing for this tick
      return;
    }

    // --- Tron Mode: Add trail before moving ---
    const lastSegment = snakeBody.value[snakeBody.value.length - 1];
    if (isTronMode.value && lastSegment) {
        trails.value.add(posToString(lastSegment));
    }

    // --- Process Input ---
    if (inputBuffer) {
        const currentDir = direction.value;
        // Prevent immediate reversal
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

    // --- Collision Detection ---
    const hitLeftWall = head.x <= gameOffsetX.value; // Hit left border at x=0
    const hitRightWall = head.x >= gameWidth.value - 1; // Hit right border at x=gameWidth-1
    const hitTopWall = head.y <= gameOffsetY.value; // Hit top border at y=0
    const hitBottomWall = head.y >= gameHeight.value -1; // Hit bottom border at y=rows-1
    const hitSelf = snakeBody.value.slice(1).some(segment => segment.x === head.x && segment.y === head.y);
    const hitTrail = isTronMode.value && trails.value.has(posToString(head));

    if (hitLeftWall || hitRightWall || hitTopWall || hitBottomWall || hitSelf || hitTrail) {
      isGameOver.value = true;
      stopGame();
      // Redraw one last time to show game over screen
      api.clearGrid();
      drawBorderAndSidebar();
      drawSidebarContent();
      drawGameOver();
      return; // Exit loop
    }

    // --- Move Snake ---

    // Move snake
    snakeBody.value.unshift(head); // Add new head

    // Check for food collision
    if (foodPosition.value && head.x === foodPosition.value.x && head.y === foodPosition.value.y) {
      score.value++;
      placeFood(); // Place new food
      // Don't remove tail, snake grows
    } else if (!isTronMode.value) { // In Tron mode, trails handle the "tail"
        snakeBody.value.pop(); // Remove tail if no food eaten and not Tron
    } else if (snakeBody.value.length > 1) {
        // In Tron mode, still need to pop if no food eaten, unless snake is just the head
         snakeBody.value.pop();
    }


    // --- Render Game Elements ---
    // Draw Trails (if Tron)
    if (isTronMode.value) {
        trails.value.forEach(trailPosStr => {
            const [tx, ty] = trailPosStr.split(',').map(Number);
            api.writeTextAt(TRON_TRAIL, tx, ty);
        });
    }

    // Draw Food
    if (foodPosition.value) {
      api.writeTextAt(FOOD, foodPosition.value.x, foodPosition.value.y);
    }

    // Draw Snake
    snakeBody.value.forEach((segment, index) => {
      api.writeTextAt(index === 0 ? SNAKE_HEAD : SNAKE_BODY, segment.x, segment.y);
    });
  };

  // --- Game Lifecycle Functions ---
  const startGame = (api: GridApi, options: SnakeGameOptions) => { // Accept options
    gridApi.value = api;
    gridConfig.value = { cols: api.config.value.cols, rows: api.config.value.rows };

    // Set game options
    isTronMode.value = options.isTron;

    // Calculate game dimensions based on sidebar
    gameWidth.value = gridConfig.value.cols - sidebarWidth.value;
    gameHeight.value = gridConfig.value.rows; // Use full height for game area now

    resetGame(); // Initialize state and start loop
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
    trails.value.clear(); // Clear trails on reset

    // Initial snake position within the new game area bounds
    const startX = gameOffsetX.value + 1 + Math.floor((gameWidth.value - 2) / 2);
    const startY = gameOffsetY.value + 1 + Math.floor((gameHeight.value - 2) / 2);
    snakeBody.value = [{ x: startX, y: startY }];
    // Add initial body segment only if not in Tron mode (Tron starts as single head)
    if (!isTronMode.value) {
        snakeBody.value.push({ x: startX - 1, y: startY });
    }


    placeFood(); // Place initial food

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
