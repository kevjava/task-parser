import { ParseError } from '../errors';
import { RecurrenceMode, RecurrencePattern, RecurrenceType } from '../types';
import { getWeekdayIndex, isWeekday } from './date';

/**
 * Shorthand recurrence keywords
 */
const SHORTHAND = ['daily', 'weekly', 'monthly'] as const;

/**
 * Parse unit character to unit name
 */
const UNIT_MAP: Record<string, 'days' | 'weeks' | 'months'> = {
  d: 'days',
  w: 'weeks',
  m: 'months',
};

/**
 * Check if a token is a time in HH:MM format
 */
function isTime(token: string): boolean {
  return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(token);
}

/**
 * Normalize time to HH:MM format (ensures 2-digit hour)
 */
function normalizeTime(token: string): string {
  const [hour, minute] = token.split(':');
  return `${hour.padStart(2, '0')}:${minute}`;
}

/**
 * Try to parse recurrence from the beginning of a token array
 *
 * Supported formats:
 * - Shorthand: "daily", "weekly", "monthly"
 * - Calendar mode: "every monday", "every 2w", "every 3d", "every 1m"
 * - Completion mode: "after 2w", "after 30d", "after 3m"
 *
 * @param tokens - Array of tokens (words)
 * @param referenceDate - Reference date for anchor (default: today)
 * @returns Object with pattern and number of tokens consumed, or null if no recurrence
 * @throws ParseError if recurrence format is invalid
 */
export function parseRecurrence(
  tokens: string[],
  referenceDate?: Date
): { pattern: RecurrencePattern; tokensConsumed: number } | null {
  if (tokens.length === 0) {
    return null;
  }

  const first = tokens[0].toLowerCase();
  const anchor = referenceDate || new Date();

  // Shorthand: daily, weekly, monthly (with optional time)
  if (SHORTHAND.includes(first as typeof SHORTHAND[number])) {
    const pattern: RecurrencePattern = {
      mode: RecurrenceMode.CALENDAR,
      type: first as RecurrenceType,
      anchor,
    };

    // Check for optional time: "daily 09:00"
    if (tokens.length >= 2 && isTime(tokens[1])) {
      pattern.timeOfDay = normalizeTime(tokens[1]);
      return { pattern, tokensConsumed: 2 };
    }

    return { pattern, tokensConsumed: 1 };
  }

  // "every" pattern (calendar mode)
  if (first === 'every') {
    if (tokens.length < 2) {
      throw new ParseError('Expected weekday or interval after "every"');
    }

    const second = tokens[1].toLowerCase();

    // "every monday" or "every monday 16:00" (weekday with optional time)
    if (isWeekday(second)) {
      const dayOfWeek = getWeekdayIndex(second);
      const pattern: RecurrencePattern = {
        mode: RecurrenceMode.CALENDAR,
        type: RecurrenceType.WEEKLY,
        dayOfWeek,
        anchor,
      };

      // Check for optional time: "every monday 16:00"
      if (tokens.length >= 3 && isTime(tokens[2])) {
        pattern.timeOfDay = normalizeTime(tokens[2]);
        return { pattern, tokensConsumed: 3 };
      }

      return { pattern, tokensConsumed: 2 };
    }

    // "every 2w", "every 3d", "every 1m" (with optional time)
    const intervalMatch = second.match(/^(\d+)(d|w|m)$/);
    if (intervalMatch) {
      const interval = parseInt(intervalMatch[1], 10);
      const unit = UNIT_MAP[intervalMatch[2]];

      if (interval <= 0) {
        throw new ParseError(`Interval must be positive: every ${second}`);
      }

      const pattern: RecurrencePattern = {
        mode: RecurrenceMode.CALENDAR,
        type: RecurrenceType.INTERVAL,
        interval,
        unit,
        anchor,
      };

      // Check for optional time: "every 2w 09:00"
      if (tokens.length >= 3 && isTime(tokens[2])) {
        pattern.timeOfDay = normalizeTime(tokens[2]);
        return { pattern, tokensConsumed: 3 };
      }

      return { pattern, tokensConsumed: 2 };
    }

    throw new ParseError(`Invalid recurrence pattern: every ${second}`);
  }

  // "after" pattern (completion mode)
  if (first === 'after') {
    if (tokens.length < 2) {
      throw new ParseError('Expected interval after "after"');
    }

    const second = tokens[1].toLowerCase();

    // "after 2w", "after 30d", "after 3m" (with optional time)
    const intervalMatch = second.match(/^(\d+)(d|w|m)$/);
    if (intervalMatch) {
      const interval = parseInt(intervalMatch[1], 10);
      const unit = UNIT_MAP[intervalMatch[2]];

      if (interval <= 0) {
        throw new ParseError(`Interval must be positive: after ${second}`);
      }

      const pattern: RecurrencePattern = {
        mode: RecurrenceMode.COMPLETION,
        type: RecurrenceType.INTERVAL,
        interval,
        unit,
      };

      // Check for optional time: "after 2w 09:00"
      if (tokens.length >= 3 && isTime(tokens[2])) {
        pattern.timeOfDay = normalizeTime(tokens[2]);
        return { pattern, tokensConsumed: 3 };
      }

      return { pattern, tokensConsumed: 2 };
    }

    throw new ParseError(`Invalid recurrence pattern: after ${second}`);
  }

  // No recurrence pattern found
  return null;
}

/**
 * Format a RecurrencePattern back to string
 *
 * @param recurrence - RecurrencePattern to format
 * @returns Formatted string
 */
export function formatRecurrence(recurrence: RecurrencePattern): string {
  const WEEKDAY_NAMES = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ];

  const timeSuffix = recurrence.timeOfDay ? ` ${recurrence.timeOfDay}` : '';

  // Shorthand types
  if (
    recurrence.type === RecurrenceType.DAILY &&
    recurrence.mode === RecurrenceMode.CALENDAR
  ) {
    return `daily${timeSuffix}`;
  }

  if (
    recurrence.type === RecurrenceType.WEEKLY &&
    recurrence.mode === RecurrenceMode.CALENDAR &&
    recurrence.dayOfWeek !== undefined
  ) {
    return `every ${WEEKDAY_NAMES[recurrence.dayOfWeek]}${timeSuffix}`;
  }

  if (
    recurrence.type === RecurrenceType.MONTHLY &&
    recurrence.mode === RecurrenceMode.CALENDAR
  ) {
    return `monthly${timeSuffix}`;
  }

  // Interval patterns
  if (recurrence.type === RecurrenceType.INTERVAL) {
    const unitMap = { days: 'd', weeks: 'w', months: 'm' };
    const unit = unitMap[recurrence.unit!];
    const prefix = recurrence.mode === RecurrenceMode.CALENDAR ? 'every' : 'after';
    return `${prefix} ${recurrence.interval}${unit}${timeSuffix}`;
  }

  // Fallback for weekly without specific day
  if (recurrence.type === RecurrenceType.WEEKLY) {
    return `weekly${timeSuffix}`;
  }

  // Default
  return recurrence.mode === RecurrenceMode.CALENDAR ? 'weekly' : 'after 1w';
}
