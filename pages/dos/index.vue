<template>
  <div class="dos-page-container">
    <!-- Use the new Canvas Terminal -->
    <Terminal
      ref="terminalRef"
      :process-command-function="processCommand"
      :currentPathString="currentPathString"
      :terminalColor="terminalColor"
      :clear-screen-signal="CLEAR_SCREEN_SIGNAL"
      :terminalHistory="commandHistory"
    />
     <!-- Old DosTerminal removed -->
  </div>
</template>

<script setup lang="ts">
import Terminal from '@/components/Terminal/index.vue'; // Import the new canvas terminal
import { useDosCommands, type GridApi, type DosCommandOptions } from '@/composables/dos/useDosCommands';

export type TerminalExposed = {
  enterGameMode: () => void;
  exitGameMode: () => void;
  gridApi: GridApi;
} | null;

const terminalRef = ref<TerminalExposed>(null);


const { processCommand, terminalColor, currentPathString, CLEAR_SCREEN_SIGNAL, commandHistory } = useDosCommands({
  terminalRef,
} as DosCommandOptions);

</script>

<style scoped>
.dos-page-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh; /* Full viewport height */
  /* Match the canvas terminal background */
  background-color: #0a0a0a;
  padding: 0; /* Remove padding if container is just for centering */
}
</style>
