/**
 * Parser mode - determines which syntax extensions are active
 */
export type ParserMode = 'tt' | 'churn';

/**
 * Token types recognized by the parser
 */
export enum TokenType {
  // Shared tokens
  DESCRIPTION = 'DESCRIPTION',
  PROJECT = 'PROJECT',
  TAG = 'TAG',
  DURATION = 'DURATION',

  // churn-specific tokens
  DATE = 'DATE',
  BUCKET = 'BUCKET',
  RECURRENCE = 'RECURRENCE',
  WINDOW = 'WINDOW',
  DEPENDENCIES = 'DEPENDENCIES',

  // tt-specific tokens
  TIMESTAMP = 'TIMESTAMP',
  PRIORITY = 'PRIORITY',
  EXPLICIT_DURATION = 'EXPLICIT_DURATION',
  REMARK = 'REMARK',
  RESUME_MARKER = 'RESUME_MARKER',
  END_MARKER = 'END_MARKER',
  PAUSE_MARKER = 'PAUSE_MARKER',
  ABANDON_MARKER = 'ABANDON_MARKER',
  STATE_SUFFIX = 'STATE_SUFFIX',
}

/**
 * Represents a parsed token
 */
export interface Token {
  type: TokenType;
  value: string;
  position: number;
}

/**
 * Recurrence mode - calendar-based or completion-based
 */
export enum RecurrenceMode {
  CALENDAR = 'calendar',
  COMPLETION = 'completion',
}

/**
 * Recurrence type
 */
export enum RecurrenceType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  INTERVAL = 'interval',
}

/**
 * Recurrence pattern
 */
export interface RecurrencePattern {
  mode: RecurrenceMode;
  type: RecurrenceType;
  interval?: number;
  unit?: 'days' | 'weeks' | 'months';
  dayOfWeek?: number; // 0-6 (Sunday = 0)
  timeOfDay?: string; // HH:MM format (e.g., "16:00")
  anchor?: Date;
}

/**
 * Time window for task execution
 */
export interface TimeWindow {
  start: string; // HH:MM
  end: string; // HH:MM
}

/**
 * Base parsed task (shared fields)
 */
export interface ParsedTaskBase {
  title: string;
  project?: string;
  tags: string[];
  duration?: number; // minutes
  raw: string;
}

/**
 * churn-specific parsed task fields
 */
export interface ChurnParsedTask extends ParsedTaskBase {
  date?: Date;
  bucket?: string;
  recurrence?: RecurrencePattern;
  window?: TimeWindow;
  dependencies?: number[];
}

/**
 * tt-specific parsed task fields
 */
export interface TTParsedTask extends ParsedTaskBase {
  timestamp?: Date;
  priority?: number; // 1-9
  explicitDuration?: number; // minutes
  remark?: string;
  state?: 'end' | 'pause' | 'abandon';
  stateSuffix?: 'paused' | 'completed' | 'abandoned';
  resumeMarker?: string; // 'prev', 'resume', or a number
}

/**
 * Union type for parsed tasks
 */
export type ParsedTask = ChurnParsedTask | TTParsedTask;

/**
 * Parser options
 */
export interface ParserOptions {
  mode?: ParserMode;
  /**
   * Reference date for relative date parsing (default: today)
   */
  referenceDate?: Date;
}
