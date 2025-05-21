<template>
  <div class="flex h-screen justify-between items-center p-4">
    <div class="panel-left h-full p-2 grow">
      <h2>Recipe Tree</h2>
    </div>
    <div ref="paperContainer" class="paper-container"></div>
    <div class="panel-right h-full p-2 grow">More info</div>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { dia, shapes } from '@joint/core';

const paperContainer = ref<HTMLDivElement | null>(null);

onMounted(() => {
  if (paperContainer.value) {
    const graph = new dia.Graph({}, { cellNamespace: shapes });

    const paper = new dia.Paper({
      el: paperContainer.value,
      model: graph,
      width: 600,
      height: 400,
      gridSize: 10,
      drawGrid: true,
      background: {
        color: '#0f07'
      },
      cellViewNamespace: shapes
    });

    const rect = new shapes.standard.Rectangle();
    rect.position(100, 30);
    rect.resize(100, 40);
    rect.attr({
      body: {
        fill: 'blue'
      },
      label: {
        text: 'Hola Mundo',
        fill: 'white'
      }
    });
    rect.addTo(graph);
  }
});
</script>

<style>
.paper-container {
  width: 600px;
  height: 400px;
  border: 1px solid #ccc;
  overflow: hidden; /* Ensures paper content doesn't overflow its container */
}
</style>