<script setup lang="ts">
  const props = defineProps<{
    credits: number;
    integrity: number;
    maxIntegrity: number;
    wave: number;
    totalWaves: number;
    speed: 1 | 2 | 3;
    paused: boolean;
    canStartWave: boolean;
  }>();

  defineEmits<{
    (e: 'start-wave'): void;
    (e: 'toggle-pause'): void;
    (e: 'set-speed', speed: 1 | 2 | 3): void;
  }>();

  const integrityPct = computed(() =>
    props.maxIntegrity > 0
      ? Math.max(0, Math.min(100, (props.integrity / props.maxIntegrity) * 100))
      : 0
  );
  const speeds: (1 | 2 | 3)[] = [1, 2, 3];
</script>

<template>
  <div class="fw-status">
    <div class="fw-cell fw-credits">${{ Math.floor(credits) }}</div>
    <div class="fw-cell fw-integrity">
      <span>INTEGRITY</span>
      <div class="fw-bar">
        <div
          class="fw-bar-fill"
          :class="{ 'fw-low': integrityPct < 30 }"
          :style="{ width: integrityPct + '%' }" />
      </div>
      <span class="fw-num">{{ Math.max(0, Math.ceil(integrity)) }}/{{ maxIntegrity }}</span>
    </div>
    <div class="fw-cell">WAVE {{ wave }}/{{ totalWaves }}</div>
    <div class="fw-spacer" />
    <button
      v-for="s in speeds"
      :key="s"
      type="button"
      class="fw-sbtn"
      :class="{ 'fw-on': speed === s }"
      @click="$emit('set-speed', s)">
      {{ s }}x
    </button>
    <button type="button" class="fw-sbtn" :class="{ 'fw-on': paused }" @click="$emit('toggle-pause')">
      {{ paused ? 'RESUME' : 'PAUSE' }}
    </button>
    <button
      type="button"
      class="fw-start"
      :disabled="!canStartWave"
      @click="$emit('start-wave')">
      START WAVE
    </button>
  </div>
</template>

<style scoped>
  .fw-status {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px;
    background: #c0c0c0;
    color: #000;
    font-family: Tahoma, Verdana, 'MS Sans Serif', sans-serif;
    font-size: 12px;
  }
  .fw-cell {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 3px 8px;
    border: 2px solid;
    border-color: #404040 #fff #fff #404040;
    white-space: nowrap;
  }
  .fw-credits {
    background: #000;
    color: #30ff60;
    font: bold 14px 'Courier New', monospace;
    min-width: 70px;
  }
  .fw-bar {
    width: 110px;
    height: 12px;
    background: #000;
    border: 1px solid #404040;
  }
  .fw-bar-fill {
    height: 100%;
    background: #00fff0;
  }
  .fw-bar-fill.fw-low {
    background: #ff3030;
  }
  .fw-num {
    font-family: 'Courier New', monospace;
  }
  .fw-spacer {
    flex: 1;
  }
  .fw-sbtn {
    background: #c0c0c0;
    color: #000;
    font: 12px Tahoma, Verdana, 'MS Sans Serif', sans-serif;
    padding: 3px 8px;
    border: 2px solid;
    border-color: #fff #404040 #404040 #fff;
    cursor: pointer;
  }
  .fw-sbtn.fw-on {
    border-color: #404040 #fff #fff #404040;
    background: #a8a8a8;
    font-weight: bold;
  }
  .fw-start {
    background: #ff2bd6;
    color: #fff;
    font: bold 16px Tahoma, Verdana, 'MS Sans Serif', sans-serif;
    text-shadow: 1px 1px 0 #000;
    padding: 6px 16px;
    border: 3px solid;
    border-color: #fff #404040 #404040 #fff;
    cursor: pointer;
  }
  .fw-start:disabled {
    background: #808080;
    color: #c0c0c0;
    cursor: default;
  }
</style>
