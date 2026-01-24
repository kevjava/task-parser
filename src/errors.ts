/**
 * Base error class for task-parser
 */
export class TaskParserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error thrown when parsing fails
 */
export class ParseError extends TaskParserError {
  constructor(
    message: string,
    public readonly line?: number,
    public readonly column?: number
  ) {
    const location = line !== undefined ? ` at line ${line}` : '';
    super(`${message}${location}`);
  }
}

/**
 * Error thrown when validation fails
 */
export class ValidationError extends TaskParserError {}
