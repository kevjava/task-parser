import { ParseError } from '../errors';

/**
 * Weekday names (lowercase)
 */
const WEEKDAYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

/**
 * Parse a date string into a Date object
 *
 * Supported formats:
 * - ISO date: "2025-01-10"
 * - Relative: "today", "tomorrow"
 * - Weekday: "monday", "tuesday", etc. (returns next occurrence)
 *
 * @param input - Date string to parse
 * @param referenceDate - Reference date for relative parsing (default: today)
 * @returns Date object or null if not a date format
 * @throws ParseError if format looks like a date but is invalid
 */
export function parseDate(input: string, referenceDate?: Date): Date | null {
  const trimmed = input.trim();

  // ISO format: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const date = new Date(trimmed + 'T00:00:00');
    if (isNaN(date.getTime())) {
      throw new ParseError(`Invalid date: ${trimmed}`);
    }
    return date;
  }

  const lower = trimmed.toLowerCase();
  const today = referenceDate ? new Date(referenceDate) : new Date();
  today.setHours(0, 0, 0, 0);

  // Relative dates
  if (lower === 'today') {
    return today;
  }

  if (lower === 'tomorrow') {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }

  // Weekday names
  const dayIndex = WEEKDAYS.indexOf(lower);
  if (dayIndex !== -1) {
    return getNextWeekday(dayIndex, today);
  }

  // Not a date format
  return null;
}

/**
 * Get the next occurrence of a weekday
 *
 * @param targetDay - Day of week (0 = Sunday, 6 = Saturday)
 * @param fromDate - Starting date
 * @returns Date of next occurrence
 */
export function getNextWeekday(targetDay: number, fromDate: Date): Date {
  const result = new Date(fromDate);
  const currentDay = result.getDay();

  let daysUntil = targetDay - currentDay;
  if (daysUntil <= 0) {
    daysUntil += 7; // Next week
  }

  result.setDate(result.getDate() + daysUntil);
  return result;
}

/**
 * Get weekday index from name
 *
 * @param name - Weekday name (case-insensitive)
 * @returns Day index (0-6) or -1 if not a weekday
 */
export function getWeekdayIndex(name: string): number {
  return WEEKDAYS.indexOf(name.toLowerCase());
}

/**
 * Get weekday name from index
 *
 * @param index - Day index (0-6)
 * @returns Weekday name
 */
export function getWeekdayName(index: number): string {
  if (index < 0 || index > 6) {
    throw new Error(`Invalid weekday index: ${index}`);
  }
  return WEEKDAYS[index];
}

/**
 * Check if a string is a weekday name
 *
 * @param input - String to check
 * @returns true if input is a weekday name
 */
export function isWeekday(input: string): boolean {
  return WEEKDAYS.includes(input.toLowerCase());
}

/**
 * Format a Date object to ISO date string (YYYY-MM-DD)
 *
 * @param date - Date to format
 * @returns ISO date string
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
