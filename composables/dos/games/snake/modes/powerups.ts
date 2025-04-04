import { type Ref } from 'vue';
// Import GridApi correctly from types
import type { SnakeModeStrategy, GameState, Position, Powerup, ActiveEffect, GridApi } from '../types'; // GridApi is correctly imported here now
import { POWERUP_DEFS, POWERUP_TYPES_ARRAY, type PowerupType } from '../powerups';
import { classicMode } from './classic'; // Use classic for base collision

// Helper function (could be moved to a shared utility)
const posToString = (pos: Position): string => `${pos.x},${pos.y}`;

// Helper to get random position (assuming it's defined in useSnakeGame or passed)
// For now, we'll assume getRandomPosition is available via gameState or context if needed,
// but ideally, spawning logic might live within the mode itself.
// Let's pass getRandomPosition via GameState for now.

// Add getRandomPosition to GameState interface in types.ts if not already there
// export interface GameState { ... getRandomPosition: () => Position; ... }

export const powerupsMode: SnakeModeStrategy = {
    reset(gameState: GameState): void {
        gameState.powerups.value = [];
        gameState.activeEffect.value = null;
        // Ensure classic reset is also called (e.g., clear trails)
        classicMode.reset(gameState);
    },

    update(gameState: GameState): void {
        // --- Spawn Powerups ---
        // Only spawn if no powerup exists and no effect is active (simplification)
        if (gameState.powerups.value.length === 0 && !gameState.activeEffect.value) {
            for (const type of POWERUP_TYPES_ARRAY) {
                const def = POWERUP_DEFS[type];
                if (Math.random() < def.spawnChance) {
                    let newPos: Position;
                    let attempts = 0;
                    const MAX_ATTEMPTS = 10; // Prevent infinite loop
                    do {
                        // Need access to getRandomPosition - assuming it's added to GameState
                        // @ts-ignore - Assuming getRandomPosition exists on gameState for now
                        newPos = gameState.getRandomPosition();
                        attempts++;
                    } while (
                        (gameState.foodPosition.value && newPos.x === gameState.foodPosition.value.x && newPos.y === gameState.foodPosition.value.y) &&
                        attempts < MAX_ATTEMPTS // Avoid infinite loop if space is tight
                    );

                    if (attempts < MAX_ATTEMPTS) {
                         gameState.powerups.value.push({ pos: newPos, type: def.type, symbol: def.symbol });
                         break; // Only spawn one powerup per eligible tick
                    }
                }
            }
        }

        // --- Handle Active Effect Expiration ---
        const effect = gameState.activeEffect.value;
        if (effect && Date.now() >= effect.endTime) {
            // Restore original state if needed (e.g., speed)
            if (effect.type === 'SLOWDOWN' && effect.originalSpeed) {
                 // Need access to set game speed - requires adding setSpeed to GameState/GameLoop
                 // @ts-ignore - Assuming setSpeed exists for now
                 gameState.setSpeed(effect.originalSpeed);
            }
            gameState.activeEffect.value = null; // Clear effect
        }

        // Call classic update (currently no-op)
        classicMode.update(gameState);
    },

    checkCollision(head: Position, gameState: GameState): boolean {
        // --- Check Powerup Collision ---
        const collidedPowerupIndex = gameState.powerups.value.findIndex(p => p.pos.x === head.x && p.pos.y === head.y);
        if (collidedPowerupIndex !== -1) {
            const powerup = gameState.powerups.value[collidedPowerupIndex];
            const def = POWERUP_DEFS[powerup.type as PowerupType];

            // Apply effect
            if (def.type === 'BONUS_POINTS' && def.points) {
                gameState.score.value += def.points;
            } else if (def.type === 'SHRINK' && def.shrinkAmount) {
                // Ensure snake doesn't disappear
                const amount = Math.min(def.shrinkAmount, gameState.snakeBody.value.length - 1);
                for (let i = 0; i < amount; i++) {
                    gameState.snakeBody.value.pop();
                }
            } else if (def.durationMs > 0) { // Timed effects
                 // Clear previous timed effect if any
                 if (gameState.activeEffect.value?.type === 'SLOWDOWN' && gameState.activeEffect.value.originalSpeed) {
                     // @ts-ignore - Assuming setSpeed exists
                     gameState.setSpeed(gameState.activeEffect.value.originalSpeed);
                 }

                 let originalSpeed: number | undefined = undefined;
                 if (def.type === 'SLOWDOWN') {
                     // Need access to current speed and setSpeed
                     // @ts-ignore - Assuming getSpeed/setSpeed exist
                     originalSpeed = gameState.getSpeed();
                     // @ts-ignore
                     gameState.setSpeed(originalSpeed * (def.speedMultiplier || 1));
                 }

                 gameState.activeEffect.value = {
                     type: def.type,
                     endTime: Date.now() + def.durationMs,
                     originalSpeed: originalSpeed
                 };
            }

            // Remove collected powerup
            gameState.powerups.value.splice(collidedPowerupIndex, 1);
            return false; // Powerup collision is not deadly
        }

        // --- Check Invincibility ---
        if (gameState.activeEffect.value?.type === 'INVINCIBILITY') {
            return false; // Ignore wall/self collisions
        }

        // --- Delegate to Classic Collision ---
        // Check self-collision (wall collision handled in useSnakeGame)
        return classicMode.checkCollision(head, gameState);
    },

    onFoodEaten(gameState: GameState): void {
        // Delegate to classic mode
        classicMode.onFoodEaten(gameState);
    },

    render(gridApi: GridApi, gameState: GameState): void {
        // Draw active powerups
        gameState.powerups.value.forEach(p => {
            gridApi.writeTextAt(p.symbol, p.pos.x, p.pos.y);
        });
        // Delegate to classic render (currently no-op)
        classicMode.render?.(gridApi, gameState);
    },

    // getSidebarInfo signature matches the interface (no gameState)
    getSidebarInfo(): string[] {
        // Return only the mode name for now, as we can't access gameState here
        // according to the current interface design.
        return ["[POWERUPS]"];
        // TODO: Revisit interface/state access if active effect display is needed.
    }
};
