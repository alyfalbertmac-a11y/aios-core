# UX Design Expert Agent Memory (Uma)

## Key Patterns
- CommonJS (`require`/`module.exports`), NOT ES Modules
- ES2022, Node.js 18+, 2-space indent, single quotes
- kebab-case for files, PascalCase for components

## Project Structure
- `.aios-core/core/` — Core modules
- `docs/` — Documentation and design specs
- `packages/` — Shared packages

## Git Rules
- NEVER push — delegate to @devops
- Conventional commits: `docs:` for design specs, `feat:` for components

## Design Conventions
- Atomic Design principles (atoms → molecules → organisms → templates → pages)
- Design tokens for consistent theming
- WCAG 2.1 AA compliance target
