import type { GridApi } from '~/composables/dos/useDosCommands';

// Basic types
export interface Position {
  x: number;
  y: number;
}

export type Direction = 'up' | 'down' | 'left' | 'right';

// Game state structure
export interface GameState {
  snakeBody: Ref<Position[]>;
  foodPosition: Ref<Position | null>;
  score: Ref<number>;
  isGameOver: Ref<boolean>;
  direction: Ref<Direction>;
  trails: Ref<Set<string>>; // For Tron mode
  gameWidth: Ref<number>;
  gameHeight: Ref<number>;
  activeMode: Ref<SnakeModeStrategy | null>; // Added ref for the active mode strategy
  // Add refs for powerups, gateways etc. later
}

// Options passed when starting the game
export interface SnakeGameOptions {
  isTron: boolean;
  // Add future options here
}

// Interface for different game mode logic
export interface SnakeModeStrategy {
  // Called when the mode is activated or game resets
  reset(gameState: GameState): void;
  // Called every game loop tick to update mode-specific state (e.g., trails)
  update(gameState: GameState): void;
  // Checks for mode-specific collisions (e.g., trails in Tron)
  checkCollision(head: Position, gameState: GameState): boolean;
  // Handles logic when food is eaten (might differ per mode)
  onFoodEaten(gameState: GameState): void;
   // Optional: Renders mode-specific elements (e.g., trails)
  render?(gridApi: GridApi, gameState: GameState): void;
  // Optional: Returns info strings for the sidebar
  getSidebarInfo?(): string[];
}
