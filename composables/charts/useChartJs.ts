import { ref, onMounted, onBeforeUnmount, type Ref } from 'vue';
import Chart from 'chart.js/auto';
import type { SampleData } from '../terminal/useSampleData';

export function useChartJs(sampleData: Ref<SampleData[]>) {
  const chartCanvas = ref<HTMLCanvasElement | null>(null);
  let chart: Chart | null = null;
  
  function formatTime(date: Date): string {
    return date.toLocaleTimeString('de-CH', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  
  function createChart() {
    if (!chartCanvas.value) return;
    
    // Cleanup existing chart if it exists
    if (chart) {
      chart.destroy();
    }
    
    // Sort data chronologically 
    const sortedData = [...sampleData.value].sort((a, b) => 
      a.timestamp.getTime() - b.timestamp.getTime()
    );

    // Prepare data for chart
    const labels = sortedData.map(item => formatTime(item.timestamp));
    const values = sortedData.map(item => item.value);

    // Create chart
    chart = new Chart(chartCanvas.value, {
      type: 'line',
      data: {
        labels,
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
  
  // Clean up chart when component is destroyed
  onBeforeUnmount(() => {
    if (chart) {
      chart.destroy();
      chart = null;
    }
  });
  
  return {
    chartCanvas,
    createChart
  };
}