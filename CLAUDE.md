# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Test Commands

```bash
npm run build          # Compile TypeScript to dist/
npm test               # Run all tests
npm run test:coverage  # Run tests with coverage report
npm run lint           # Type-check without emitting
```

Run a single test file:
```bash
npx jest tests/duration.test.ts
```

Run tests matching a pattern:
```bash
npx jest --testNamePattern="should parse"
```

## Architecture

This library provides a mode-aware task description parser shared between two tools:
- **churn**: Task management with dates, recurrence, buckets, dependencies
- **tt-time-tracker**: Time tracking with timestamps, priorities, state markers

### Parser Modes

The `TaskParser` class accepts a `mode` option (`'churn'` or `'tt'`) that controls which syntax extensions are recognized:

| Syntax | churn | tt |
|--------|-------|-----|
| `@project`, `+tag`, `~duration` | shared | shared |
| `%bucket` | yes | no |
| `^N` (priority) | no | yes |
| `window:`, `after:` (deps) | yes | no |
| `(duration)`, `# remark` | no | yes |
| Timestamps, state markers | no | yes |

### Data Flow

```
Input string → tokenize(input, mode) → Token[] → parseXXXTokens() → ParsedTask
```

1. **Tokenizer** (`src/tokenizer.ts`): Mode-aware token extraction. Unrecognized patterns become DESCRIPTION tokens (part of title).

2. **Mode handlers** (`src/modes/`): Convert tokens to structured data. Each mode has its own `parseXXXTokens()` and `formatXXXTask()` functions.

3. **Utility parsers** (`src/parsers/`): Standalone parsing for duration, date, recurrence, time-window. Can be used independently.

### Key Design Decisions

- **Malformed patterns become title text** rather than throwing errors (e.g., `~2.5h` doesn't match duration pattern, so it stays in title)
- **First wins for duplicates** (multiple `@project` uses first one found)
- **Bucket uses `%`** (not `$` or `^`) to be shell-safe and avoid conflict with tt's priority syntax

## Commit Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).

Format: `<type>[optional scope]: <description>`

Types:
- `feat`: New feature (correlates with MINOR in semver)
- `fix`: Bug fix (correlates with PATCH in semver)
- `docs`: Documentation only
- `style`: Code style (formatting, semicolons, etc.)
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: Performance improvement
- `test`: Adding or correcting tests
- `chore`: Maintenance tasks
- `build`: Build system or external dependencies
- `ci`: CI configuration

Breaking changes: Add `!` before the colon (e.g., `feat!: remove deprecated API`) or include `BREAKING CHANGE:` in the footer.

## Git Workflow

Always use feature branches and pull requests for changes:

1. Create a feature branch from the main branch
2. Make changes and commit with conventional commit messages
3. Push the branch and create a pull request
4. Merge via PR after review

Never commit directly to the main branch.
