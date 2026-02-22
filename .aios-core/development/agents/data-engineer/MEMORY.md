# Data Engineer Agent Memory (Dara)

## Key Patterns
- CommonJS (`require`/`module.exports`), NOT ES Modules
- ES2022, Node.js 18+, 2-space indent, single quotes
- Absolute imports always (never relative `../`)
- kebab-case for files, PascalCase for components

## Project Structure
- `.aios-core/core/` — Core modules
- `packages/db/` — Database packages (if applicable)
- `tests/` — Test suites (mirrors source structure)

## Git Rules
- NEVER push — delegate to @devops
- Conventional commits: `feat:`, `fix:`, `docs:`, `test:`

## Database Conventions
- Schema design follows architect decisions
- RLS policies for row-level security
- Migration scripts with rollback procedures
