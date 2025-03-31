<template>
  <div class="skizualizer-container">
    <h1>GNARBUNCTU-OS</h1>
    <p>Visualizing ski tricks like it's 1995 🤙</p>
    <div class="ski-canvas-container">
      <canvas ref="skiCanvas" class="ski-canvas"></canvas>
    </div>
    <div class="controls-container">
      <div>
        <input
          type="text"
          v-model="trickName"
          placeholder="backflip"
          @keyup.enter="startRotation" />
        <button @click="startRotation">flip it!</button>
      </div>
      <div>
        <input type="range" min="0" max="100" :value="sliderValue" @input="handleSliderInput" />
        <div>{{ progressState.progressPercent }}% complete</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  // Import CSS
  import '~/assets/css/skizualizer.css';

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
  watch(
    () => progressState.progress.value,
    (newValue) => {
      // Update the slider value when progress changes (convert 0-1 to 0-100)
      sliderValue.value = Math.round(newValue * 100);
    },
    { immediate: true }
  );

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
