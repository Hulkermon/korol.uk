<template>
  <div class="win95-desktop">
    <!-- Desktop icon for trick list text file -->
    <div class="desktop-icon">
      <div class="icon-image text-file-icon"></div>
      <div class="icon-text">trick list.txt</div>
    </div>

    <!-- Taskbar with running programs -->
    <div class="win95-taskbar">
      <div class="start-button">
        <span>Start</span>
      </div>
      <!-- Running programs section -->
      <div class="taskbar-programs">
        <div class="taskbar-program-button active">
          <span>Ski Visualizer</span>
        </div>
        <div class="taskbar-program-button">
          <span>Trick Controls</span>
        </div>
      </div>
      <div class="taskbar-time">{{ currentTime }}</div>
    </div>

    <!-- Ski Visualizer Program Window -->
    <div class="win95-window ski-program">
      <div class="win95-title-bar">
        <div class="title-bar-text">GNARBUNCTU-OS - Ski Visualizer</div>
        <div class="title-bar-controls">
          <button aria-label="Minimize"></button>
          <button aria-label="Maximize"></button>
          <button aria-label="Close"></button>
        </div>
      </div>
      <div class="win95-window-content">
        <div class="ski-canvas-container">
          <canvas ref="skiCanvas" class="ski-canvas"></canvas>
        </div>
      </div>
      <div class="win95-status-bar">
        <div>Ready</div>
        <div>{{ progressState.progressPercent }}% complete</div>
      </div>
    </div>

    <!-- Controls Program Window -->
    <div class="win95-window controls-program">
      <div class="win95-title-bar">
        <div class="title-bar-text">Trick Controls</div>
        <div class="title-bar-controls">
          <button aria-label="Minimize"></button>
          <button aria-label="Maximize"></button>
          <button aria-label="Close"></button>
        </div>
      </div>
      <div class="win95-window-content">
        <div class="controls-container">
          <div class="control-group">
            <label>Trick Name:</label>
            <input
              type="text"
              class="win95-input"
              v-model="trickName"
              placeholder="backflip"
              @keyup.enter="startRotation" />
            <button class="win95-button" @click="startRotation">Flip It!</button>
          </div>
          <div class="control-group">
            <label>Progress:</label>
            <input 
              type="range" 
              class="win95-slider" 
              min="0" 
              max="100" 
              :value="sliderValue" 
              @input="handleSliderInput" />
          </div>
        </div>
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

  const trickName = ref('backflip');
  let trickRotation: TrickRotation;
  const sliderValue = ref(0);

  const currentTime = ref('');

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
    
    const updateClock = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const formattedHours = hours % 12 || 12;
      const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
      currentTime.value = `${formattedHours}:${formattedMinutes} ${ampm}`;
      // const taskbarTime = document.querySelector('.taskbar-time');
      // if (taskbarTime) {
      //   taskbarTime.textContent = `${formattedHours}:${formattedMinutes} ${ampm}`;
      // }
    };
    
    // Update clock every 10 seconds
    updateClock();
    const clockInterval = setInterval(updateClock, 10000);
    
    onUnmounted(() => {
      clearInterval(clockInterval);
    });
  });

  onUnmounted(() => {
    window.removeEventListener('resize', handleResize);
    cleanup();
  });
</script>
