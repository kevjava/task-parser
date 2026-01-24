import { TaskParser } from '../../src/parser';
import { TTParsedTask } from '../../src/types';
import { ParseError } from '../../src/errors';

describe('TaskParser - tt mode', () => {
  const parser = new TaskParser({ mode: 'tt' });

  describe('basic parsing', () => {
    it('should parse timestamp and title', () => {
      const result = parser.parse('09:00 Meeting with team') as TTParsedTask;
      expect(result.timestamp).toBeDefined();
      expect(result.timestamp?.getHours()).toBe(9);
      expect(result.timestamp?.getMinutes()).toBe(0);
      expect(result.title).toBe('Meeting with team');
    });

    it('should parse full datetime', () => {
      const result = parser.parse('2025-01-15 09:30 Meeting') as TTParsedTask;
      expect(result.timestamp?.getFullYear()).toBe(2025);
      expect(result.timestamp?.getMonth()).toBe(0);
      expect(result.timestamp?.getDate()).toBe(15);
      expect(result.timestamp?.getHours()).toBe(9);
      expect(result.timestamp?.getMinutes()).toBe(30);
    });

    it('should parse with project', () => {
      const result = parser.parse('09:00 Review code @relay') as TTParsedTask;
      expect(result.title).toBe('Review code');
      expect(result.project).toBe('relay');
    });

    it('should parse with tags', () => {
      const result = parser.parse('09:00 Deploy app +urgent +backend') as TTParsedTask;
      expect(result.tags).toEqual(['urgent', 'backend']);
    });

    it('should parse with estimate duration', () => {
      const result = parser.parse('09:00 Meeting ~1h30m') as TTParsedTask;
      expect(result.duration).toBe(90);
    });
  });

  describe('tt-specific features', () => {
    it('should parse priority', () => {
      const result = parser.parse('09:00 Urgent task ^3') as TTParsedTask;
      expect(result.priority).toBe(3);
    });

    it('should parse explicit duration', () => {
      const result = parser.parse('09:00 Meeting (45m)') as TTParsedTask;
      expect(result.explicitDuration).toBe(45);
    });

    it('should parse remark', () => {
      const result = parser.parse('09:00 Meeting # This is a note') as TTParsedTask;
      expect(result.remark).toBe('This is a note');
    });

    it('should parse @end marker', () => {
      const result = parser.parse('17:00 @end') as TTParsedTask;
      expect(result.state).toBe('end');
    });

    it('should parse @pause marker', () => {
      const result = parser.parse('12:00 @pause') as TTParsedTask;
      expect(result.state).toBe('pause');
    });

    it('should parse @abandon marker', () => {
      const result = parser.parse('10:00 @abandon') as TTParsedTask;
      expect(result.state).toBe('abandon');
    });

    it('should parse @resume marker', () => {
      const result = parser.parse('14:00 @resume') as TTParsedTask;
      expect(result.resumeMarker).toBe('resume');
    });

    it('should parse @prev marker', () => {
      const result = parser.parse('14:00 @prev') as TTParsedTask;
      expect(result.resumeMarker).toBe('prev');
    });

    it('should parse @N marker', () => {
      const result = parser.parse('14:00 @5') as TTParsedTask;
      expect(result.resumeMarker).toBe('5');
    });

    it('should parse state suffix', () => {
      const result = parser.parse('09:00 Task ->completed') as TTParsedTask;
      expect(result.stateSuffix).toBe('completed');
    });

    it('should parse paused state suffix', () => {
      const result = parser.parse('09:00 Task ->paused') as TTParsedTask;
      expect(result.stateSuffix).toBe('paused');
    });

    it('should parse abandoned state suffix', () => {
      const result = parser.parse('09:00 Task ->abandoned') as TTParsedTask;
      expect(result.stateSuffix).toBe('abandoned');
    });
  });

  describe('complex tt examples', () => {
    it('should parse full entry with all tt features', () => {
      const result = parser.parse('09:00 Review PR @relay +code-review ~30m ^2 # Important fix') as TTParsedTask;
      expect(result.timestamp?.getHours()).toBe(9);
      expect(result.title).toBe('Review PR');
      expect(result.project).toBe('relay');
      expect(result.tags).toEqual(['code-review']);
      expect(result.duration).toBe(30);
      expect(result.priority).toBe(2);
      expect(result.remark).toBe('Important fix');
    });

    it('should parse resume with additional details', () => {
      const result = parser.parse('14:00 @prev Some additional context @work') as TTParsedTask;
      expect(result.resumeMarker).toBe('prev');
      expect(result.title).toBe('Some additional context');
      expect(result.project).toBe('work');
    });
  });

  describe('format (tt mode)', () => {
    it('should format basic tt entry', () => {
      const result = parser.format({
        timestamp: new Date('2025-01-15T09:00:00'),
        title: 'Meeting',
        tags: [],
        raw: '',
      });
      expect(result).toBe('09:00 Meeting');
    });

    it('should format tt entry with all fields', () => {
      const result = parser.format({
        timestamp: new Date('2025-01-15T09:30:00'),
        title: 'Review code',
        project: 'relay',
        tags: ['urgent'],
        duration: 60,
        explicitDuration: 45,
        priority: 3,
        remark: 'Important',
        raw: '',
      });
      expect(result).toBe('09:30 Review code @relay +urgent ~1h (45m) ^3 # Important');
    });

    it('should format end marker', () => {
      const result = parser.format({
        timestamp: new Date('2025-01-15T17:00:00'),
        title: '',
        state: 'end',
        tags: [],
        raw: '',
      });
      expect(result).toBe('17:00 @end');
    });

    it('should format resume marker', () => {
      const result = parser.format({
        timestamp: new Date('2025-01-15T14:00:00'),
        title: '',
        resumeMarker: 'prev',
        tags: [],
        raw: '',
      });
      expect(result).toBe('14:00 @prev');
    });

    it('should format state suffix', () => {
      const result = parser.format({
        timestamp: new Date('2025-01-15T09:00:00'),
        title: 'Task',
        stateSuffix: 'completed',
        tags: [],
        raw: '',
      });
      expect(result).toBe('09:00 Task ->completed');
    });
  });

  describe('tt mode does not parse churn features', () => {
    it('should not interpret $ as bucket', () => {
      const result = parser.parse('09:00 Task $100 payment') as TTParsedTask;
      expect(result.title).toBe('Task $100 payment');
      expect('bucket' in result).toBe(false);
    });

    it('should not interpret window: as time window', () => {
      const result = parser.parse('09:00 Check window:status') as TTParsedTask;
      expect(result.title).toBe('Check window:status');
    });

    it('should not interpret after: as dependencies', () => {
      const result = parser.parse('09:00 Do after:lunch') as TTParsedTask;
      expect(result.title).toBe('Do after:lunch');
    });
  });
});
