<template>
  <div class="ski-canvas-container">
    <canvas ref="skiCanvas" class="ski-canvas"></canvas>
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





  // TODO: Refactor this crap and use like global state or something







  // Canvas reference
  const skiCanvas = ref<HTMLCanvasElement | null>(null);

  // Get composables
  const { parseTrick } = useTrickParser();
  const { spin } = useRotationController();
  const { setupAndRender, handleResize, cleanup } = useThreeJsSetup(skiCanvas);
  const progressState = useTrickProgress();

  const trickName = ref('');
  let trickRotation: TrickRotation;
  const sliderValue = ref(0);

  const props = defineProps({
    trickName: {
      type: String,
      default: '',
    },
    progress: {
      type: Number,
      default: 0,
    },
  });

  // Watch for progress changes and update the slider
  watch(
    () => props.progress,
    (newProgress) => {
      handleSliderInput(newProgress)
    },
    { immediate: true }
    // () => progressState.progress.value,
    // (newValue) => {
    //   // Update the slider value when progress changes (convert 0-1 to 0-100)
    //   sliderValue.value = Math.round(newValue * 100);
    // },
    // { immediate: true }
  );

  watch(
    () => props.trickName,
    (newTrickName) => {
      trickName.value = newTrickName;
      doTrick();
    },
    { immediate: true }
  );

  defineEmits(['update:progress']);

  // Handle slider input from user
  function handleSliderInput(newProgress: number) {
    // const value = parseFloat((event.target as HTMLInputElement).value);
    // sliderValue.value = value;
    progressState.setProgress(newProgress / 100);

    // If we don't have a trick rotation yet, parse the current trick name
    if (!trickRotation) {
      trickRotation = parseTrick(trickName.value);
    }
  };

  // Start a trick rotation
  function doTrick() {
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
