/**
 * Formats a date string with the given options, returning "N/A" for invalid dates.
 */
export function formatDate(dateStr: string, options: Intl.DateTimeFormatOptions): string {
  const date = new Date(dateStr);
  return isNaN(date.getTime())
    ? "N/A"
    : date.toLocaleDateString("en-US", options);
}
