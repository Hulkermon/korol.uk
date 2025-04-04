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
import { ref, onMounted } from 'vue'; // Import ref and onMounted
import Terminal from '@/components/Terminal/index.vue'; // Import the new canvas terminal
import { useDosCommands } from '@/composables/dos/useDosCommands';
import type { useCrtGrid } from '@/composables/terminal/useCrtGrid'; // Import type for GridApi inference

// Type for the exposed methods/refs from Terminal component
type TerminalExposed = {
  enterGameMode: () => void;
  exitGameMode: () => void;
  gridApi: ReturnType<typeof useCrtGrid>; // Infer GridApi type
} | null;

const terminalRef = ref<TerminalExposed>(null);

// Placeholder functions for context, will be updated onMounted
const getEnterGameMode = () => terminalRef.value?.enterGameMode;
const getExitGameMode = () => terminalRef.value?.exitGameMode;
const getGridApi = () => terminalRef.value?.gridApi;

// Initialize useDosCommands, passing the getter functions
const { processCommand, terminalColor, currentPathString, CLEAR_SCREEN_SIGNAL, commandHistory } = useDosCommands({
  getEnterGameMode,
  getExitGameMode,
  getGridApi,
});

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
