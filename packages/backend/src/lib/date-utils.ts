/**
 * Date formatting utilities for CloudLetters.
 */

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Formats a date string into English text format.
 * @param dateStr - ISO date string (YYYY-MM-DD) or Date object
 * @returns Formatted date, e.g. "July 1, 2024"
 */
export function formatDate(dateStr: string | Date): string {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;

  if (isNaN(date.getTime())) {
    return dateStr as string;
  }

  const day = date.getDate();
  const month = MONTHS[date.getMonth()];
  const year = date.getFullYear();

  return `${month} ${day}, ${year}`;
}

/** @deprecated Use formatDate instead */
export const formatDanishDate = formatDate;

/** @deprecated Use formatDate instead */
export function formatDanishDateFull(dateStr: string | Date): string {
  return formatDate(dateStr);
}

