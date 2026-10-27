<script setup lang="ts">
  defineProps<{ title: string; icon?: string }>();
</script>

<template>
  <div class="fw-window">
    <div class="fw-titlebar">
      <span class="fw-title">
        <span v-if="icon" class="fw-icon">{{ icon }}</span>
        {{ title }}
      </span>
      <span class="fw-controls" aria-hidden="true">
        <span class="fw-ctl">_</span>
        <span class="fw-ctl">&#9633;</span>
        <span class="fw-ctl">x</span>
      </span>
    </div>
    <div class="fw-body">
      <slot />
    </div>
  </div>
</template>

<style scoped>
  .fw-window {
    background: #c0c0c0;
    border: 2px solid;
    border-color: #fff #404040 #404040 #fff;
    padding: 2px;
    font-family: Tahoma, Verdana, 'MS Sans Serif', sans-serif;
    color: #000;
  }
  .fw-titlebar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 2px 3px;
    background: linear-gradient(90deg, #ff2bd6, #5a1a8a 50%, #00fff0);
    color: #fff;
    font-weight: bold;
    font-size: 12px;
    text-shadow: 1px 1px 0 #000;
    user-select: none;
  }
  .fw-title {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .fw-icon {
    margin-right: 3px;
  }
  .fw-controls {
    display: flex;
    gap: 2px;
  }
  .fw-ctl {
    width: 16px;
    height: 14px;
    line-height: 12px;
    text-align: center;
    font-size: 11px;
    color: #000;
    text-shadow: none;
    background: #c0c0c0;
    border: 2px solid;
    border-color: #fff #404040 #404040 #fff;
    box-sizing: content-box;
  }
  .fw-body {
    background: #c0c0c0;
    padding: 4px;
  }
</style>
