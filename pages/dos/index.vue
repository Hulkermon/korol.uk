<template>
  <div class="dos-page-container">
    <DosTerminal :history="commandHistory" @submit-command="handleCommandSubmit" />
  </div>
</template>

<script setup lang="ts">
import DosTerminal from '@/components/dos/Terminal.vue';
import { useDosCommands } from '@/composables/dos/useDosCommands';

const { commandHistory, processCommand } = useDosCommands();

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
