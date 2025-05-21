<template>
  <div class="flex h-screen justify-between gap-4 items-center p-4 bg-gray-800 text-white">
    <div class="left-panel h-full p-2 w-1/3">
      <h2>Recipe Tree</h2>
      <div class="my-4">
        <div>
          <label for="rectLabel" class="block">Label:</label>
          <input
            type="text"
            id="rectLabel"
            v-model="newRectLabel"
            required
            class="mt-1 block w-full p-1" />
        </div>
        <div class="mt-2">
          <label for="rectColor" class="block">Color:</label>
          <input
            type="color"
            id="rectColor"
            v-model="newRectColor"
            required
            class="mt-1 block w-full h-10 p-1 hover:cursor-pointer" />
        </div>
        <button @click="addRectangle" class="mt-4 w-full p-2" :disabled="!newRectLabel">
          Add Rectangle
        </button>
      </div>
    </div>
    <div ref="paperContainer" class="paper-container h-full"></div>
    <div class="right-panel h-full p-2 w-1/3">More info</div>
  </div>
</template>

<script lang="ts" setup>
  import { onMounted, ref } from 'vue';
  import { dia, shapes } from '@joint/core';

  const paperContainer = ref<HTMLDivElement | null>(null);
  const graph = ref<dia.Graph | null>(null);
  const paper = ref<dia.Paper | null>(null);

  const newRectLabel = ref<string>('New Element');
  const newRectColor = ref<string>('#dedede'); // A lighter blue for dark mode
  let rectCounter = 1; // To position new rectangles

  onMounted(() => {
    if (paperContainer.value) {
      const localGraph = new dia.Graph({}, { cellNamespace: shapes });
      graph.value = localGraph;

      const localPaper = new dia.Paper({
        el: paperContainer.value,
        model: localGraph,
        width: 600,
        height: 400,
        gridSize: 10,
        drawGrid: { name: 'dot', args: { color: '#555' } }, // Darker grid
        cellViewNamespace: shapes,
      });
      paper.value = localPaper;

      const rect = new shapes.standard.Rectangle();
      rect.position(100, 30);
      rect.resize(100, 40);
      rect.attr({
        body: {
          fill: '#2980b9', // A medium blue, stands out on dark paper
        },
        label: {
          text: 'Hola Mundo',
          fill: '#ecf0f1', // Light text color
        },
      });
      rect.addTo(localGraph);
    }
  });

  const addRectangle = () => {
    if (graph.value && newRectLabel.value) {
      const newRect = new shapes.standard.Rectangle();
      const yPos = 30 + rectCounter * 50; // Increment y position for each new rect
      newRect.position(100, yPos);
      newRect.resize(120, 40);
      newRect.attr({
        body: {
          fill: newRectColor.value,
        },
        label: {
          text: newRectLabel.value,
          fill: '#1a1a1a',
        },
      });
      // A simple check for color brightness to decide label color, can be improved
      // For simplicity, we'll assume newRectColor is generally light enough for dark text.
      // If newRectColor can be very dark, this logic would need to be more robust.
      // Example: if (isColorDark(newRectColor.value)) { newRect.attr('label/fill', '#ecf0f1'); }

      newRect.addTo(graph.value as dia.Graph);
      rectCounter++;
    }
  };
</script>

<style lang="scss" scoped>
  .left-panel {
    outline: 1px solid lime;
  }

  .paper-container {
    width: 600px;
    height: 400px;
    outline: 2px solid magenta;
    overflow: hidden;
  }

  .right-panel {
    outline: 1px solid cyan;
  }

  input {
    @apply bg-gray-700;
  }
  button {
    @apply bg-gray-600 hover:bg-gray-500;
  }
</style>
