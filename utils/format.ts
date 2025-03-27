/**
 * Format a date to display time in 24-hour format
 */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString('de-CH', {
    hour: '2-digit',
    minute: '2-digit',
  });
}