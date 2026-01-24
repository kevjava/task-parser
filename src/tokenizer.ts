import { ParseError } from './errors';
import { ParserMode, Token, TokenType } from './types';

/**
 * Tokenizer result
 */
export interface TokenizeResult {
  tokens: Token[];
  raw: string;
}

/**
 * Check if a string looks like a timestamp (HH:MM or YYYY-MM-DD HH:MM)
 */
function isTimestamp(input: string): boolean {
  return /^(\d{4}-\d{2}-\d{2}\s+)?\d{1,2}:\d{2}(:\d{2})?$/.test(input);
}

/**
 * Tokenize a task description string
 *
 * @param input - Input string to tokenize
 * @param mode - Parser mode ('tt' or 'churn')
 * @returns TokenizeResult with tokens and raw input
 */
export function tokenize(input: string, mode: ParserMode): TokenizeResult {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new ParseError('Input cannot be empty');
  }

  const tokens: Token[] = [];
  let remaining = trimmed;
  let position = 0;

  // For tt mode, check for timestamp first
  if (mode === 'tt') {
    const timestampMatch = remaining.match(/^(\d{4}-\d{2}-\d{2}\s+)?\d{1,2}:\d{2}(:\d{2})?/);
    if (timestampMatch) {
      tokens.push({
        type: TokenType.TIMESTAMP,
        value: timestampMatch[0].trim(),
        position,
      });
      position += timestampMatch[0].length;
      remaining = remaining.slice(timestampMatch[0].length).trim();
    }

    // Check for tt state markers
    const stateMarkerMatch = remaining.match(/^@(end|pause|abandon|resume|prev|\d+)(?:\s|$)/);
    if (stateMarkerMatch) {
      const marker = stateMarkerMatch[1];
      let tokenType: TokenType;

      if (marker === 'end') {
        tokenType = TokenType.END_MARKER;
      } else if (marker === 'pause') {
        tokenType = TokenType.PAUSE_MARKER;
      } else if (marker === 'abandon') {
        tokenType = TokenType.ABANDON_MARKER;
      } else {
        tokenType = TokenType.RESUME_MARKER;
      }

      tokens.push({
        type: tokenType,
        value: marker,
        position,
      });
      position += stateMarkerMatch[0].length;
      remaining = remaining.slice(stateMarkerMatch[0].length).trim();
    }
  }

  // Collect description and metadata tokens
  const descriptionParts: string[] = [];
  let descStartPosition = position;

  while (remaining.length > 0) {
    // Skip leading whitespace
    const leadingSpace = remaining.match(/^\s+/);
    if (leadingSpace) {
      remaining = remaining.slice(leadingSpace[0].length);
      position += leadingSpace[0].length;
    }

    if (remaining.length === 0) break;

    // Check for metadata markers
    const char = remaining[0];

    // @project (shared) - but check for tt state markers first
    if (char === '@') {
      const projectMatch = remaining.match(/^@([a-zA-Z][a-zA-Z0-9_-]*)/);
      if (projectMatch) {
        // Flush description if any
        if (descriptionParts.length > 0) {
          tokens.push({
            type: TokenType.DESCRIPTION,
            value: descriptionParts.join(' ').trim(),
            position: descStartPosition,
          });
          descriptionParts.length = 0;
        }

        tokens.push({
          type: TokenType.PROJECT,
          value: projectMatch[1],
          position,
        });
        position += projectMatch[0].length;
        remaining = remaining.slice(projectMatch[0].length);
        descStartPosition = position;
        continue;
      }
    }

    // +tag (shared)
    if (char === '+') {
      const tagMatch = remaining.match(/^\+([a-zA-Z][a-zA-Z0-9_-]*)/);
      if (tagMatch) {
        if (descriptionParts.length > 0) {
          tokens.push({
            type: TokenType.DESCRIPTION,
            value: descriptionParts.join(' ').trim(),
            position: descStartPosition,
          });
          descriptionParts.length = 0;
        }

        tokens.push({
          type: TokenType.TAG,
          value: tagMatch[1],
          position,
        });
        position += tagMatch[0].length;
        remaining = remaining.slice(tagMatch[0].length);
        descStartPosition = position;
        continue;
      }
    }

    // ~duration (shared) - check longer pattern first
    if (char === '~') {
      const durationMatch = remaining.match(/^~(\d+h\d+m|\d+[hm])/);
      if (durationMatch) {
        if (descriptionParts.length > 0) {
          tokens.push({
            type: TokenType.DESCRIPTION,
            value: descriptionParts.join(' ').trim(),
            position: descStartPosition,
          });
          descriptionParts.length = 0;
        }

        tokens.push({
          type: TokenType.DURATION,
          value: durationMatch[1],
          position,
        });
        position += durationMatch[0].length;
        remaining = remaining.slice(durationMatch[0].length);
        descStartPosition = position;
        continue;
      }
    }

    // churn-specific: $bucket
    if (mode === 'churn' && char === '$') {
      const bucketMatch = remaining.match(/^\$([a-zA-Z][a-zA-Z0-9_-]*)/);
      if (bucketMatch) {
        if (descriptionParts.length > 0) {
          tokens.push({
            type: TokenType.DESCRIPTION,
            value: descriptionParts.join(' ').trim(),
            position: descStartPosition,
          });
          descriptionParts.length = 0;
        }

        tokens.push({
          type: TokenType.BUCKET,
          value: bucketMatch[1],
          position,
        });
        position += bucketMatch[0].length;
        remaining = remaining.slice(bucketMatch[0].length);
        descStartPosition = position;
        continue;
      }
    }

    // tt-specific: ^priority
    if (mode === 'tt' && char === '^') {
      const priorityMatch = remaining.match(/^\^([1-9])/);
      if (priorityMatch) {
        if (descriptionParts.length > 0) {
          tokens.push({
            type: TokenType.DESCRIPTION,
            value: descriptionParts.join(' ').trim(),
            position: descStartPosition,
          });
          descriptionParts.length = 0;
        }

        tokens.push({
          type: TokenType.PRIORITY,
          value: priorityMatch[1],
          position,
        });
        position += priorityMatch[0].length;
        remaining = remaining.slice(priorityMatch[0].length);
        descStartPosition = position;
        continue;
      }
    }

    // tt-specific: (explicit duration) - check longer pattern first
    if (mode === 'tt' && char === '(') {
      const explicitDurationMatch = remaining.match(/^\((\d+h\d+m|\d+[hm])\)/);
      if (explicitDurationMatch) {
        if (descriptionParts.length > 0) {
          tokens.push({
            type: TokenType.DESCRIPTION,
            value: descriptionParts.join(' ').trim(),
            position: descStartPosition,
          });
          descriptionParts.length = 0;
        }

        tokens.push({
          type: TokenType.EXPLICIT_DURATION,
          value: explicitDurationMatch[1],
          position,
        });
        position += explicitDurationMatch[0].length;
        remaining = remaining.slice(explicitDurationMatch[0].length);
        descStartPosition = position;
        continue;
      }
    }

    // tt-specific: # remark
    if (mode === 'tt' && char === '#' && remaining.length > 1 && remaining[1] === ' ') {
      if (descriptionParts.length > 0) {
        tokens.push({
          type: TokenType.DESCRIPTION,
          value: descriptionParts.join(' ').trim(),
          position: descStartPosition,
        });
        descriptionParts.length = 0;
      }

      // Remark is everything after "# "
      const remarkText = remaining.slice(2);
      tokens.push({
        type: TokenType.REMARK,
        value: remarkText,
        position,
      });
      break;
    }

    // tt-specific: ->state suffix
    if (mode === 'tt' && remaining.startsWith('->')) {
      const stateSuffixMatch = remaining.match(/^->(paused|completed|abandoned)/);
      if (stateSuffixMatch) {
        if (descriptionParts.length > 0) {
          tokens.push({
            type: TokenType.DESCRIPTION,
            value: descriptionParts.join(' ').trim(),
            position: descStartPosition,
          });
          descriptionParts.length = 0;
        }

        tokens.push({
          type: TokenType.STATE_SUFFIX,
          value: stateSuffixMatch[1],
          position,
        });
        position += stateSuffixMatch[0].length;
        remaining = remaining.slice(stateSuffixMatch[0].length);
        descStartPosition = position;
        continue;
      }
    }

    // churn-specific: window:HH:MM-HH:MM
    if (mode === 'churn' && remaining.startsWith('window:')) {
      const windowMatch = remaining.match(/^window:(\d{1,2}:\d{2}-\d{1,2}:\d{2})/);
      if (windowMatch) {
        if (descriptionParts.length > 0) {
          tokens.push({
            type: TokenType.DESCRIPTION,
            value: descriptionParts.join(' ').trim(),
            position: descStartPosition,
          });
          descriptionParts.length = 0;
        }

        tokens.push({
          type: TokenType.WINDOW,
          value: windowMatch[1],
          position,
        });
        position += windowMatch[0].length;
        remaining = remaining.slice(windowMatch[0].length);
        descStartPosition = position;
        continue;
      }
    }

    // churn-specific: after:IDs (dependencies)
    if (mode === 'churn' && remaining.startsWith('after:')) {
      const depsMatch = remaining.match(/^after:(\d+(?:,\d+)*)/);
      if (depsMatch) {
        if (descriptionParts.length > 0) {
          tokens.push({
            type: TokenType.DESCRIPTION,
            value: descriptionParts.join(' ').trim(),
            position: descStartPosition,
          });
          descriptionParts.length = 0;
        }

        tokens.push({
          type: TokenType.DEPENDENCIES,
          value: depsMatch[1],
          position,
        });
        position += depsMatch[0].length;
        remaining = remaining.slice(depsMatch[0].length);
        descStartPosition = position;
        continue;
      }
    }

    // Default: consume as description word
    const wordMatch = remaining.match(/^[^\s]+/);
    if (wordMatch) {
      descriptionParts.push(wordMatch[0]);
      position += wordMatch[0].length;
      remaining = remaining.slice(wordMatch[0].length);
    } else {
      break;
    }
  }

  // Flush remaining description
  if (descriptionParts.length > 0) {
    tokens.push({
      type: TokenType.DESCRIPTION,
      value: descriptionParts.join(' ').trim(),
      position: descStartPosition,
    });
  }

  return {
    tokens,
    raw: trimmed,
  };
}

/**
 * Find all tokens of a specific type
 */
export function findTokens(tokens: Token[], type: TokenType): Token[] {
  return tokens.filter((t) => t.type === type);
}

/**
 * Find the first token of a specific type
 */
export function findToken(tokens: Token[], type: TokenType): Token | undefined {
  return tokens.find((t) => t.type === type);
}
