// Define specific power-up types
export type PowerupType = 'BONUS_POINTS' | 'SLOWDOWN' | 'INVINCIBILITY' | 'SHRINK';

// Define the structure for power-up definitions
export interface PowerupDefinition {
    symbol: string;
    type: PowerupType;
    durationMs: number; // Duration of the effect in milliseconds (0 for instant)
    spawnChance: number; // Probability (0 to 1) of spawning per game tick if conditions allow
    // Add effect-specific details if needed
    points?: number; // For BONUS_POINTS
    speedMultiplier?: number; // For SLOWDOWN
    shrinkAmount?: number; // For SHRINK
}

// Define the actual power-ups
export const POWERUP_DEFS: Record<PowerupType, PowerupDefinition> = {
    BONUS_POINTS: {
        symbol: '$',
        type: 'BONUS_POINTS',
        durationMs: 0,
        spawnChance: 0.005, // Example spawn chance
        points: 10
    },
    SLOWDOWN: {
        symbol: 'S',
        type: 'SLOWDOWN',
        durationMs: 5000, // 5 seconds
        spawnChance: 0.003,
        speedMultiplier: 1.5 // Makes interval 1.5x longer (slower)
    },
    INVINCIBILITY: {
        symbol: '!',
        type: 'INVINCIBILITY',
        durationMs: 10000, // 10 seconds
        spawnChance: 0.02 //
    },
    SHRINK: {
        symbol: '-',
        type: 'SHRINK',
        durationMs: 0,
        spawnChance: 0.003,
        shrinkAmount: 2 // Remove 2 segments
    },
};

// Helper array of power-up types for easier iteration
export const POWERUP_TYPES_ARRAY = Object.keys(POWERUP_DEFS) as PowerupType[];
