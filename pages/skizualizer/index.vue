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
        <Skizualizer :trickName="trickName" :progress="trickProgress" @update:progress="handleProgressUpdate" />
      </div>
      <div class="win95-status-bar">
        <div>Ready</div>
        <div>{{ trickProgress }}% complete</div>
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
        <TrickControls @update:trick="handleTrickUpdate" @update:progress="handleProgressUpdate" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import TrickControls from '~/components/Skizualizer/TrickControls.vue';

  const currentTime = ref('');
  let clockInterval: number;
  const trickProgress = ref(0);
  const trickName = ref('');

  onMounted(() => {
    updateClock();
    clockInterval = setInterval(updateClock, 10000);
  });

  onUnmounted(() => {
    clearInterval(clockInterval);
  });

  const updateClock = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
    currentTime.value = `${formattedHours}:${formattedMinutes} ${ampm}`;
  };

  function handleTrickUpdate(_trickName: string) {
    trickName.value = _trickName;
  }

  function handleProgressUpdate(progress: number) {
    trickProgress.value = progress;
  }
</script>
