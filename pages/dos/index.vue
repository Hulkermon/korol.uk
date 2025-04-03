<template>
  <div class="dos-page-container">
    <!-- Use the new Canvas Terminal -->
    <Terminal
      :process-command-function="processCommand"
      :currentPathString="currentPathString"
      :terminalColor="terminalColor"
      :clear-screen-signal="CLEAR_SCREEN_SIGNAL"
    />
     <!-- Old DosTerminal removed -->
  </div>
</template>

<script setup lang="ts">
import Terminal from '@/components/Terminal/index.vue'; // Import the new canvas terminal
import { useDosCommands } from '@/composables/dos/useDosCommands';

// Get all needed exports from the composable
// Note: currentPathString and terminalColor are already refs returned by useDosCommands
const { processCommand, terminalColor, currentPathString, CLEAR_SCREEN_SIGNAL } = useDosCommands();

// No handleCommandSubmit needed here anymore, as the function is passed directly

// Add initial welcome message or leave blank?
// Maybe clear the grid initially instead of showing the default welcome screen?
onMounted(() => {
  // Example: could potentially call a clear method if exposed by Terminal component
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
