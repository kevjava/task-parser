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

  // Shorthand: daily, weekly, monthly
  if (SHORTHAND.includes(first as typeof SHORTHAND[number])) {
    return {
      pattern: {
        mode: RecurrenceMode.CALENDAR,
        type: first as RecurrenceType,
        anchor,
      },
      tokensConsumed: 1,
    };
  }

  // "every" pattern (calendar mode)
  if (first === 'every') {
    if (tokens.length < 2) {
      throw new ParseError('Expected weekday or interval after "every"');
    }

    const second = tokens[1].toLowerCase();

    // "every monday" (weekday)
    if (isWeekday(second)) {
      const dayOfWeek = getWeekdayIndex(second);
      return {
        pattern: {
          mode: RecurrenceMode.CALENDAR,
          type: RecurrenceType.WEEKLY,
          dayOfWeek,
          anchor,
        },
        tokensConsumed: 2,
      };
    }

    // "every 2w", "every 3d", "every 1m"
    const intervalMatch = second.match(/^(\d+)(d|w|m)$/);
    if (intervalMatch) {
      const interval = parseInt(intervalMatch[1], 10);
      const unit = UNIT_MAP[intervalMatch[2]];

      if (interval <= 0) {
        throw new ParseError(`Interval must be positive: every ${second}`);
      }

      return {
        pattern: {
          mode: RecurrenceMode.CALENDAR,
          type: RecurrenceType.INTERVAL,
          interval,
          unit,
          anchor,
        },
        tokensConsumed: 2,
      };
    }

    throw new ParseError(`Invalid recurrence pattern: every ${second}`);
  }

  // "after" pattern (completion mode)
  if (first === 'after') {
    if (tokens.length < 2) {
      throw new ParseError('Expected interval after "after"');
    }

    const second = tokens[1].toLowerCase();

    // "after 2w", "after 30d", "after 3m"
    const intervalMatch = second.match(/^(\d+)(d|w|m)$/);
    if (intervalMatch) {
      const interval = parseInt(intervalMatch[1], 10);
      const unit = UNIT_MAP[intervalMatch[2]];

      if (interval <= 0) {
        throw new ParseError(`Interval must be positive: after ${second}`);
      }

      return {
        pattern: {
          mode: RecurrenceMode.COMPLETION,
          type: RecurrenceType.INTERVAL,
          interval,
          unit,
        },
        tokensConsumed: 2,
      };
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

  // Shorthand types
  if (
    recurrence.type === RecurrenceType.DAILY &&
    recurrence.mode === RecurrenceMode.CALENDAR
  ) {
    return 'daily';
  }

  if (
    recurrence.type === RecurrenceType.WEEKLY &&
    recurrence.mode === RecurrenceMode.CALENDAR &&
    recurrence.dayOfWeek !== undefined
  ) {
    return `every ${WEEKDAY_NAMES[recurrence.dayOfWeek]}`;
  }

  if (
    recurrence.type === RecurrenceType.MONTHLY &&
    recurrence.mode === RecurrenceMode.CALENDAR
  ) {
    return 'monthly';
  }

  // Interval patterns
  if (recurrence.type === RecurrenceType.INTERVAL) {
    const unitMap = { days: 'd', weeks: 'w', months: 'm' };
    const unit = unitMap[recurrence.unit!];
    const prefix = recurrence.mode === RecurrenceMode.CALENDAR ? 'every' : 'after';
    return `${prefix} ${recurrence.interval}${unit}`;
  }

  // Fallback for weekly without specific day
  if (recurrence.type === RecurrenceType.WEEKLY) {
    return 'weekly';
  }

  // Default
  return recurrence.mode === RecurrenceMode.CALENDAR ? 'weekly' : 'after 1w';
}
