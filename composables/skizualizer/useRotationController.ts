/**
 * Composable for applying ski trick rotations to Three.js objects
 */
import { Quaternion, Euler, Object3D, MathUtils } from 'three';
import type { TrickRotation } from './useTrickParser';

/**
 * Hook for controlling 3D object rotation based on trick parameters
 * @returns Object with rotation control methods
 */
export function useRotationController() {
  // Create reusable objects to avoid unnecessary allocations
  const quaternion = new Quaternion();
  const euler = new Euler();

  /**
   * Apply rotation to a Three.js object based on trick rotation values and progress
   * @param object3D - The Three.js object to rotate
   * @param rotation - The rotation values in degrees for each axis
   * @param progress - Interpolation factor between 0 and 1 (0 = start, 1 = complete rotation)
   */
  const spin = (object3D: Object3D, rotation: TrickRotation, progress: number): void => {
    // Clamp progress between 0 and 1
    const t = MathUtils.clamp(progress, 0, 1);

    // Convert degrees to radians and multiply by progress
    const yawRad = MathUtils.degToRad(rotation.yaw * t);
    const pitchRad = MathUtils.degToRad(rotation.pitch * t);
    const rollRad = MathUtils.degToRad(rotation.roll * t);

    // Set euler angles in ZYX order (yaw, pitch, roll)
    euler.set(pitchRad, yawRad, rollRad, 'ZYX');

    // Convert to quaternion for smooth rotation without gimbal lock
    quaternion.setFromEuler(euler);

    // Apply the quaternion rotation to the object
    object3D.quaternion.copy(quaternion);
  };

  /**
   * Reset an object's rotation to its initial state
   * @param object3D - The Three.js object to reset
   */
  const resetRotation = (object3D: Object3D): void => {
    object3D.quaternion.set(0, 0, 0, 1);
  };

  return {
    spin,
    resetRotation,
  };
}
