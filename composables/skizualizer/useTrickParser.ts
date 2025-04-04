/**
 * Composable for parsing ski tricks into rotation values
 */

/**
 * Represents rotation in degrees for each axis
 */
export interface TrickRotation {
  yaw: number; // Horizontal rotation (left/right)
  pitch: number; // Vertical forward/backward flip
  roll: number; // Barrel roll / spin along forward axis
}

/**
 * Hook for parsing ski trick text into rotation values
 * @returns Object with parsing methods
 */
export function useTrickParser() {
  /**
   * Parse a trick description into rotation values
   * @param input - String description of the trick (e.g. "360", "Backflip")
   * @returns Rotation values in degrees for each axis
   */
  const parseTrick = (input: string): TrickRotation => {
    // Default rotation values (no rotation)
    const rotation: TrickRotation = {
      yaw: 0,
      pitch: 0,
      roll: 0,
    };

    // Normalize input to lowercase for case-insensitive matching
    const normalizedInput = input.trim().toLowerCase();

    // Handle numerical rotations (e.g. "360", "720")
    if (/^\d+$/.test(normalizedInput)) {
      rotation.yaw = parseInt(normalizedInput, 10);
      return rotation;
    }

    // Handle named tricks
    switch (normalizedInput) {
      case 'backflip':
        rotation.pitch = -360; // Backward rotation
        break;
      case 'frontflip':
        rotation.pitch = 360; // Forward rotation
        break;
      case 'left':
      case 'leftside':
        rotation.yaw = -90;
        break;
      case 'right':
      case 'rightside':
        rotation.yaw = 90;
        break;
      // Basic implementation - no compound tricks or validation
    }

    return rotation;
  };

  return {
    parseTrick,
  };
}
