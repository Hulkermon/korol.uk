import { ref, computed, type Ref } from 'vue';
import { useGameLoop } from './useGameLoop';
import { useSnakeRenderer } from './useSnakeRenderer';
import { classicMode } from './modes/classic';
import { tronMode } from './modes/tron';
import { powerupsMode } from './modes/powerups';
import type {
    GameState,
    Position,
    Direction,
    SnakeGameOptions,
    SnakeModeStrategy,
    Powerup, // Import Powerup type
    ActiveEffect // Import ActiveEffect type
} from './types';
import type { GridApi } from '~/composables/dos/useDosCommands'; // Correct import path for GridApi

// Helper function (could be moved to a shared utility)
const posToString = (pos: Position): string => `${pos.x},${pos.y}`;

export function useSnakeGame() {
    // --- Core Game State ---
    const snakeBody = ref<Position[]>([]);
    const foodPosition = ref<Position | null>(null);
    const score = ref(0);
    const isGameOver = ref(false);
    const direction = ref<Direction>('right');
    const trails = ref<Set<string>>(new Set());

    // --- Powerup State ---
    const powerups = ref<Powerup[]>([]);
    const activeEffect = ref<ActiveEffect | null>(null);
    const popupMessage = ref<{ text: string; endTime: number } | null>(null); // Added popup state

    // --- Layout & Config ---
    const gridApi = ref<GridApi | null>(null);
    const gridConfig = ref<{ cols: number; rows: number } | null>(null);
    const sidebarWidth = ref(20);
    const gameWidth = ref(0);
    const gameHeight = ref(0);
    const gameOffsetX = ref(0); // Keep for consistency, though likely always 0
    const gameOffsetY = ref(0); // Keep for consistency, though likely always 0

    // --- Mode Management ---
    const activeMode = ref<SnakeModeStrategy | null>(null);

    // --- Input ---
    let inputBuffer: Direction | null = null;

    // --- Composables ---
    // Combine state refs into a single object for the renderer and strategies
    const gameState = computed<GameState | null>(() => {
        // Check if essential refs are set before creating the state object
        if (!gridConfig.value) return null;
        return {
            snakeBody,
            foodPosition,
            score,
            isGameOver,
            direction,
            trails,
            gameWidth,
            gameHeight,
            activeMode,
            powerups, // Add powerups state
            activeEffect,
            popupMessage, // Add popup state to computed gameState
            getRandomPosition: getRandomPosition, // Expose helper
            getSpeed: () => gameLoop.loopIntervalMs, // Expose current speed getter
            setSpeed: (ms: number) => gameLoop.setLoopInterval(ms) // Expose speed setter
        };
    });

    const renderer = useSnakeRenderer(gridApi as Ref<any>, gameState); // passing as Ref<any> to avoid type issues. Don't worry it works.......
    const gameLoop = useGameLoop({
        updateCallback: gameUpdate,
        renderCallback: renderer.renderFrame, // Use renderer's frame function
        loopIntervalMs: 150 // Keep default speed for now
    });

    // --- Helper Functions ---
    const getRandomPosition = (): Position => {
        if (!gridConfig.value) return { x: 0, y: 0 };
        const x = gameOffsetX.value + 1 + Math.floor(Math.random() * (gameWidth.value - 2));
        const y = gameOffsetY.value + 1 + Math.floor(Math.random() * (gameHeight.value - 2));
        return { x, y };
    };

    const placeFood = () => {
        if (!gridConfig.value) return;
        let newFoodPos: Position;
        do {
            newFoodPos = getRandomPosition();
            // Ensure food doesn't spawn on trails either
        } while (
            snakeBody.value.some(segment => segment.x === newFoodPos.x && segment.y === newFoodPos.y) ||
            (activeMode.value === tronMode && trails.value.has(posToString(newFoodPos)))
        );
        foodPosition.value = newFoodPos;
    };

    // --- Core Game Logic (Update Callback for Game Loop) ---
    function gameUpdate() {
        if (isGameOver.value || !gameState.value) return; // Don't update if game over or state not ready

        const currentState = gameState.value; // Use the computed state

        // 1. Process Input Buffer
        if (inputBuffer) {
            const currentDir = direction.value;
            if (
                !(inputBuffer === 'up' && currentDir === 'down') &&
                !(inputBuffer === 'down' && currentDir === 'up') &&
                !(inputBuffer === 'left' && currentDir === 'right') &&
                !(inputBuffer === 'right' && currentDir === 'left')
            ) {
                direction.value = inputBuffer;
            }
            inputBuffer = null;
        }

        // 2. Update Mode State (e.g., add trails for Tron)
        activeMode.value?.update(currentState);

        // 3. Calculate New Head Position
        const head = { ...snakeBody.value[0] };
        switch (direction.value) {
            case 'up': head.y--; break;
            case 'down': head.y++; break;
            case 'left': head.x--; break;
            case 'right': head.x++; break;
        }

        // 4. Check Collisions
        const hitLeftWall = head.x <= gameOffsetX.value;
        const hitRightWall = head.x >= gameWidth.value - 1;
        const hitTopWall = head.y <= gameOffsetY.value;
        const hitBottomWall = head.y >= gameHeight.value - 1;

        // Check mode-specific collisions (like trails or powerups)
        // Note: Powerup collision check in powerupsMode returns false if powerup collected
        const modeCollision = activeMode.value?.checkCollision(head, currentState) || false;

        // Check if invincible
        const isInvincible = currentState.activeEffect.value?.type === 'INVINCIBILITY';

        // Only trigger game over if not invincible
        if (!isInvincible && (hitLeftWall || hitRightWall || hitTopWall || hitBottomWall || modeCollision)) {
            isGameOver.value = true;
            gameLoop.stopGameLoop(); // Stop the loop
            // No need to redraw here, renderCallback will handle showing game over screen
            return;
        }

        // 5. Move Snake
        snakeBody.value.unshift(head);

        // 6. Check Food Collision
        let foodEaten = false;
        if (foodPosition.value && head.x === foodPosition.value.x && head.y === foodPosition.value.y) {
            foodEaten = true;
            score.value++;
            activeMode.value?.onFoodEaten(currentState); // Notify mode about food
            placeFood();
        }

        // 7. Handle Tail (Pop if no food eaten)
        if (!foodEaten) {
            // Let the mode decide if the tail should be popped (e.g., Tron might not pop)
            // Default behavior is to pop. Modes can override if needed via onFoodEaten or update.
            // For now, assume classic tail popping unless mode handles it differently.
            // Revisit this if modes need more complex tail logic.
             if (snakeBody.value.length > 1) { // Don't pop if only head exists
                 snakeBody.value.pop();
             }
        }

        // 8. Handle Popup Message Expiration
        if (popupMessage.value && Date.now() >= popupMessage.value.endTime) {
            popupMessage.value = null;
        }
    }

    // --- Game Lifecycle Functions ---
    const resetGameInternals = () => {
        score.value = 0;
        isGameOver.value = false;
        direction.value = 'right';
        inputBuffer = null;
        powerups.value = [];
        activeEffect.value = null;
        popupMessage.value = null; // Clear popup on reset

        // Initial snake position
        const startX = gameOffsetX.value + 1 + Math.floor((gameWidth.value - 2) / 2);
        const startY = gameOffsetY.value + 1 + Math.floor((gameHeight.value - 2) / 2);
        snakeBody.value = [{ x: startX, y: startY }];

        // Add initial body segment only if not in Tron mode
        if (activeMode.value !== tronMode) {
             snakeBody.value.push({ x: startX - 1, y: startY });
        }

        placeFood();
    };

    const startGame = (api: GridApi, options: SnakeGameOptions) => {
        gridApi.value = api;
        gridConfig.value = { cols: api.config.value.cols, rows: api.config.value.rows };

        // Calculate layout
        gameWidth.value = gridConfig.value.cols - sidebarWidth.value;
        gameHeight.value = gridConfig.value.rows;

        // Select and reset active mode based on options
        if (options.isTron) {
            activeMode.value = tronMode;
        } else if (options.enablePowerups) {
            activeMode.value = powerupsMode;
        } else {
            activeMode.value = classicMode;
        }
        // Ensure gameState is available before resetting mode
        if (gameState.value) {
             activeMode.value.reset(gameState.value);
        } else {
             console.error("GameState not available during startGame reset");
             // Handle error appropriately, maybe return or throw
        }


        // Reset core game state
        resetGameInternals();

        // Start the loop
        gameLoop.startGameLoop();
    };

    const stopGame = () => {
        gameLoop.stopGameLoop();
    };

    const resetGame = () => {
        if (!gameState.value) return; // Cannot reset if state is not initialized
        // Reset mode state first
        activeMode.value?.reset(gameState.value);
        // Reset core game state
        resetGameInternals();
        // if (!gameLoop.isRunning.value) {
            gameLoop.startGameLoop(); // Will immediately call gameTick
        // } else {
        //      // If reset is called while game over, need to manually render the first frame
        //      renderer.renderFrame();
        // }
    };

    // --- Input Handling ---
    const changeDirection = (newDirection: Direction) => {
        // Buffer input to prevent issues with multiple inputs per tick
        inputBuffer = newDirection;
    };

    // --- Exposed Methods & State ---
    return {
        startGame,
        stopGame,
        resetGame,
        changeDirection,
        isGameOver, // Still needed by Terminal component for 'R' key
    };
}
