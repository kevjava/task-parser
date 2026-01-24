import { ParseError } from '../errors';
import { Token, TokenType, TTParsedTask } from '../types';
import { parseDuration } from '../parsers/duration';
import { findToken, findTokens } from '../tokenizer';

/**
 * Parse tokens in tt mode
 *
 * @param tokens - Array of tokens from tokenizer
 * @param raw - Raw input string
 * @returns TTParsedTask
 */
export function parseTTTokens(tokens: Token[], raw: string): TTParsedTask {
  const result: TTParsedTask = {
    title: '',
    tags: [],
    raw,
  };

  // Find timestamp
  const timestampToken = findToken(tokens, TokenType.TIMESTAMP);
  if (timestampToken) {
    result.timestamp = parseTimestamp(timestampToken.value);
  }

  // Find state markers
  const endMarker = findToken(tokens, TokenType.END_MARKER);
  const pauseMarker = findToken(tokens, TokenType.PAUSE_MARKER);
  const abandonMarker = findToken(tokens, TokenType.ABANDON_MARKER);
  const resumeMarker = findToken(tokens, TokenType.RESUME_MARKER);

  if (endMarker) {
    result.state = 'end';
  } else if (pauseMarker) {
    result.state = 'pause';
  } else if (abandonMarker) {
    result.state = 'abandon';
  }

  if (resumeMarker) {
    result.resumeMarker = resumeMarker.value;
  }

  // Find state suffix
  const stateSuffixToken = findToken(tokens, TokenType.STATE_SUFFIX);
  if (stateSuffixToken) {
    result.stateSuffix = stateSuffixToken.value as 'paused' | 'completed' | 'abandoned';
  }

  // Find description
  const descTokens = findTokens(tokens, TokenType.DESCRIPTION);
  if (descTokens.length > 0) {
    result.title = descTokens.map((t) => t.value).join(' ').trim();
  }

  // Find project
  const projectToken = findToken(tokens, TokenType.PROJECT);
  if (projectToken) {
    result.project = projectToken.value;
  }

  // Find tags
  const tagTokens = findTokens(tokens, TokenType.TAG);
  result.tags = tagTokens.map((t) => t.value);

  // Find duration (estimate)
  const durationToken = findToken(tokens, TokenType.DURATION);
  if (durationToken) {
    result.duration = parseDuration(durationToken.value);
  }

  // Find explicit duration
  const explicitDurationToken = findToken(tokens, TokenType.EXPLICIT_DURATION);
  if (explicitDurationToken) {
    result.explicitDuration = parseDuration(explicitDurationToken.value);
  }

  // Find priority
  const priorityToken = findToken(tokens, TokenType.PRIORITY);
  if (priorityToken) {
    result.priority = parseInt(priorityToken.value, 10);
  }

  // Find remark
  const remarkToken = findToken(tokens, TokenType.REMARK);
  if (remarkToken) {
    result.remark = remarkToken.value;
  }

  return result;
}

/**
 * Parse a timestamp string into a Date
 *
 * Supports:
 * - HH:MM
 * - HH:MM:SS
 * - YYYY-MM-DD HH:MM
 * - YYYY-MM-DD HH:MM:SS
 *
 * @param timestamp - Timestamp string
 * @returns Date object
 */
function parseTimestamp(timestamp: string): Date {
  const trimmed = timestamp.trim();

  // Check for full datetime
  const datetimeMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (datetimeMatch) {
    const [, year, month, day, hour, minute, second] = datetimeMatch;
    return new Date(
      parseInt(year, 10),
      parseInt(month, 10) - 1,
      parseInt(day, 10),
      parseInt(hour, 10),
      parseInt(minute, 10),
      second ? parseInt(second, 10) : 0
    );
  }

  // Time only (use today's date)
  const timeMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (timeMatch) {
    const [, hour, minute, second] = timeMatch;
    const today = new Date();
    return new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      parseInt(hour, 10),
      parseInt(minute, 10),
      second ? parseInt(second, 10) : 0
    );
  }

  throw new ParseError(`Invalid timestamp format: ${timestamp}`);
}

/**
 * Format a TTParsedTask back to string
 *
 * @param task - TTParsedTask to format
 * @returns Formatted string
 */
export function formatTTTask(task: TTParsedTask): string {
  const parts: string[] = [];

  // Timestamp
  if (task.timestamp) {
    const h = String(task.timestamp.getHours()).padStart(2, '0');
    const m = String(task.timestamp.getMinutes()).padStart(2, '0');
    parts.push(`${h}:${m}`);
  }

  // State markers
  if (task.resumeMarker) {
    parts.push(`@${task.resumeMarker}`);
  } else if (task.state) {
    parts.push(`@${task.state}`);
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

  // Duration (estimate)
  if (task.duration !== undefined) {
    parts.push(`~${formatDurationValue(task.duration)}`);
  }

  // Explicit duration
  if (task.explicitDuration !== undefined) {
    parts.push(`(${formatDurationValue(task.explicitDuration)})`);
  }

  // Priority
  if (task.priority !== undefined) {
    parts.push(`^${task.priority}`);
  }

  // State suffix
  if (task.stateSuffix) {
    parts.push(`->${task.stateSuffix}`);
  }

  // Remark
  if (task.remark) {
    parts.push(`# ${task.remark}`);
  }

  return parts.join(' ');
}

/**
 * Format duration in minutes to string
 */
function formatDurationValue(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours > 0 && mins > 0) {
    return `${hours}h${mins}m`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else {
    return `${mins}m`;
  }
}
