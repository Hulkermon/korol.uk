<template>
  <div class="dos-page-container">
    <!-- Pass terminalColor and currentPathString as props -->
    <DosTerminal
      :history="commandHistory"
      :terminal-color="terminalColor"
      :prompt-string="currentPathString"
      @submit-command="handleCommandSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import DosTerminal from '@/components/dos/Terminal.vue';
import { useDosCommands } from '@/composables/dos/useDosCommands';

// Get all reactive states from the composable
const { commandHistory, processCommand, terminalColor, currentPathString } = useDosCommands();

const handleCommandSubmit = (command: string) => {
  processCommand(command);
};

// Add initial welcome message or leave blank
// processCommand('help'); // Example: run help on load?
</script>

<style scoped>
.dos-page-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh; /* Full viewport height */
  background-color: #000080; /* Optional: DOS-like blue background */
  padding: 2rem; /* Add some padding */
}
</style>
