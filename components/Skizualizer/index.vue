<template>
  <div class="ski-canvas-container">
    <canvas ref="skiCanvas" class="ski-canvas"></canvas>
  </div>
  <div class="trick-controls">
    <div>
      <input
        type="text"
        v-model="trickName"
        placeholder="backflip"
        class="border p-2 m-2"
        @keyup.enter="startRotation" />
      <button @click="startRotation" class="bg-gray-500 hover:bg-gray-600 text-white p-2 m-2">
        flip it!
      </button>
    </div>
    <div class="slider-container p-2 m-2">
      <input 
        type="range" 
        min="0" 
        max="100" 
        :value="sliderValue" 
        @input="handleSliderInput"
        class="w-full" />
      <div class="text-sm text-center">{{ progressState.progressPercent }}% complete</div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted, onUnmounted, watch } from 'vue';
  import { useTrickParser, type TrickRotation } from '~/composables/skizualizer/useTrickParser';
  import { useRotationController } from '~/composables/skizualizer/useRotationController';
  import { useThreeJsSetup, type ThreeJsContext } from '~/composables/skizualizer/useThreeJsSetup';
  import { useTrickProgress } from '~/composables/skizualizer/useTrickProgress';

  // Canvas reference
  const skiCanvas = ref<HTMLCanvasElement | null>(null);

  // Get composables
  const { parseTrick } = useTrickParser();
  const { spin } = useRotationController();
  const { setupAndRender, handleResize, cleanup } = useThreeJsSetup(skiCanvas);
  const progressState = useTrickProgress();

  // Default rotation (360 yaw)
  const trickName = ref('backflip');
  let trickRotation: TrickRotation;
  
  // Local ref for slider value
  const sliderValue = ref(0);
  
  // Watch for progress changes and update the slider
  watch(() => progressState.progress.value, (newValue) => {
    // Update the slider value when progress changes (convert 0-1 to 0-100)
    sliderValue.value = Math.round(newValue * 100);
  }, { immediate: true });

  // Handle slider input from user
  const handleSliderInput = (event: Event) => {
    const value = parseFloat((event.target as HTMLInputElement).value);
    sliderValue.value = value;
    progressState.setProgress(value / 100);
    
    // If we don't have a trick rotation yet, parse the current trick name
    if (!trickRotation) {
      trickRotation = parseTrick(trickName.value);
    }
  };

  // Start a trick rotation
  const startRotation = () => {
    trickRotation = parseTrick(trickName.value);
    progressState.startAnimation();
  };

  // Animation callback
  const animateSkis = (ctx: ThreeJsContext) => {
    // Apply the current rotation if we have a trick defined
    if (trickRotation) {
      spin(ctx.skiMesh, trickRotation, progressState.progress.value);
    }
    
    // Update progress (animation moves forward automatically)
    progressState.updateProgress();
  };

  // Lifecycle hooks
  onMounted(() => {
    setupAndRender(animateSkis);
    window.addEventListener('resize', handleResize);
  });

  onUnmounted(() => {
    window.removeEventListener('resize', handleResize);
    cleanup();
  });
</script>

<style scoped>
  .ski-canvas-container {
    width: 100%;
    height: 70vh;
    max-width: 1200px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden;
  }

  .ski-canvas {
    width: 100%;
    height: 100%;
    display: block;
  }
</style>
