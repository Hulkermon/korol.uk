<script setup lang="ts">
  const clock = ref('');
  let timer: ReturnType<typeof setInterval> | null = null;

  function updateClock() {
    const d = new Date();
    clock.value = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  onMounted(() => {
    updateClock();
    timer = setInterval(updateClock, 60000);
  });

  onBeforeUnmount(() => {
    if (timer) clearInterval(timer);
  });
</script>

<template>
  <div class="fw-taskbar">
    <NuxtLink to="/" class="fw-start-btn">start</NuxtLink>
    <div class="fw-sep" />
    <div class="fw-task">FIREWALL.EXE</div>
    <div class="fw-tray">{{ clock }}</div>
  </div>
</template>

<style scoped>
  .fw-taskbar {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 3px 4px;
    background: #c0c0c0;
    border-top: 2px solid #fff;
    font-family: Tahoma, Verdana, 'MS Sans Serif', sans-serif;
    font-size: 12px;
    color: #000;
  }
  .fw-start-btn {
    background: #1fa01f;
    color: #fff;
    font-weight: bold;
    font-style: italic;
    font-size: 14px;
    padding: 2px 12px;
    text-decoration: none;
    text-shadow: 1px 1px 0 #000;
    border: 2px solid;
    border-color: #fff #404040 #404040 #fff;
  }
  .fw-sep {
    width: 2px;
    align-self: stretch;
    border-left: 1px solid #808080;
    border-right: 1px solid #fff;
  }
  .fw-task {
    min-width: 140px;
    padding: 3px 10px;
    font-weight: bold;
    background: #d8d8d8;
    border: 2px solid;
    border-color: #404040 #fff #fff #404040;
  }
  .fw-tray {
    margin-left: auto;
    min-width: 48px;
    text-align: center;
    padding: 3px 8px;
    border: 2px solid;
    border-color: #404040 #fff #fff #404040;
  }
</style>
