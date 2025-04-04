/**
 * Composable for managing trick progression state and control
 */
import { ref, computed } from 'vue';
import type { TrickRotation } from './useTrickParser';

export interface TrickProgressState {
  progress: number;         // Current progress (0-1)
  isAnimating: boolean;     // Whether animation is running
  isUserControlled: boolean; // Whether user is controlling progress
  speed: number;            // Animation speed
}

/**
 * Hook for managing trick progression state
 * @returns Object with progression control methods and state
 */
export function useTrickProgress() {
  // State
  const progress = ref(0);
  const isAnimating = ref(false);
  const isUserControlled = ref(false);
  const speed = ref(0.01); // Default speed
  
  // Computed values for UI display
  const progressPercent = computed(() => Math.round(progress.value * 100));
  
  /**
   * Start the trick animation
   */
  const startAnimation = () => {
    if (isAnimating.value) return;
    
    progress.value = 0;
    isAnimating.value = true;
    isUserControlled.value = false;
  };
  
  /**
   * Stop the trick animation
   */
  const stopAnimation = () => {
    isAnimating.value = false;
  };
  
  /**
   * Update the progress value directly (for user control)
   * @param value - The new progress value (0-1)
   */
  const setProgress = (value: number) => {
    progress.value = Math.max(0, Math.min(1, value));
    
    // Automatically stop animation when user is controlling
    if (!isUserControlled.value) {
      isUserControlled.value = true;
      isAnimating.value = false;
    }
  };
  
  /**
   * Update animation progress by one frame
   * @returns Whether the animation is complete
   */
  const updateProgress = (): boolean => {
    // Only update if animation is running and not user-controlled
    if (!isAnimating.value || isUserControlled.value) {
      return false;
    }
    
    // Update progress
    progress.value += speed.value;
    
    // Check if complete
    if (progress.value >= 1) {
      progress.value = 1;
      isAnimating.value = false;
      return true;
    }
    
    return false;
  };
  
  /**
   * Reset the progress state
   */
  const reset = () => {
    progress.value = 0;
    isAnimating.value = false;
    isUserControlled.value = false;
  };
  
  return {
    // State
    progress,
    isAnimating,
    isUserControlled,
    speed,
    progressPercent,
    
    // Methods
    startAnimation,
    stopAnimation,
    setProgress,
    updateProgress,
    reset,
  };
}