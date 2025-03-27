<template>
  <client-only>
    <div class="min-h-screen bg-gray-800 text-white p-8">
      <div class="max-w-[2000px] mx-auto">
        <h2 class="text-2xl font-bold text-center mb-6">Sample Data</h2>
        
        <div class="flex flex-col lg:flex-row gap-6">
          <!-- Table on the left side -->
          <div class="lg:w-1/2">
            <DataTable :data="sampleData" />
          </div>
          
          <!-- Chart on the right side -->
          <div class="lg:w-1/2 relative">
            <TimeSeriesChart :data="sampleData" />
          </div>
        </div>
      </div>
    </div>
  </client-only>
</template>

<script lang="ts" setup>
  import { onMounted } from 'vue';
  import { useSampleData } from '~/composables/useSampleData';

  const { sampleData, generateData } = useSampleData();

  onMounted(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(22, 0, 0, 0); // Set to 10:00 PM yesterday
    
    const today = new Date();
    today.setHours(6, 0, 0, 0); // Set to 6:00 AM today
    
    generateData(yesterday, today, 15); // 15-minute intervals
  });
</script>
