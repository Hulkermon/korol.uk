<template>
  <div class="ski-canvas-container">
    <canvas ref="skiCanvas" class="ski-canvas"></canvas>
  </div>
  <div class="trick-controls">
    <input
      type="text"
      v-model="trickName"
      placeholder="backflip"
      class="border p-2 m-2"
      @keyup.enter="startRotation" />
    <button
      @click="startRotation"
      class="bg-gray-500 hover:bg-gray-600 text-white p-2 m-2">
      flip it!
    </button>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted, onUnmounted } from 'vue';
  // prettier-ignore
  import { useTrickParser, type TrickRotation } from '~/composables/skizualizer/useTrickParser';
  // prettier-ignore
  import { useRotationController } from '~/composables/skizualizer/useRotationController';
  // prettier-ignore
  import { useThreeJsSetup, type ThreeJsContext } from '~/composables/skizualizer/useThreeJsSetup';

  // Canvas reference
  const skiCanvas = ref<HTMLCanvasElement | null>(null);

  // Get composables
  const { parseTrick } = useTrickParser();
  const { spin, resetRotation: resetObjectRotation } = useRotationController();
  const { setupAndRender, handleResize, cleanup, context } =
    useThreeJsSetup(skiCanvas);

  // Default rotation (360 yaw)
  const trickName = ref('backflip');
  let trickRotation: TrickRotation;

  // Rotation control variables
  const isRotating = ref(false);
  const rotationProgress = ref(0);
  const rotationSpeed = 0.01; // Progress increment per frame

  // Start a 360-degree rotation
  const startRotation = () => {
    if (isRotating.value) return;
    trickRotation = parseTrick(trickName.value);

    isRotating.value = true;
    rotationProgress.value = 0;
  };

  // Animation callback
  const animateSkis = (ctx: ThreeJsContext) => {
    // Handle rotation animation
    if (isRotating.value) {
      // Update progress
      rotationProgress.value += rotationSpeed;

      // Apply rotation using the controller
      spin(ctx.skiMesh, trickRotation, rotationProgress.value);

      // Check if rotation is complete
      if (rotationProgress.value >= 1) {
        isRotating.value = false;
        rotationProgress.value = 1;
      }
    }
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
