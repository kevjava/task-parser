import { parseRecurrence, formatRecurrence } from '../src/parsers/recurrence';
import { RecurrenceMode, RecurrenceType } from '../src/types';
import { ParseError } from '../src/errors';

describe('parseRecurrence', () => {
  const referenceDate = new Date('2025-01-15');

  describe('shorthand patterns', () => {
    it('should parse "daily"', () => {
      const result = parseRecurrence(['daily', 'task'], referenceDate);
      expect(result).not.toBeNull();
      expect(result?.pattern.mode).toBe(RecurrenceMode.CALENDAR);
      expect(result?.pattern.type).toBe(RecurrenceType.DAILY);
      expect(result?.tokensConsumed).toBe(1);
    });

    it('should parse "weekly"', () => {
      const result = parseRecurrence(['weekly', 'task'], referenceDate);
      expect(result?.pattern.type).toBe(RecurrenceType.WEEKLY);
      expect(result?.tokensConsumed).toBe(1);
    });

    it('should parse "monthly"', () => {
      const result = parseRecurrence(['monthly', 'task'], referenceDate);
      expect(result?.pattern.type).toBe(RecurrenceType.MONTHLY);
      expect(result?.tokensConsumed).toBe(1);
    });

    it('should be case-insensitive', () => {
      expect(parseRecurrence(['DAILY', 'task'], referenceDate)).not.toBeNull();
      expect(parseRecurrence(['Weekly', 'task'], referenceDate)).not.toBeNull();
    });
  });

  describe('weekdays shorthand', () => {
    it('should parse "weekdays"', () => {
      const result = parseRecurrence(['weekdays', 'task'], referenceDate);
      expect(result).not.toBeNull();
      expect(result?.pattern.mode).toBe(RecurrenceMode.CALENDAR);
      expect(result?.pattern.type).toBe(RecurrenceType.WEEKLY);
      expect(result?.pattern.daysOfWeek).toEqual([1, 2, 3, 4, 5]);
      expect(result?.tokensConsumed).toBe(1);
    });

    it('should parse "weekdays 09:00"', () => {
      const result = parseRecurrence(['weekdays', '09:00', 'task'], referenceDate);
      expect(result?.pattern.daysOfWeek).toEqual([1, 2, 3, 4, 5]);
      expect(result?.pattern.timeOfDay).toBe('09:00');
      expect(result?.tokensConsumed).toBe(2);
    });

    it('should be case-insensitive', () => {
      expect(parseRecurrence(['WEEKDAYS', 'task'], referenceDate)?.pattern.daysOfWeek).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('comma-separated days', () => {
    it('should parse "Mon,Tue,Thu"', () => {
      const result = parseRecurrence(['Mon,Tue,Thu', 'task'], referenceDate);
      expect(result).not.toBeNull();
      expect(result?.pattern.mode).toBe(RecurrenceMode.CALENDAR);
      expect(result?.pattern.type).toBe(RecurrenceType.WEEKLY);
      expect(result?.pattern.daysOfWeek).toEqual([1, 2, 4]);
      expect(result?.tokensConsumed).toBe(1);
    });

    it('should parse "Mon,Wed,Fri 09:30"', () => {
      const result = parseRecurrence(['Mon,Wed,Fri', '09:30', 'task'], referenceDate);
      expect(result?.pattern.daysOfWeek).toEqual([1, 3, 5]);
      expect(result?.pattern.timeOfDay).toBe('09:30');
      expect(result?.tokensConsumed).toBe(2);
    });

    it('should sort days in order', () => {
      const result = parseRecurrence(['Fri,Mon,Wed', 'task'], referenceDate);
      expect(result?.pattern.daysOfWeek).toEqual([1, 3, 5]);
    });

    it('should handle full day names', () => {
      const result = parseRecurrence(['Monday,Wednesday,Friday', 'task'], referenceDate);
      expect(result?.pattern.daysOfWeek).toEqual([1, 3, 5]);
    });

    it('should handle mixed case', () => {
      const result = parseRecurrence(['MON,tue,Thu', 'task'], referenceDate);
      expect(result?.pattern.daysOfWeek).toEqual([1, 2, 4]);
    });
  });

  describe('every weekday patterns', () => {
    it('should parse "every monday"', () => {
      const result = parseRecurrence(['every', 'monday', 'task'], referenceDate);
      expect(result?.pattern.mode).toBe(RecurrenceMode.CALENDAR);
      expect(result?.pattern.type).toBe(RecurrenceType.WEEKLY);
      expect(result?.pattern.dayOfWeek).toBe(1);
      expect(result?.tokensConsumed).toBe(2);
    });

    it('should parse all weekdays', () => {
      const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      weekdays.forEach((day, index) => {
        const result = parseRecurrence(['every', day, 'task'], referenceDate);
        expect(result?.pattern.dayOfWeek).toBe(index);
      });
    });

    it('should be case-insensitive', () => {
      expect(parseRecurrence(['EVERY', 'MONDAY', 'task'], referenceDate)?.pattern.dayOfWeek).toBe(1);
    });
  });

  describe('every interval patterns', () => {
    it('should parse "every 2w"', () => {
      const result = parseRecurrence(['every', '2w', 'task'], referenceDate);
      expect(result?.pattern.mode).toBe(RecurrenceMode.CALENDAR);
      expect(result?.pattern.type).toBe(RecurrenceType.INTERVAL);
      expect(result?.pattern.interval).toBe(2);
      expect(result?.pattern.unit).toBe('weeks');
      expect(result?.tokensConsumed).toBe(2);
    });

    it('should parse days, weeks, months', () => {
      expect(parseRecurrence(['every', '3d', 'task'], referenceDate)?.pattern.unit).toBe('days');
      expect(parseRecurrence(['every', '4w', 'task'], referenceDate)?.pattern.unit).toBe('weeks');
      expect(parseRecurrence(['every', '6m', 'task'], referenceDate)?.pattern.unit).toBe('months');
    });

    it('should include anchor date', () => {
      const result = parseRecurrence(['every', '2w', 'task'], referenceDate);
      expect(result?.pattern.anchor).toBeDefined();
    });
  });

  describe('after patterns (completion mode)', () => {
    it('should parse "after 2w"', () => {
      const result = parseRecurrence(['after', '2w', 'task'], referenceDate);
      expect(result?.pattern.mode).toBe(RecurrenceMode.COMPLETION);
      expect(result?.pattern.type).toBe(RecurrenceType.INTERVAL);
      expect(result?.pattern.interval).toBe(2);
      expect(result?.pattern.unit).toBe('weeks');
      expect(result?.tokensConsumed).toBe(2);
    });

    it('should parse days, weeks, months', () => {
      expect(parseRecurrence(['after', '30d', 'task'], referenceDate)?.pattern.unit).toBe('days');
      expect(parseRecurrence(['after', '1w', 'task'], referenceDate)?.pattern.unit).toBe('weeks');
      expect(parseRecurrence(['after', '3m', 'task'], referenceDate)?.pattern.unit).toBe('months');
    });

    it('should NOT include anchor date', () => {
      const result = parseRecurrence(['after', '2w', 'task'], referenceDate);
      expect(result?.pattern.anchor).toBeUndefined();
    });
  });

  describe('non-recurrence patterns', () => {
    it('should return null for non-recurrence tokens', () => {
      expect(parseRecurrence(['deploy', 'app'], referenceDate)).toBeNull();
      expect(parseRecurrence(['2025-01-10', 'task'], referenceDate)).toBeNull();
      expect(parseRecurrence(['today', 'task'], referenceDate)).toBeNull();
    });

    it('should return null for empty array', () => {
      expect(parseRecurrence([], referenceDate)).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should throw on missing pattern after "every"', () => {
      expect(() => parseRecurrence(['every'], referenceDate)).toThrow(ParseError);
    });

    it('should throw on missing pattern after "after"', () => {
      expect(() => parseRecurrence(['after'], referenceDate)).toThrow(ParseError);
    });

    it('should throw on invalid "every" pattern', () => {
      expect(() => parseRecurrence(['every', 'invalid'], referenceDate)).toThrow(ParseError);
      expect(() => parseRecurrence(['every', '2x'], referenceDate)).toThrow(ParseError);
    });

    it('should throw on invalid "after" pattern', () => {
      expect(() => parseRecurrence(['after', 'monday'], referenceDate)).toThrow(ParseError);
      expect(() => parseRecurrence(['after', 'invalid'], referenceDate)).toThrow(ParseError);
    });
  });

  describe('time-of-day patterns', () => {
    it('should parse "daily 09:00"', () => {
      const result = parseRecurrence(['daily', '09:00', 'task'], referenceDate);
      expect(result?.pattern.type).toBe(RecurrenceType.DAILY);
      expect(result?.pattern.timeOfDay).toBe('09:00');
      expect(result?.tokensConsumed).toBe(2);
    });

    it('should parse "weekly 14:30"', () => {
      const result = parseRecurrence(['weekly', '14:30', 'task'], referenceDate);
      expect(result?.pattern.type).toBe(RecurrenceType.WEEKLY);
      expect(result?.pattern.timeOfDay).toBe('14:30');
      expect(result?.tokensConsumed).toBe(2);
    });

    it('should parse "every monday 16:00"', () => {
      const result = parseRecurrence(['every', 'monday', '16:00', 'task'], referenceDate);
      expect(result?.pattern.type).toBe(RecurrenceType.WEEKLY);
      expect(result?.pattern.dayOfWeek).toBe(1);
      expect(result?.pattern.timeOfDay).toBe('16:00');
      expect(result?.tokensConsumed).toBe(3);
    });

    it('should parse "every 2w 10:00"', () => {
      const result = parseRecurrence(['every', '2w', '10:00', 'task'], referenceDate);
      expect(result?.pattern.type).toBe(RecurrenceType.INTERVAL);
      expect(result?.pattern.interval).toBe(2);
      expect(result?.pattern.unit).toBe('weeks');
      expect(result?.pattern.timeOfDay).toBe('10:00');
      expect(result?.tokensConsumed).toBe(3);
    });

    it('should parse "after 1w 09:00"', () => {
      const result = parseRecurrence(['after', '1w', '09:00', 'task'], referenceDate);
      expect(result?.pattern.mode).toBe(RecurrenceMode.COMPLETION);
      expect(result?.pattern.interval).toBe(1);
      expect(result?.pattern.timeOfDay).toBe('09:00');
      expect(result?.tokensConsumed).toBe(3);
    });

    it('should normalize single-digit hours', () => {
      const result = parseRecurrence(['daily', '9:00', 'task'], referenceDate);
      expect(result?.pattern.timeOfDay).toBe('09:00');
    });

    it('should handle 24-hour format', () => {
      const result = parseRecurrence(['daily', '23:59', 'task'], referenceDate);
      expect(result?.pattern.timeOfDay).toBe('23:59');
    });

    it('should not consume non-time tokens', () => {
      const result = parseRecurrence(['daily', 'task', 'description'], referenceDate);
      expect(result?.pattern.timeOfDay).toBeUndefined();
      expect(result?.tokensConsumed).toBe(1);
    });
  });
});

describe('formatRecurrence', () => {
  it('should format daily', () => {
    expect(formatRecurrence({
      mode: RecurrenceMode.CALENDAR,
      type: RecurrenceType.DAILY,
    })).toBe('daily');
  });

  it('should format weekly with day', () => {
    expect(formatRecurrence({
      mode: RecurrenceMode.CALENDAR,
      type: RecurrenceType.WEEKLY,
      dayOfWeek: 1,
    })).toBe('every monday');
  });

  it('should format monthly', () => {
    expect(formatRecurrence({
      mode: RecurrenceMode.CALENDAR,
      type: RecurrenceType.MONTHLY,
    })).toBe('monthly');
  });

  it('should format calendar interval', () => {
    expect(formatRecurrence({
      mode: RecurrenceMode.CALENDAR,
      type: RecurrenceType.INTERVAL,
      interval: 2,
      unit: 'weeks',
    })).toBe('every 2w');
  });

  it('should format completion interval', () => {
    expect(formatRecurrence({
      mode: RecurrenceMode.COMPLETION,
      type: RecurrenceType.INTERVAL,
      interval: 30,
      unit: 'days',
    })).toBe('after 30d');
  });

  it('should format daily with time', () => {
    expect(formatRecurrence({
      mode: RecurrenceMode.CALENDAR,
      type: RecurrenceType.DAILY,
      timeOfDay: '09:00',
    })).toBe('daily 09:00');
  });

  it('should format weekly with day and time', () => {
    expect(formatRecurrence({
      mode: RecurrenceMode.CALENDAR,
      type: RecurrenceType.WEEKLY,
      dayOfWeek: 1,
      timeOfDay: '16:00',
    })).toBe('every monday 16:00');
  });

  it('should format interval with time', () => {
    expect(formatRecurrence({
      mode: RecurrenceMode.CALENDAR,
      type: RecurrenceType.INTERVAL,
      interval: 2,
      unit: 'weeks',
      timeOfDay: '10:00',
    })).toBe('every 2w 10:00');
  });

  it('should format completion interval with time', () => {
    expect(formatRecurrence({
      mode: RecurrenceMode.COMPLETION,
      type: RecurrenceType.INTERVAL,
      interval: 1,
      unit: 'weeks',
      timeOfDay: '09:00',
    })).toBe('after 1w 09:00');
  });

  it('should format weekdays', () => {
    expect(formatRecurrence({
      mode: RecurrenceMode.CALENDAR,
      type: RecurrenceType.WEEKLY,
      daysOfWeek: [1, 2, 3, 4, 5],
    })).toBe('weekdays');
  });

  it('should format weekdays with time', () => {
    expect(formatRecurrence({
      mode: RecurrenceMode.CALENDAR,
      type: RecurrenceType.WEEKLY,
      daysOfWeek: [1, 2, 3, 4, 5],
      timeOfDay: '09:00',
    })).toBe('weekdays 09:00');
  });

  it('should format comma-separated days', () => {
    expect(formatRecurrence({
      mode: RecurrenceMode.CALENDAR,
      type: RecurrenceType.WEEKLY,
      daysOfWeek: [1, 2, 4],
    })).toBe('Mon,Tue,Thu');
  });

  it('should format comma-separated days with time', () => {
    expect(formatRecurrence({
      mode: RecurrenceMode.CALENDAR,
      type: RecurrenceType.WEEKLY,
      daysOfWeek: [1, 3, 5],
      timeOfDay: '09:30',
    })).toBe('Mon,Wed,Fri 09:30');
  });
});
