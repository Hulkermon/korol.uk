<template>
  <div class="overflow-x-auto shadow-lg rounded-lg">
    <table class="w-full table-auto">
      <thead class="bg-gray-700">
        <tr>
          <th class="px-4 py-2 text-left">ID</th>
          <th class="px-4 py-2 text-left">Timestamp</th>
          <th class="px-4 py-2 text-right">Value</th>
        </tr>
      </thead>
      <tbody class="bg-gray-600">
        <tr
          v-for="item in data"
          :key="item.id"
          class="border-t border-gray-500 hover:bg-gray-700 transition-colors"
        >
          <td
            class="px-4 py-2 font-mono text-xs text-gray-300 truncate max-w-xs"
          >
            {{ item.id }}
          </td>
          <td class="px-4 py-2">{{ formatTime(item.timestamp) }}</td>
          <td class="px-4 py-2 text-right">{{ item.value }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts" setup>
  import { formatTime } from '~/utils/format';
  import type { SampleData } from '~/composables/charts/useSampleData';

  defineProps<{
    data: SampleData[];
  }>();
</script>
