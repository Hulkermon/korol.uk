import type { SnakeModeStrategy, GameState, Position } from '../types';
import type { GridApi } from '~/composables/dos/useDosCommands';

// Classic mode doesn't add trails or special collisions/rendering
export const classicMode: SnakeModeStrategy = {
  reset(gameState: GameState): void {
    // Classic mode specific reset if any (e.g., clear powerups if they existed)
    // Ensure trails are clear even if switching from Tron
    gameState.trails.value.clear();
  },

  update(gameState: GameState): void {
    // No specific state updates needed for classic mode per tick
  },

  checkCollision(head: Position, gameState: GameState): boolean {
    // Classic mode only checks for self-collision (wall collision is handled universally)
    const hitSelf = gameState.snakeBody.value
      .slice(1)
      .some((segment) => segment.x === head.x && segment.y === head.y);
    return hitSelf;
  },

  onFoodEaten(gameState: GameState): void {
    // Standard behavior: snake grows (handled by not popping tail in core logic)
    // No extra actions needed for classic mode
  },

  // No specific rendering needed for classic mode
  render(gridApi: GridApi, gameState: GameState): void {
    // No-op
  },

  getSidebarInfo(): string[] {
    return ['[ CLASSIC ]']; // Return mode name
  },
};
