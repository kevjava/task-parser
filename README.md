# @kevjava/task-parser

Shared task description grammar parser for [churn](https://github.com/kevjava/churn) and [tt-time-tracker](https://github.com/kevjava/tt-time-tracker).

## Installation

```bash
npm install @kevjava/task-parser
```

## Usage

### churn mode (default)

Parse task descriptions with dates, recurrence, buckets, time windows, and dependencies:

```typescript
import { TaskParser } from '@kevjava/task-parser';

const parser = new TaskParser({ mode: 'churn' });

// Simple task
const task1 = parser.parse('Buy groceries');
// { title: 'Buy groceries', tags: [], raw: '...' }

// Task with date and metadata
const task2 = parser.parse('2025-01-10 Deploy app @relay +urgent ~2h');
// { title: 'Deploy app', date: Date, project: 'relay', tags: ['urgent'], duration: 120, ... }

// Recurring task
const task3 = parser.parse('every monday Take out trash +chore ~5m window:18:00-08:00');
// { title: 'Take out trash', recurrence: {...}, tags: ['chore'], duration: 5, window: {...}, ... }

// Task with dependencies
const task4 = parser.parse('Deploy to production after:143,144');
// { title: 'Deploy to production', dependencies: [143, 144], ... }

// Format back to string
const formatted = parser.format(task2);
// '2025-01-10 Deploy app @relay +urgent ~2h'
```

### tt mode

Parse time tracker entries with timestamps, priorities, and explicit durations:

```typescript
import { TaskParser } from '@kevjava/task-parser';

const parser = new TaskParser({ mode: 'tt' });

// Basic time entry
const entry1 = parser.parse('09:00 Meeting with team @work');
// { timestamp: Date, title: 'Meeting with team', project: 'work', ... }

// Entry with priority and duration
const entry2 = parser.parse('09:00 Urgent task @relay +bug ~30m ^3');
// { timestamp: Date, title: 'Urgent task', project: 'relay', tags: ['bug'], duration: 30, priority: 3, ... }

// End of day marker
const entry3 = parser.parse('17:00 @end');
// { timestamp: Date, state: 'end', ... }

// Resume previous task
const entry4 = parser.parse('14:00 @prev');
// { timestamp: Date, resumeMarker: 'prev', ... }

// Format back to string
const formatted = parser.format(entry2);
// '09:00 Urgent task @relay +bug ~30m ^3'
```

### Static helpers

```typescript
import { TaskParser } from '@kevjava/task-parser';

// Quick parse without creating instance
const churnTask = TaskParser.parseChurn('Buy groceries @home');
const ttEntry = TaskParser.parseTT('09:00 Meeting @work');

// Quick format
const formatted = TaskParser.formatChurn(churnTask);
```

## Grammar

### Shared syntax (both modes)

| Syntax | Description | Example |
|--------|-------------|---------|
| `@project` | Project name | `@relay`, `@work` |
| `+tag` | Tag (multiple allowed) | `+urgent`, `+bug` |
| `~duration` | Estimated duration | `~2h`, `~30m`, `~1h30m` |

### churn-specific syntax

| Syntax | Description | Example |
|--------|-------------|---------|
| `YYYY-MM-DD` | ISO date | `2025-01-10` |
| `today`, `tomorrow` | Relative date | `today Fix bug` |
| `monday`...`sunday` | Next weekday | `friday Review code` |
| `$bucket` | Time allocation bucket | `$ProjectA` |
| `window:HH:MM-HH:MM` | Valid time range | `window:09:00-17:00` |
| `after:ID,ID` | Task dependencies | `after:143,144` |
| `every monday` | Calendar recurrence | `every monday Standup` |
| `every 2w` | Interval recurrence | `every 2w Review` |
| `daily`, `weekly`, `monthly` | Shorthand recurrence | `daily Standup` |
| `after 2w` | Completion-based recurrence | `after 2w Haircut` |

### tt-specific syntax

| Syntax | Description | Example |
|--------|-------------|---------|
| `HH:MM` | Timestamp | `09:00`, `14:30` |
| `YYYY-MM-DD HH:MM` | Full datetime | `2025-01-10 09:00` |
| `^N` | Priority (1-9) | `^1`, `^3` |
| `(duration)` | Explicit duration | `(45m)`, `(1h30m)` |
| `# text` | Remark/comment | `# Important note` |
| `@end` | End of work marker | `17:00 @end` |
| `@pause` | Pause marker | `12:00 @pause` |
| `@abandon` | Abandon task marker | `10:00 @abandon` |
| `@resume`, `@prev`, `@N` | Resume markers | `14:00 @prev` |
| `->state` | State suffix | `->completed`, `->paused` |

## Utility functions

The library also exports individual parsing utilities:

```typescript
import {
  parseDuration,
  formatDuration,
  parseDate,
  formatDate,
  parseRecurrence,
  formatRecurrence,
  parseTimeWindow,
  formatTimeWindow,
} from '@kevjava/task-parser';

// Duration
parseDuration('1h30m');  // 90 (minutes)
formatDuration(90);      // '1h30m'

// Date
parseDate('2025-01-10'); // Date object
parseDate('tomorrow');   // Date object
formatDate(new Date());  // '2025-01-15'

// Time window
parseTimeWindow('09:00-17:00'); // { start: '09:00', end: '17:00' }
formatTimeWindow({ start: '09:00', end: '17:00' }); // '09:00-17:00'
```

## Types

```typescript
import {
  ParsedTask,
  ChurnParsedTask,
  TTParsedTask,
  RecurrencePattern,
  RecurrenceMode,
  RecurrenceType,
  TimeWindow,
  ParserMode,
  ParserOptions,
} from '@kevjava/task-parser';
```

## Error handling

The parser throws `ParseError` for invalid input:

```typescript
import { TaskParser, ParseError } from '@kevjava/task-parser';

try {
  const parser = new TaskParser({ mode: 'churn' });
  parser.parse('@project +tag'); // No title
} catch (error) {
  if (error instanceof ParseError) {
    console.error('Parse error:', error.message);
  }
}
```

## License

MIT
