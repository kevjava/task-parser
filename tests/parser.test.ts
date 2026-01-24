import { TaskParser } from '../src/parser';
import { RecurrenceMode, RecurrenceType } from '../src/types';
import { ParseError } from '../src/errors';

describe('TaskParser', () => {
  describe('constructor', () => {
    it('should default to churn mode', () => {
      const parser = new TaskParser();
      const result = parser.parse('Buy groceries');
      expect('bucket' in result || !('priority' in result)).toBe(true);
    });

    it('should accept mode option', () => {
      const churnParser = new TaskParser({ mode: 'churn' });
      const ttParser = new TaskParser({ mode: 'tt' });

      expect(churnParser.parse('Buy groceries').title).toBe('Buy groceries');
      expect(ttParser.parse('09:00 Meeting').title).toBe('Meeting');
    });
  });

  describe('churn mode - basic parsing', () => {
    const parser = new TaskParser({ mode: 'churn' });
    const referenceDate = new Date(2025, 0, 15); // Jan 15, 2025 local time
    const parserWithRef = new TaskParser({ mode: 'churn', referenceDate });

    it('should parse simple title', () => {
      const result = parser.parse('Buy groceries');
      expect(result.title).toBe('Buy groceries');
      expect(result.tags).toEqual([]);
    });

    it('should parse title with ISO date', () => {
      const result = parser.parse('2025-01-10 Deploy app');
      expect(result.title).toBe('Deploy app');
      expect('date' in result && result.date).toEqual(new Date('2025-01-10T00:00:00'));
    });

    it('should parse title with relative date', () => {
      const result = parserWithRef.parse('tomorrow Fix bug');
      expect(result.title).toBe('Fix bug');
      expect('date' in result && result.date?.getDate()).toBe(16);
    });

    it('should parse title with project', () => {
      const result = parser.parse('Fix bug @relay');
      expect(result.title).toBe('Fix bug');
      expect(result.project).toBe('relay');
    });

    it('should parse title with multiple tags', () => {
      const result = parser.parse('Deploy app +urgent +backend');
      expect(result.title).toBe('Deploy app');
      expect(result.tags).toEqual(['urgent', 'backend']);
    });

    it('should parse title with duration', () => {
      const result = parser.parse('Meeting ~1h30m');
      expect(result.title).toBe('Meeting');
      expect(result.duration).toBe(90);
    });

    it('should parse title with bucket', () => {
      const result = parser.parse('Review docs $ProjectA');
      expect(result.title).toBe('Review docs');
      expect('bucket' in result && result.bucket).toBe('ProjectA');
    });

    it('should parse title with time window', () => {
      const result = parser.parse('Meeting window:09:00-17:00');
      expect(result.title).toBe('Meeting');
      expect('window' in result && result.window).toEqual({ start: '09:00', end: '17:00' });
    });

    it('should parse title with dependencies', () => {
      const result = parser.parse('Deploy after:143,144');
      expect(result.title).toBe('Deploy');
      expect('dependencies' in result && result.dependencies).toEqual([143, 144]);
    });
  });

  describe('churn mode - recurrence parsing', () => {
    const referenceDate = new Date(2025, 0, 15); // Jan 15, 2025 local time
    const parser = new TaskParser({ mode: 'churn', referenceDate });

    it('should parse calendar recurrence with weekday', () => {
      const result = parser.parse('every monday Take out trash');
      expect(result.title).toBe('Take out trash');
      expect('recurrence' in result && result.recurrence).toMatchObject({
        mode: RecurrenceMode.CALENDAR,
        type: RecurrenceType.WEEKLY,
        dayOfWeek: 1,
      });
    });

    it('should parse completion recurrence', () => {
      const result = parser.parse('after 2w Get haircut');
      expect(result.title).toBe('Get haircut');
      expect('recurrence' in result && result.recurrence).toMatchObject({
        mode: RecurrenceMode.COMPLETION,
        type: RecurrenceType.INTERVAL,
        interval: 2,
        unit: 'weeks',
      });
    });

    it('should parse daily shorthand', () => {
      const result = parser.parse('daily Morning standup');
      expect('recurrence' in result && result.recurrence?.type).toBe(RecurrenceType.DAILY);
    });

    it('should parse interval recurrence', () => {
      const result = parser.parse('every 2w Team meeting');
      expect('recurrence' in result && result.recurrence).toMatchObject({
        mode: RecurrenceMode.CALENDAR,
        type: RecurrenceType.INTERVAL,
        interval: 2,
        unit: 'weeks',
      });
    });
  });

  describe('churn mode - complex examples', () => {
    const parser = new TaskParser({ mode: 'churn' });

    it('should parse full example with all metadata', () => {
      const result = parser.parse('2025-01-10 Deploy Relay @relay +deployment +urgent ~2h');
      expect(result.title).toBe('Deploy Relay');
      expect('date' in result && result.date).toBeDefined();
      expect(result.project).toBe('relay');
      expect(result.tags).toEqual(['deployment', 'urgent']);
      expect(result.duration).toBe(120);
    });

    it('should parse recurring task with window', () => {
      const result = parser.parse('every monday Take out trash +chore ~5m window:18:00-08:00');
      expect(result.title).toBe('Take out trash');
      expect('recurrence' in result && result.recurrence).toBeDefined();
      expect(result.tags).toEqual(['chore']);
      expect(result.duration).toBe(5);
      expect('window' in result && result.window).toEqual({ start: '18:00', end: '08:00' });
    });

    it('should parse task with dependencies', () => {
      const result = parser.parse('2025-01-05 Deploy to production @relay ~1h after:143,144');
      expect(result.title).toBe('Deploy to production');
      expect(result.project).toBe('relay');
      expect('dependencies' in result && result.dependencies).toEqual([143, 144]);
    });
  });

  describe('churn mode - error handling', () => {
    const parser = new TaskParser({ mode: 'churn' });

    it('should throw on empty input', () => {
      expect(() => parser.parse('')).toThrow(ParseError);
      expect(() => parser.parse('   ')).toThrow(ParseError);
    });

    it('should throw on missing title', () => {
      expect(() => parser.parse('@project +tag')).toThrow('title is required');
    });

    it('should treat malformed duration as title text', () => {
      // ~2.5h doesn't match the duration pattern, so it becomes part of the title
      const result = parser.parse('Task ~2.5h');
      expect(result.title).toBe('Task ~2.5h');
    });

    it('should throw on invalid time window', () => {
      expect(() => parser.parse('Task window:25:00-26:00')).toThrow(ParseError);
    });

    it('should treat malformed dependencies as title text', () => {
      // after:abc doesn't match the dependencies pattern, so it becomes part of the title
      const result = parser.parse('Task after:abc');
      expect(result.title).toBe('Task after:abc');
    });
  });

  describe('format (churn mode)', () => {
    const parser = new TaskParser({ mode: 'churn' });

    it('should format basic task', () => {
      const result = parser.format({
        title: 'Buy groceries',
        tags: [],
        raw: '',
      });
      expect(result).toBe('Buy groceries');
    });

    it('should format task with all fields', () => {
      const result = parser.format({
        title: 'Deploy app',
        date: new Date(2025, 0, 10), // Jan 10, 2025 local time
        project: 'relay',
        tags: ['urgent', 'backend'],
        duration: 120,
        bucket: 'ProjectA',
        window: { start: '09:00', end: '17:00' },
        dependencies: [143, 144],
        raw: '',
      });
      expect(result).toBe('2025-01-10 Deploy app @relay +urgent +backend ~2h $ProjectA window:09:00-17:00 after:143,144');
    });

    it('should format recurring task', () => {
      const result = parser.format({
        title: 'Take out trash',
        tags: ['chore'],
        recurrence: {
          mode: RecurrenceMode.CALENDAR,
          type: RecurrenceType.WEEKLY,
          dayOfWeek: 1,
        },
        raw: '',
      });
      expect(result).toBe('every monday Take out trash +chore');
    });
  });

  describe('static helpers', () => {
    it('should parse with parseChurn', () => {
      const result = TaskParser.parseChurn('Buy groceries @home');
      expect(result.title).toBe('Buy groceries');
      expect(result.project).toBe('home');
    });

    it('should parse with parseTT', () => {
      const result = TaskParser.parseTT('09:00 Meeting @work');
      expect(result.title).toBe('Meeting');
      expect(result.project).toBe('work');
    });

    it('should format with formatChurn', () => {
      const result = TaskParser.formatChurn({
        title: 'Test',
        tags: ['tag1'],
        raw: '',
      });
      expect(result).toBe('Test +tag1');
    });
  });
});
