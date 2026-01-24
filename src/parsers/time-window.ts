import { ParseError } from '../errors';
import { TimeWindow } from '../types';

/**
 * Parse a time string (HH:MM) into hours and minutes
 *
 * @param timeStr - Time string in HH:MM format
 * @returns Object with hour and minute
 * @throws ParseError if format is invalid
 */
export function parseTime(timeStr: string): { hour: number; minute: number } {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    throw new ParseError(`Invalid time format: ${timeStr} (expected HH:MM)`);
  }

  const hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);

  if (hour < 0 || hour > 23) {
    throw new ParseError(`Invalid hour: ${hour} (must be 0-23)`);
  }
  if (minute < 0 || minute > 59) {
    throw new ParseError(`Invalid minute: ${minute} (must be 0-59)`);
  }

  return { hour, minute };
}

/**
 * Parse a time window string into a TimeWindow object
 *
 * Format: HH:MM-HH:MM (24-hour time)
 *
 * Supports windows that cross midnight (e.g., 18:00-08:00)
 *
 * @param input - Time window string
 * @returns TimeWindow object
 * @throws ParseError if format is invalid
 */
export function parseTimeWindow(input: string): TimeWindow {
  const trimmed = input.trim();
  const match = trimmed.match(/^(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/);

  if (!match) {
    throw new ParseError(`Invalid time window format: ${input} (expected HH:MM-HH:MM)`);
  }

  const startStr = match[1];
  const endStr = match[2];

  // Validate both times (will throw if invalid)
  parseTime(startStr);
  parseTime(endStr);

  // Normalize to HH:MM format (ensure 2-digit hours)
  const normalizeTime = (time: string): string => {
    const parts = time.split(':');
    return `${parts[0].padStart(2, '0')}:${parts[1]}`;
  };

  return {
    start: normalizeTime(startStr),
    end: normalizeTime(endStr),
  };
}

/**
 * Format a TimeWindow back to string
 *
 * @param window - TimeWindow to format
 * @returns Formatted string "HH:MM-HH:MM"
 */
export function formatTimeWindow(window: TimeWindow): string {
  return `${window.start}-${window.end}`;
}

/**
 * Check if a time window crosses midnight
 *
 * @param window - TimeWindow to check
 * @returns true if the window crosses midnight
 */
export function crossesMidnight(window: TimeWindow): boolean {
  const start = parseTime(window.start);
  const end = parseTime(window.end);

  const startMinutes = start.hour * 60 + start.minute;
  const endMinutes = end.hour * 60 + end.minute;

  return endMinutes <= startMinutes;
}

/**
 * Check if a given time is within a time window
 *
 * @param timeStr - Time to check (HH:MM format)
 * @param window - Time window
 * @returns true if time is within the window
 */
export function isTimeInWindow(timeStr: string, window: TimeWindow): boolean {
  const time = parseTime(timeStr);
  const start = parseTime(window.start);
  const end = parseTime(window.end);

  const timeMinutes = time.hour * 60 + time.minute;
  const startMinutes = start.hour * 60 + start.minute;
  const endMinutes = end.hour * 60 + end.minute;

  if (crossesMidnight(window)) {
    // Window crosses midnight: valid if time >= start OR time < end
    return timeMinutes >= startMinutes || timeMinutes < endMinutes;
  } else {
    // Normal window: valid if start <= time < end
    return timeMinutes >= startMinutes && timeMinutes < endMinutes;
  }
}
