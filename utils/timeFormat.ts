/**
 * Converts a timestamp into a human-readable "time ago" string.
 * Example: "5 minutes ago", "2 hours ago", "3 days ago"
 * Very basic implementation. Consider using a library like `date-fns` for more robust formatting.
 */
export function timeAgo(timestamp: number | Date): string {
  const now = Date.now();
  const secondsPast = (now - new Date(timestamp).getTime()) / 1000;

  if (secondsPast < 60) {
    return `${Math.round(secondsPast)} seconds ago`;
  }
  if (secondsPast < 3600) {
    return `${Math.round(secondsPast / 60)} minutes ago`;
  }
  if (secondsPast <= 86400) {
    return `${Math.round(secondsPast / 3600)} hours ago`;
  }
  // More complex date formatting beyond a day
  const daysPast = Math.round(secondsPast / 86400);
  if (daysPast <= 7) {
     return `${daysPast} days ago`;
  }

  // For older dates, just return the date string
  return new Date(timestamp).toLocaleDateString();
}
