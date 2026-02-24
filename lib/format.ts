/** Format a date string into a readable long-form date (e.g. "Monday, January 1, 2024"). */
export function formatArticleDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
