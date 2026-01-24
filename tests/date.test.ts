import {
  parseDate,
  formatDate,
  getNextWeekday,
  getWeekdayIndex,
  getWeekdayName,
  isWeekday,
} from '../src/parsers/date';
import { ParseError } from '../src/errors';

describe('parseDate', () => {
  // Use a fixed reference date for consistent tests
  const referenceDate = new Date('2025-01-15T12:00:00'); // Wednesday

  describe('ISO format', () => {
    it('should parse valid ISO dates', () => {
      const result = parseDate('2025-01-10', referenceDate);
      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2025);
      expect(result?.getMonth()).toBe(0); // January
      expect(result?.getDate()).toBe(10);
    });

    it('should throw on invalid ISO dates', () => {
      expect(() => parseDate('2025-13-01', referenceDate)).toThrow(ParseError);
      expect(() => parseDate('2025-00-01', referenceDate)).toThrow(ParseError);
    });
  });

  describe('relative dates', () => {
    it('should parse "today"', () => {
      const result = parseDate('today', referenceDate);
      expect(result?.getFullYear()).toBe(2025);
      expect(result?.getMonth()).toBe(0);
      expect(result?.getDate()).toBe(15);
    });

    it('should parse "tomorrow"', () => {
      const result = parseDate('tomorrow', referenceDate);
      expect(result?.getFullYear()).toBe(2025);
      expect(result?.getMonth()).toBe(0);
      expect(result?.getDate()).toBe(16);
    });

    it('should be case-insensitive', () => {
      expect(parseDate('TODAY', referenceDate)).not.toBeNull();
      expect(parseDate('Tomorrow', referenceDate)).not.toBeNull();
    });
  });

  describe('weekday names', () => {
    it('should parse weekday names to next occurrence', () => {
      // Reference is Wednesday Jan 15
      const monday = parseDate('monday', referenceDate);
      expect(monday?.getDate()).toBe(20); // Next Monday is Jan 20

      const friday = parseDate('friday', referenceDate);
      expect(friday?.getDate()).toBe(17); // Next Friday is Jan 17

      const wednesday = parseDate('wednesday', referenceDate);
      expect(wednesday?.getDate()).toBe(22); // Next Wednesday is Jan 22 (not today)
    });

    it('should be case-insensitive', () => {
      expect(parseDate('MONDAY', referenceDate)).not.toBeNull();
      expect(parseDate('Monday', referenceDate)).not.toBeNull();
    });
  });

  describe('non-date strings', () => {
    it('should return null for non-date strings', () => {
      expect(parseDate('hello', referenceDate)).toBeNull();
      expect(parseDate('deploy', referenceDate)).toBeNull();
      expect(parseDate('123', referenceDate)).toBeNull();
    });
  });
});

describe('formatDate', () => {
  it('should format date to ISO string', () => {
    const date = new Date('2025-01-10T12:00:00');
    expect(formatDate(date)).toBe('2025-01-10');
  });

  it('should pad single-digit months and days', () => {
    const date = new Date('2025-05-05T12:00:00');
    expect(formatDate(date)).toBe('2025-05-05');
  });
});

describe('getNextWeekday', () => {
  // Use explicit local date to avoid timezone issues
  const wednesday = new Date(2025, 0, 15); // Wednesday, Jan 15, 2025 (month is 0-indexed)

  it('should return next occurrence of future weekday', () => {
    // Friday is 2 days away
    const friday = getNextWeekday(5, wednesday);
    expect(friday.getDate()).toBe(17);
  });

  it('should return next week for same weekday', () => {
    // Next Wednesday is 7 days away
    const nextWednesday = getNextWeekday(3, wednesday);
    expect(nextWednesday.getDate()).toBe(22);
  });

  it('should return next week for past weekday', () => {
    // Monday was 2 days ago, next is 5 days away
    const monday = getNextWeekday(1, wednesday);
    expect(monday.getDate()).toBe(20);
  });
});

describe('getWeekdayIndex', () => {
  it('should return correct index for weekday names', () => {
    expect(getWeekdayIndex('sunday')).toBe(0);
    expect(getWeekdayIndex('monday')).toBe(1);
    expect(getWeekdayIndex('saturday')).toBe(6);
  });

  it('should be case-insensitive', () => {
    expect(getWeekdayIndex('MONDAY')).toBe(1);
    expect(getWeekdayIndex('Monday')).toBe(1);
  });

  it('should return -1 for invalid names', () => {
    expect(getWeekdayIndex('notaday')).toBe(-1);
  });
});

describe('getWeekdayName', () => {
  it('should return correct name for index', () => {
    expect(getWeekdayName(0)).toBe('sunday');
    expect(getWeekdayName(1)).toBe('monday');
    expect(getWeekdayName(6)).toBe('saturday');
  });

  it('should throw for invalid index', () => {
    expect(() => getWeekdayName(-1)).toThrow();
    expect(() => getWeekdayName(7)).toThrow();
  });
});

describe('isWeekday', () => {
  it('should return true for weekday names', () => {
    expect(isWeekday('monday')).toBe(true);
    expect(isWeekday('FRIDAY')).toBe(true);
  });

  it('should return false for non-weekday names', () => {
    expect(isWeekday('notaday')).toBe(false);
    expect(isWeekday('today')).toBe(false);
  });
});
