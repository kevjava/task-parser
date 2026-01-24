import { ParseError } from './errors';
import {
  ChurnParsedTask,
  ParsedTask,
  ParserMode,
  ParserOptions,
  TTParsedTask,
} from './types';
import { tokenize } from './tokenizer';
import { parseChurnTokens, formatChurnTask } from './modes/churn';
import { parseTTTokens, formatTTTask } from './modes/tt';

/**
 * TaskParser - Mode-aware task description parser
 *
 * Parses task descriptions into structured data. Supports two modes:
 * - 'churn': For churn task management (dates, recurrence, buckets, windows, dependencies)
 * - 'tt': For tt-time-tracker (timestamps, priorities, explicit durations, remarks)
 *
 * Both modes share: @project, +tag, ~duration, title
 *
 * @example
 * ```typescript
 * // churn mode (default)
 * const parser = new TaskParser({ mode: 'churn' });
 * const task = parser.parse('2025-01-10 Deploy app @relay +urgent ~2h');
 *
 * // tt mode
 * const parser = new TaskParser({ mode: 'tt' });
 * const task = parser.parse('09:00 Meeting with team @work +meeting ~1h ^3');
 * ```
 */
export class TaskParser {
  private mode: ParserMode;
  private referenceDate?: Date;

  constructor(options?: ParserOptions) {
    this.mode = options?.mode ?? 'churn';
    this.referenceDate = options?.referenceDate;
  }

  /**
   * Parse a task description string
   *
   * @param input - Task description string
   * @returns ParsedTask (ChurnParsedTask or TTParsedTask depending on mode)
   * @throws ParseError if parsing fails
   */
  parse(input: string): ParsedTask {
    if (!input || typeof input !== 'string') {
      throw new ParseError('Task description cannot be empty');
    }

    const trimmed = input.trim();
    if (trimmed.length === 0) {
      throw new ParseError('Task description cannot be empty');
    }

    const { tokens, raw } = tokenize(trimmed, this.mode);

    if (this.mode === 'tt') {
      const task = parseTTTokens(tokens, raw);
      return task;
    } else {
      const task = parseChurnTokens(tokens, raw, this.referenceDate);
      if (!task.title) {
        throw new ParseError('Task title is required');
      }
      return task;
    }
  }

  /**
   * Format a parsed task back to string
   *
   * @param task - ParsedTask to format
   * @returns Formatted task description string
   */
  format(task: ParsedTask): string {
    if (this.mode === 'tt') {
      return formatTTTask(task as TTParsedTask);
    } else {
      return formatChurnTask(task as ChurnParsedTask);
    }
  }

  /**
   * Static helper for quick parsing in churn mode
   *
   * @param input - Task description string
   * @param referenceDate - Optional reference date for relative date parsing
   * @returns ChurnParsedTask
   */
  static parseChurn(input: string, referenceDate?: Date): ChurnParsedTask {
    const parser = new TaskParser({ mode: 'churn', referenceDate });
    return parser.parse(input) as ChurnParsedTask;
  }

  /**
   * Static helper for quick parsing in tt mode
   *
   * @param input - Task description string
   * @returns TTParsedTask
   */
  static parseTT(input: string): TTParsedTask {
    const parser = new TaskParser({ mode: 'tt' });
    return parser.parse(input) as TTParsedTask;
  }

  /**
   * Static helper for quick formatting in churn mode
   *
   * @param task - ChurnParsedTask to format
   * @returns Formatted string
   */
  static formatChurn(task: ChurnParsedTask): string {
    return formatChurnTask(task);
  }

  /**
   * Static helper for quick formatting in tt mode
   *
   * @param task - TTParsedTask to format
   * @returns Formatted string
   */
  static formatTT(task: TTParsedTask): string {
    return formatTTTask(task);
  }
}
