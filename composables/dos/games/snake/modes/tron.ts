import type { SnakeModeStrategy, GameState, Position } from '../types';
import type { GridApi } from '~/composables/dos/useDosCommands';

// Helper function (could be moved to a shared utility)
const posToString = (pos: Position): string => `${pos.x},${pos.y}`;

// Character for the trail
const TRON_TRAIL = '.';

export const tronMode: SnakeModeStrategy = {
    reset(gameState: GameState): void {
        // Clear trails when Tron mode resets
        gameState.trails.value.clear();
    },

    update(gameState: GameState): void {
        // Add the snake's tail position to trails before it potentially moves/gets popped
        const lastSegment = gameState.snakeBody.value[gameState.snakeBody.value.length - 1];
        if (lastSegment) {
            gameState.trails.value.add(posToString(lastSegment));
        }
    },

    checkCollision(head: Position, gameState: GameState): boolean {
        // Check for collision with existing trails
        const hitTrail = gameState.trails.value.has(posToString(head));
        // Also check for self-collision (important if snake can grow long even in Tron)
        const hitSelf = gameState.snakeBody.value.slice(1).some(segment => segment.x === head.x && segment.y === head.y);
        return hitTrail || hitSelf;
    },

    onFoodEaten(gameState: GameState): void {
        // Snake grows normally when eating food, even in Tron mode
        // The core logic handles not popping the tail
    },

    render(gridApi: GridApi, gameState: GameState): void {
        // Draw the trails
        gameState.trails.value.forEach(trailPosStr => {
            const [tx, ty] = trailPosStr.split(',').map(Number);
            // Avoid drawing trail over the snake head/body if possible (optional refinement)
            if (!gameState.snakeBody.value.some(seg => seg.x === tx && seg.y === ty)) {
                 gridApi.writeTextAt(TRON_TRAIL, tx, ty);
            }
        });
    },

    getSidebarInfo(): string[] {
        return ["[TRON]"]; // Indicate Tron mode is active
    }
};
