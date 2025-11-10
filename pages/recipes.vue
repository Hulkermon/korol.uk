<script lang="ts" setup>
  import { onMounted, ref } from 'vue';

  const newElLabel = ref<string>('');
  const newElColor = ref<string>('#cdcdcd');

  type Strain = {
    id: string;
    parent: string | null;
    children?: Strain[];
    label: string;
    color: string;
  };
  const allStrains = ref<Strain[]>([]);

  function addStrain(label: string, color: string, parent: string | null = null) {
    const labelId = label.toLowerCase().replace(/\s+/g, '-');
    const newStrain: Strain = {
      id: `strain-${labelId}-${Date.now()}`,
      parent: null,
      label: newElLabel.value,
      color: newElColor.value,
    };

    allStrains.value.push(newStrain);
    newElLabel.value = '';
    newElColor.value = '#cdcdcd'; // Reset color
  }

  onMounted(() => {
    // Initialize with some default strains
    addStrain('Sativa', '#ffcc00');
    addStrain('Indica', '#cc00ff');
    addStrain('Hybrid', '#00ccff');
  });
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
          <button
            @click="addStrain(newElLabel, newElColor)"
            class="mt-2 w-full p-2"
            :disabled="!newElLabel">
            Add to Index
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
    <div class="center-panel h-full w-full p-2">
      <ol>
        <li v-for="strain in allStrains">{{ strain.label }}</li>
      </ol>
    </div>
    <div class="right-panel h-full p-2 w-[420px]">More info</div>
  </div>
</template>

<style lang="scss" scoped>
  .left-panel {
    outline: 1px solid #0f0;
    background: #0206;
  }

  .center-panel {
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
