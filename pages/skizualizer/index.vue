<template>
  <div class="skizualizer-container">
    <h1 class="text-2xl font-bold mb-4">Skizualizer</h1>
    <p class="mb-6">Visualizing gnarbunctuos ski tricks 🤙</p>
    <Skizualizer />
  </div>
</template>

<script setup lang="ts"></script>

<style scoped>
  .skizualizer-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    padding: 1rem;
  }
</style>
