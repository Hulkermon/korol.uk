<script lang="ts" setup>
  import { onMounted, ref } from 'vue';
  import { dia, shapes } from '@joint/core';

  const paperContainer = ref<HTMLDivElement | null>(null);
  const graph = ref<dia.Graph | null>(null);
  const paper = ref<dia.Paper | null>(null);

  const bgColor = '#1f2937';
  const gridSize = 50;
  const gridGap = 1;

  const newElHeight = 50;
  const newElStrokeWidth = 2;
  const newElLabel = ref<string>('New Element');
  const newElColor = ref<string>('#00ff00');

  const selectedElement = ref<dia.Element | null>(null);
  const allElements = ref<dia.Element[]>([]);

  onMounted(() => {
    if (paperContainer.value) {
      initPaper(paperContainer.value);
      setupEventHandlers();
    }
  });

  function initPaper(element: HTMLDivElement) {
    const localGraph = new dia.Graph({}, { cellNamespace: shapes });
    graph.value = localGraph;

    const localPaper = new dia.Paper({
      el: element,
      model: localGraph,
      height: '100%',
      width: '100%',
      gridSize,
      drawGrid: { name: 'dot', color: '#f0f3', thickness: gridSize - gridGap },
      cellViewNamespace: shapes,
      interactive: {
        elementMove: false,
      },
    });

    paper.value = localPaper;
  }

  function setupEventHandlers() {
    if (!paper.value) return;

    paper.value.on('element:pointerclick', (elementView) => {
      if (selectedElement.value) deselectElement();
      selectElement(elementView);
    });

    paper.value.on('blank:pointerdown', () => {
      deselectElement();
    });
  }

  function selectElement(elView: dia.ElementView) {
    const elMo = elView.model;
    selectedElement.value = elMo;
    console.log(
      'attrs:',
      elMo.attr({
        body: {
          fill: '#374151',
          strokeWidth: newElStrokeWidth + 2,
        },
      })
    );
  }

  function deselectElement() {
    selectedElement.value?.attr({
      body: {
        fill: bgColor,
        strokeWidth: newElStrokeWidth,
      },
    });
    selectedElement.value = null;
  }

  function addElement() {
    if (graph.value && newElLabel.value) {
      const newEl = new shapes.standard.Rectangle();
      let xPos = 0;
      let yPos = 0;
      if (selectedElement.value) {
        xPos = selectedElement.value.position().x;
        yPos = selectedElement.value.position().y + 2 * gridSize;
      } else {
        xPos = gridSize;
        yPos = gridSize;
      }
      newEl.position(xPos, yPos);
      newEl.resize(150, newElHeight);
      newEl.attr({
        body: {
          fill: bgColor,
          stroke: newElColor.value,
          strokeWidth: newElStrokeWidth,
        },
        label: {
          text: newElLabel.value,
          fill: newElColor.value,
          fontWeight: 700,
        },
      });

      newEl.addTo(graph.value as dia.Graph);
      allElements.value.push(newEl);
    }
  }
</script>

<template>
  <div class="flex h-screen justify-between gap-4 items-center p-4 bg-gray-800 text-white">
    <div class="left-panel p-2 w-[420px] h-full flex flex-col gap-4">
      <h2>Recipe Tree</h2>
      <div class="flex flex-col gap-24 h-full justify-between">
        <div>
          <div>
            <label for="rectLabel" class="block">Label:</label>
            <input
              type="text"
              id="rectLabel"
              v-model="newElLabel"
              required
              class="mt-1 block w-full p-1" />
          </div>
          <div>
            <label for="rectColor" class="block">Color:</label>
            <input
              type="color"
              id="rectColor"
              v-model="newElColor"
              required
              class="mt-1 block w-full h-10 p-1 hover:cursor-pointer" />
          </div>
          <button @click="addElement" class="mt-2 w-full p-2" :disabled="!newElLabel || (!selectedElement && allElements.length > 0)">
            {{ selectedElement ? 'Add Child' : 'Add Element' }}
          </button>
        </div>

        <div>
          <div class="text-center py-2 border-t">JSON</div>
          <div class="flex gap-2">
            <button class="w-full p-2">Import</button>
            <button class="w-full p-2">Export</button>
          </div>
        </div>
      </div>
    </div>
    <div ref="paperContainer" class="paper-container h-full w-full"></div>
    <div class="right-panel h-full p-2 w-[420px]">More info</div>
  </div>
</template>

<style lang="scss" scoped>
  .left-panel {
    outline: 1px solid #0f0;
    background: #0206;
  }

  .paper-container {
    outline: 2px solid #f0f;
    overflow: hidden;
    background: #2026;
  }

  .right-panel {
    outline: 1px solid #0ff;
    background: #0226;
  }

  input {
    @apply bg-gray-700;
  }
  button {
    @apply bg-gray-600 hover:bg-gray-500;
    &:disabled {
      @apply text-gray-300 bg-gray-700 cursor-not-allowed;
    }
  }
</style>
