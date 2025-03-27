<template>
  <client-only>
    <div class="min-h-screen bg-gray-800 text-white p-8">
      <div class="max-w-[2000px] mx-auto">
        <h2 class="text-2xl font-bold text-center mb-6">Sample Data</h2>
        
        <div class="flex flex-col lg:flex-row gap-6">
          <!-- Table on the left side -->
          <div class="lg:w-1/2 overflow-x-auto shadow-lg rounded-lg">
            <table class="w-full table-auto">
              <thead class="bg-gray-700">
                <tr>
                  <th class="px-4 py-2 text-left">ID</th>
                  <th class="px-4 py-2 text-left">Timestamp</th>
                  <th class="px-4 py-2 text-right">Value</th>
                </tr>
              </thead>
              <tbody class="bg-gray-600">
                <tr v-for="item in sampleData" :key="item.id" class="border-t border-gray-500 hover:bg-gray-700 transition-colors">
                  <td class="px-4 py-2 font-mono text-xs text-gray-300 truncate max-w-xs">{{ item.id }}</td>
                  <td class="px-4 py-2">{{ formatDate(item.timestamp) }}</td>
                  <td class="px-4 py-2 text-right">{{ item.value }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <!-- Chart on the right side - sticky position -->
          <div class="lg:w-1/2 relative">
            <div class="sticky top-8 bg-gray-700 p-4 rounded-lg shadow-lg">
              <canvas ref="chartCanvas" class="w-full h-[33vh]"></canvas>
            </div>
          </div>
        </div>
      </div>
    </div>
  </client-only>
</template>

<script lang="ts" setup>
  import { ref, onMounted, watch } from 'vue';
  import Chart from 'chart.js/auto';

  const chartCanvas = ref<HTMLCanvasElement | null>(null);
  let lineChart: Chart | null = null;

  type SampleData = {
    id: string;
    timestamp: Date;
    value: number;
  };

  const sampleData = ref<SampleData[]>([]);

  function formatDate(date: Date): string {
    return date.toLocaleTimeString('de-CH', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Generates random sample data between two dates with specified interval
   * @param dateStart The start date for the data points
   * @param dateEnd The end date for the data points
   * @param intervalMinutes The interval between data points in minutes
   * @returns Array of SampleData objects
   */
  function generateSampleData(
    dateStart: Date,
    dateEnd: Date,
    intervalMinutes: number
  ): SampleData[] {
    const result: SampleData[] = [];

    // Calculate the total time range in milliseconds
    const startTime = dateStart.getTime();
    const endTime = dateEnd.getTime();

    // Convert interval from minutes to milliseconds
    const intervalMs = intervalMinutes * 60 * 1000;

    // Generate data points at each interval
    for (
      let currentTime = startTime;
      currentTime <= endTime;
      currentTime += intervalMs
    ) {
      const timestamp = new Date(currentTime);

      // Generate a random value between 0 and 100
      const value = Math.round(Math.random() * 100);

      // Create a unique ID using timestamp and random number
      const id = `data-${timestamp.getTime()}-${Math.floor(
        Math.random() * 1000
      )}`;

      result.push({
        id,
        timestamp,
        value,
      });
    }

    return result;
  }

  function createChart() {
    if (!chartCanvas.value) return;
    
    // Sort data chronologically 
    const sortedData = [...sampleData.value].sort((a, b) => 
      a.timestamp.getTime() - b.timestamp.getTime()
    );

    // Prepare data for chart
    const labels = sortedData.map(item => formatDate(item.timestamp));
    const values = sortedData.map(item => item.value);

    // Create chart
    lineChart = new Chart(chartCanvas.value, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Value over time',
          data: values,
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.2,
          pointRadius: 3,
          pointBackgroundColor: 'rgb(75, 192, 192)',
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            ticks: {
              color: '#CCC',
              maxRotation: 45,
              minRotation: 45
            },
            title: {
              display: true,
              text: 'Time',
              color: '#FFF'
            }
          },
          y: {
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            ticks: {
              color: '#CCC'
            },
            title: {
              display: true,
              text: 'Value',
              color: '#FFF'
            },
            beginAtZero: true
          }
        },
        plugins: {
          legend: {
            labels: {
              color: '#FFF'
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            titleColor: '#FFF',
            bodyColor: '#FFF',
            borderColor: 'rgba(255, 255, 255, 0.2)',
            borderWidth: 1
          }
        }
      }
    });
  }

  // Generate sample data
  onMounted(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(22, 0, 0, 0); // Set to 10:00 PM yesterday

    const today = new Date();
    today.setHours(6, 0, 0, 0); // Set to 6:00 AM today

    const generatedData = generateSampleData(yesterday, today, 15); // 15-minute intervals
    sampleData.value = generatedData;
    
    // Create chart after data is loaded
    setTimeout(() => {
      createChart();
    }, 100);
  });
</script>
