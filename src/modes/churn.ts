import { ParseError } from '../errors';
import { ChurnParsedTask, Token, TokenType, RecurrencePattern } from '../types';
import { parseDuration, formatDuration } from '../parsers/duration';
import { parseDate, formatDate, isWeekday } from '../parsers/date';
import { parseRecurrence, formatRecurrence } from '../parsers/recurrence';
import { parseTimeWindow, formatTimeWindow } from '../parsers/time-window';
import { findToken, findTokens } from '../tokenizer';

/**
 * Parse dependencies string into array of task IDs
 *
 * @param input - Comma-separated list of task IDs
 * @returns Array of task IDs
 */
function parseDependencies(input: string): number[] {
  const ids = input.split(',').map((s) => s.trim());
  const result: number[] = [];

  for (const id of ids) {
    const num = parseInt(id, 10);
    if (isNaN(num) || num <= 0) {
      throw new ParseError(`Invalid dependency ID: ${id} (must be positive integer)`);
    }
    result.push(num);
  }

  if (result.length === 0) {
    throw new ParseError('At least one dependency ID required');
  }

  return result;
}

/**
 * Parse tokens in churn mode
 *
 * @param tokens - Array of tokens from tokenizer
 * @param raw - Raw input string
 * @param referenceDate - Reference date for relative date/recurrence parsing
 * @returns ChurnParsedTask
 */
export function parseChurnTokens(
  tokens: Token[],
  raw: string,
  referenceDate?: Date
): ChurnParsedTask {
  const result: ChurnParsedTask = {
    title: '',
    tags: [],
    raw,
  };

  // Get description tokens - these may contain date/recurrence at the start
  const descTokens = findTokens(tokens, TokenType.DESCRIPTION);
  const descParts: string[] = [];

  if (descTokens.length > 0) {
    // First description token may contain recurrence or date
    const firstDesc = descTokens[0].value;
    const firstDescWords = firstDesc.split(/\s+/);

    // Try to parse recurrence from the beginning
    const recurrenceResult = parseRecurrence(firstDescWords, referenceDate);
    if (recurrenceResult) {
      result.recurrence = recurrenceResult.pattern;
      // Remove consumed tokens from description
      const remainingWords = firstDescWords.slice(recurrenceResult.tokensConsumed);
      if (remainingWords.length > 0) {
        descParts.push(remainingWords.join(' '));
      }
      // Add remaining description tokens
      for (let i = 1; i < descTokens.length; i++) {
        descParts.push(descTokens[i].value);
      }
    } else {
      // Try to parse date from the first word
      const dateResult = parseDate(firstDescWords[0], referenceDate);
      if (dateResult) {
        result.date = dateResult;
        // Remove the date word from description
        const remainingWords = firstDescWords.slice(1);
        if (remainingWords.length > 0) {
          descParts.push(remainingWords.join(' '));
        }
        // Add remaining description tokens
        for (let i = 1; i < descTokens.length; i++) {
          descParts.push(descTokens[i].value);
        }
      } else {
        // No recurrence or date - use all description tokens
        for (const token of descTokens) {
          descParts.push(token.value);
        }
      }
    }
  }

  result.title = descParts.join(' ').trim();

  // Find project
  const projectToken = findToken(tokens, TokenType.PROJECT);
  if (projectToken) {
    result.project = projectToken.value;
  }

  // Find tags
  const tagTokens = findTokens(tokens, TokenType.TAG);
  result.tags = tagTokens.map((t) => t.value);

  // Find duration
  const durationToken = findToken(tokens, TokenType.DURATION);
  if (durationToken) {
    result.duration = parseDuration(durationToken.value);
  }

  // Find bucket
  const bucketToken = findToken(tokens, TokenType.BUCKET);
  if (bucketToken) {
    result.bucket = bucketToken.value;
  }

  // Find window
  const windowToken = findToken(tokens, TokenType.WINDOW);
  if (windowToken) {
    result.window = parseTimeWindow(windowToken.value);
  }

  // Find dependencies
  const depsToken = findToken(tokens, TokenType.DEPENDENCIES);
  if (depsToken) {
    result.dependencies = parseDependencies(depsToken.value);
  }

  return result;
}

/**
 * Format a ChurnParsedTask back to string
 *
 * @param task - ChurnParsedTask to format
 * @returns Formatted string
 */
export function formatChurnTask(task: ChurnParsedTask): string {
  const parts: string[] = [];

  // Recurrence (before date/title)
  if (task.recurrence) {
    parts.push(formatRecurrence(task.recurrence));
  }

  // Date (if no recurrence)
  if (task.date && !task.recurrence) {
    parts.push(formatDate(task.date));
  }

  // Title
  if (task.title) {
    parts.push(task.title);
  }

  // Project
  if (task.project) {
    parts.push(`@${task.project}`);
  }

  // Tags
  for (const tag of task.tags) {
    parts.push(`+${tag}`);
  }

  // Duration
  if (task.duration !== undefined) {
    parts.push(`~${formatDuration(task.duration)}`);
  }

  // Bucket
  if (task.bucket) {
    parts.push(`$${task.bucket}`);
  }

  // Window
  if (task.window) {
    parts.push(`window:${formatTimeWindow(task.window)}`);
  }

  // Dependencies
  if (task.dependencies && task.dependencies.length > 0) {
    parts.push(`after:${task.dependencies.join(',')}`);
  }

  return parts.join(' ');
}
