import { ref } from 'vue';

export type SampleData = {
  id: string;
  timestamp: Date;
  value: number;
};

export function useSampleData() {
  const sampleData = ref<SampleData[]>([]);

  /**
   * Generates random sample data between two dates with specified interval
   */
  function generateData(dateStart: Date, dateEnd: Date, intervalMinutes: number): void {
    const result: SampleData[] = [];
    
    const startTime = dateStart.getTime();
    const endTime = dateEnd.getTime();
    const intervalMs = intervalMinutes * 60 * 1000;
    
    for (let currentTime = startTime; currentTime <= endTime; currentTime += intervalMs) {
      const timestamp = new Date(currentTime);
      const value = Math.round(Math.random() * 100);
      const id = `data-${timestamp.getTime()}-${Math.floor(Math.random() * 1000)}`;
      
      result.push({ id, timestamp, value });
    }
    
    sampleData.value = result;
  }
  
  return {
    sampleData,
    generateData
  };
}