<template>
  <div class="sticky top-8 bg-gray-700 p-4 rounded-lg shadow-lg">
    <canvas ref="chartCanvas" class="w-full h-[33vh]"></canvas>
  </div>
</template>

<script lang="ts" setup>
  import { onMounted, watch } from 'vue';
  import type { SampleData } from '~/composables/terminal/useSampleData';
  import { useChartJs } from '~/composables/charts/useChartJs';

  const props = defineProps<{
    data: SampleData[];
  }>();

  const { chartCanvas, createChart } = useChartJs(toRef(props, 'data'));

  onMounted(() => {
    setTimeout(createChart, 100);
  });

  // Recreate chart when data changes
  watch(
    () => props.data,
    () => {
      setTimeout(createChart, 100);
    },
    { deep: true }
  );
</script>
