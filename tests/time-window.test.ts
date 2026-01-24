import {
  parseTime,
  parseTimeWindow,
  formatTimeWindow,
  crossesMidnight,
  isTimeInWindow,
} from '../src/parsers/time-window';
import { ParseError } from '../src/errors';

describe('parseTime', () => {
  it('should parse valid times', () => {
    expect(parseTime('09:00')).toEqual({ hour: 9, minute: 0 });
    expect(parseTime('14:30')).toEqual({ hour: 14, minute: 30 });
    expect(parseTime('00:00')).toEqual({ hour: 0, minute: 0 });
    expect(parseTime('23:59')).toEqual({ hour: 23, minute: 59 });
  });

  it('should parse single-digit hours', () => {
    expect(parseTime('9:00')).toEqual({ hour: 9, minute: 0 });
  });

  it('should throw on invalid format', () => {
    expect(() => parseTime('9')).toThrow(ParseError);
    expect(() => parseTime('09:0')).toThrow(ParseError);
    expect(() => parseTime('09:000')).toThrow(ParseError);
    expect(() => parseTime('invalid')).toThrow(ParseError);
  });

  it('should throw on invalid hours', () => {
    expect(() => parseTime('24:00')).toThrow(ParseError);
    expect(() => parseTime('25:00')).toThrow(ParseError);
    expect(() => parseTime('-1:00')).toThrow(ParseError);
  });

  it('should throw on invalid minutes', () => {
    expect(() => parseTime('09:60')).toThrow(ParseError);
    expect(() => parseTime('09:99')).toThrow(ParseError);
  });
});

describe('parseTimeWindow', () => {
  it('should parse valid time windows', () => {
    const window = parseTimeWindow('09:00-17:00');
    expect(window).toEqual({ start: '09:00', end: '17:00' });
  });

  it('should normalize single-digit hours', () => {
    const window = parseTimeWindow('9:00-5:00');
    expect(window).toEqual({ start: '09:00', end: '05:00' });
  });

  it('should parse windows crossing midnight', () => {
    const window = parseTimeWindow('18:00-08:00');
    expect(window).toEqual({ start: '18:00', end: '08:00' });
  });

  it('should throw on invalid format', () => {
    expect(() => parseTimeWindow('09:00')).toThrow(ParseError);
    expect(() => parseTimeWindow('09:00-')).toThrow(ParseError);
    expect(() => parseTimeWindow('-17:00')).toThrow(ParseError);
    expect(() => parseTimeWindow('invalid')).toThrow(ParseError);
  });

  it('should throw on invalid times', () => {
    expect(() => parseTimeWindow('25:00-17:00')).toThrow(ParseError);
    expect(() => parseTimeWindow('09:00-25:00')).toThrow(ParseError);
  });
});

describe('formatTimeWindow', () => {
  it('should format time window to string', () => {
    expect(formatTimeWindow({ start: '09:00', end: '17:00' })).toBe('09:00-17:00');
    expect(formatTimeWindow({ start: '18:00', end: '08:00' })).toBe('18:00-08:00');
  });
});

describe('crossesMidnight', () => {
  it('should detect windows crossing midnight', () => {
    expect(crossesMidnight({ start: '18:00', end: '08:00' })).toBe(true);
    expect(crossesMidnight({ start: '22:00', end: '06:00' })).toBe(true);
    expect(crossesMidnight({ start: '23:59', end: '00:01' })).toBe(true);
  });

  it('should detect windows not crossing midnight', () => {
    expect(crossesMidnight({ start: '09:00', end: '17:00' })).toBe(false);
    expect(crossesMidnight({ start: '06:00', end: '22:00' })).toBe(false);
  });

  it('should detect same start/end as crossing midnight', () => {
    expect(crossesMidnight({ start: '09:00', end: '09:00' })).toBe(true);
  });
});

describe('isTimeInWindow', () => {
  describe('normal window (not crossing midnight)', () => {
    const window = { start: '09:00', end: '17:00' };

    it('should return true for times in window', () => {
      expect(isTimeInWindow('09:00', window)).toBe(true);
      expect(isTimeInWindow('12:00', window)).toBe(true);
      expect(isTimeInWindow('16:59', window)).toBe(true);
    });

    it('should return false for times outside window', () => {
      expect(isTimeInWindow('08:59', window)).toBe(false);
      expect(isTimeInWindow('17:00', window)).toBe(false);
      expect(isTimeInWindow('20:00', window)).toBe(false);
    });
  });

  describe('midnight-crossing window', () => {
    const window = { start: '18:00', end: '08:00' };

    it('should return true for times in window', () => {
      expect(isTimeInWindow('18:00', window)).toBe(true);
      expect(isTimeInWindow('22:00', window)).toBe(true);
      expect(isTimeInWindow('00:00', window)).toBe(true);
      expect(isTimeInWindow('07:59', window)).toBe(true);
    });

    it('should return false for times outside window', () => {
      expect(isTimeInWindow('08:00', window)).toBe(false);
      expect(isTimeInWindow('12:00', window)).toBe(false);
      expect(isTimeInWindow('17:59', window)).toBe(false);
    });
  });
});
