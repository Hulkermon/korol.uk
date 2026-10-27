<script setup lang="ts">
  const props = defineProps<{ items: string[] }>();

  const text = computed(() =>
    props.items
      .slice(-5)
      .reverse()
      .map((i) => `*** ${i}`)
      .join('     ')
  );
</script>

<template>
  <div class="fw-ticker">
    <span class="fw-new fw-blink-new">NEW!</span>
    <div class="fw-track">
      <span :key="text" class="fw-scroll">{{ text || '*** all quiet on the network' }}</span>
    </div>
  </div>
</template>

<style scoped>
  .fw-ticker {
    display: flex;
    align-items: center;
    gap: 6px;
    background: #000;
    border: 2px solid;
    border-color: #404040 #fff #fff #404040;
    padding: 2px 4px;
    font: 12px 'Courier New', monospace;
    color: #00fff0;
  }
  .fw-new {
    background: #ff3030;
    color: #ffe600;
    font-weight: bold;
    padding: 0 4px;
    flex: none;
  }
  .fw-blink-new {
    animation: fw-blink-anim 1s steps(2, start) infinite;
  }
  .fw-track {
    flex: 1;
    overflow: hidden;
    white-space: nowrap;
  }
  .fw-scroll {
    display: inline-block;
    padding-left: 100%;
    animation: fw-scroll-anim 25s linear infinite;
  }
  @keyframes fw-scroll-anim {
    to {
      transform: translateX(-100%);
    }
  }
  @keyframes fw-blink-anim {
    to {
      visibility: hidden;
    }
  }
</style>
