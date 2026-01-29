import { TaskParser } from '../../src/parser';
import { ChurnParsedTask } from '../../src/types';

describe('TaskParser - churn mode specific', () => {
  const parser = new TaskParser({ mode: 'churn' });

  describe('churn mode does not parse tt features', () => {
    it('should treat ^ as regular text (not priority)', () => {
      const result = parser.parse('Task with ^caret symbol') as ChurnParsedTask;
      expect(result.title).toBe('Task with ^caret symbol');
      expect('priority' in result).toBe(false);
    });

    it('should not parse (duration) as explicit duration', () => {
      const result = parser.parse('Meeting (30 min)') as ChurnParsedTask;
      expect(result.title).toBe('Meeting (30 min)');
      expect('explicitDuration' in result).toBe(false);
    });

    it('should not parse # as remark (treats as title)', () => {
      const result = parser.parse('Task #123') as ChurnParsedTask;
      expect(result.title).toBe('Task #123');
      expect('remark' in result).toBe(false);
    });

    it('should not parse timestamps', () => {
      const result = parser.parse('09:00 Meeting') as ChurnParsedTask;
      // In churn mode, "09:00" is not parsed as timestamp, it's part of title
      expect(result.title).toBe('09:00 Meeting');
      expect('timestamp' in result).toBe(false);
    });

    it('should not parse @end, @pause, @abandon as state markers', () => {
      // @end would be parsed as project
      const result = parser.parse('Task @end') as ChurnParsedTask;
      expect(result.project).toBe('end');
    });
  });

  describe('bucket parsing with %', () => {
    it('should parse simple bucket', () => {
      const result = parser.parse('Review docs %Admin') as ChurnParsedTask;
      expect(result.bucket).toBe('Admin');
    });

    it('should parse bucket with underscores', () => {
      const result = parser.parse('Task %Project_A') as ChurnParsedTask;
      expect(result.bucket).toBe('Project_A');
    });

    it('should parse bucket with dashes', () => {
      const result = parser.parse('Task %project-x') as ChurnParsedTask;
      expect(result.bucket).toBe('project-x');
    });

    it('should not confuse % in middle of word', () => {
      const result = parser.parse('Task is 50% done') as ChurnParsedTask;
      expect(result.title).toBe('Task is 50% done');
      expect(result.bucket).toBeUndefined();
    });
  });

  describe('weekday as date vs recurrence', () => {
    const referenceDate = new Date('2025-01-15'); // Wednesday
    const parserWithRef = new TaskParser({ mode: 'churn', referenceDate });

    it('should parse standalone weekday as date', () => {
      const result = parserWithRef.parse('monday Take out trash') as ChurnParsedTask;
      expect(result.date?.getDay()).toBe(1); // Monday
      expect(result.title).toBe('Take out trash');
      expect(result.recurrence).toBeUndefined();
    });

    it('should parse every weekday as recurrence', () => {
      const result = parserWithRef.parse('every monday Take out trash') as ChurnParsedTask;
      expect(result.recurrence?.dayOfWeek).toBe(1);
      expect(result.date).toBeUndefined();
    });
  });

  describe('after: vs after (recurrence)', () => {
    it('should parse after: as dependencies', () => {
      const result = parser.parse('Deploy after:143') as ChurnParsedTask;
      expect(result.dependencies).toEqual([143]);
      expect(result.recurrence).toBeUndefined();
    });

    it('should parse "after 2w" as completion recurrence', () => {
      const result = parser.parse('after 2w Get haircut') as ChurnParsedTask;
      expect(result.recurrence?.mode).toBe('completion');
      expect(result.dependencies).toBeUndefined();
    });

    it('should parse both in same task', () => {
      const result = parser.parse('after 2w Follow up after:143') as ChurnParsedTask;
      expect(result.recurrence?.mode).toBe('completion');
      expect(result.dependencies).toEqual([143]);
    });
  });

  describe('title extraction edge cases', () => {
    it('should handle metadata at beginning and end', () => {
      const result = parser.parse('@relay Fix the bug +urgent') as ChurnParsedTask;
      expect(result.project).toBe('relay');
      expect(result.title).toBe('Fix the bug');
      expect(result.tags).toEqual(['urgent']);
    });

    it('should handle metadata interspersed with title', () => {
      // Note: current parser is greedy, metadata breaks title
      const result = parser.parse('Fix @relay bug +urgent today') as ChurnParsedTask;
      expect(result.project).toBe('relay');
      expect(result.tags).toEqual(['urgent']);
      // Title is "Fix" + "bug" + "today" joined
      expect(result.title).toBe('Fix bug today');
    });

    it('should handle multiple projects (first wins)', () => {
      // First project found is used
      const result = parser.parse('Task @first @second') as ChurnParsedTask;
      expect(result.project).toBe('first');
    });

    it('should handle empty title after stripping metadata', () => {
      expect(() => parser.parse('@project +tag ~1h')).toThrow('title is required');
    });
  });

  describe('time window edge cases', () => {
    it('should parse midnight crossing window', () => {
      const result = parser.parse('Night shift window:22:00-06:00') as ChurnParsedTask;
      expect(result.window).toEqual({ start: '22:00', end: '06:00' });
    });

    it('should reject invalid hours', () => {
      expect(() => parser.parse('Task window:25:00-17:00')).toThrow();
    });

    it('should reject invalid minutes', () => {
      expect(() => parser.parse('Task window:09:60-17:00')).toThrow();
    });
  });

  describe('dependencies edge cases', () => {
    it('should parse single dependency', () => {
      const result = parser.parse('Task after:1') as ChurnParsedTask;
      expect(result.dependencies).toEqual([1]);
    });

    it('should parse many dependencies', () => {
      const result = parser.parse('Task after:1,2,3,4,5') as ChurnParsedTask;
      expect(result.dependencies).toEqual([1, 2, 3, 4, 5]);
    });

    it('should reject zero as dependency', () => {
      expect(() => parser.parse('Task after:0')).toThrow();
    });

    it('should treat negative dependency pattern as title text', () => {
      // after:-1 doesn't match the pattern (requires positive integers)
      const result = parser.parse('Task after:-1') as ChurnParsedTask;
      expect(result.title).toBe('Task after:-1');
      expect(result.dependencies).toBeUndefined();
    });

    it('should treat non-numeric dependency pattern as title text', () => {
      // after:abc doesn't match the pattern (requires numeric IDs)
      const result = parser.parse('Task after:abc') as ChurnParsedTask;
      expect(result.title).toBe('Task after:abc');
      expect(result.dependencies).toBeUndefined();
    });
  });
});
