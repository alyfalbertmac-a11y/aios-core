# Story NOG-16B: Dependency Classification + Entity Lifecycle

## Metadata

| Field | Value |
|-------|-------|
| **Story ID** | NOG-16B |
| **Epic** | NOGIC — Code Intelligence Integration |
| **Type** | Enhancement |
| **Status** | Draft |
| **Priority** | P1 |
| **Points** | 3 |
| **Agent** | @dev (Dex) |
| **Quality Gate** | @qa (Quinn) |
| **Blocked By** | NOG-16A (needs expanded scan config for accurate classification) |
| **Branch** | `feat/epic-nogic-code-intelligence` |
| **Origin** | Research `docs/research/2026-02-21-registry-governance/` |
| **Series** | NOG-16A → **NOG-16B** → NOG-16C |

---

## Executor Assignment

```yaml
executor: "@dev"
quality_gate: "@qa"
quality_gate_tools: ["jest", "eslint"]
```

---

## Story

### As a
AIOS framework developer

### I want
the entity registry to classify dependencies by type (internal, external-tool, planned) and tag entities with lifecycle states (production, orphan, experimental, deprecated)

### So that
the graph can render entities and edges with semantic meaning, and IDS gates can make smarter decisions about entity health and reuse opportunities.

---

## Context

### Research Basis (Backstage + DataHub + Rush patterns)

After NOG-16A expands scan coverage to ~85% resolution, the remaining ~15% unresolved deps are:
- **External tools** (coderabbit, git, supabase, browser, etc.) — real deps but not filesystem entities
- **Planned/future modules** (code-intel, permissions, etc.) — referenced but not yet implemented
- **Phantom deps** (execute-task.js, task-runner.js) — referenced by many tasks but don't exist

These should be **classified, not filtered**. Filtering loses information; classification preserves semantics.

### Backstage Lifecycle Model

Backstage uses `spec.lifecycle` with 3 states: `experimental`, `production`, `deprecated`. We adapt this + add `orphan` as auto-detected state:

| State | Criteria | Graph Rendering |
|-------|----------|-----------------|
| `production` | usedBy > 0 OR manually set | Normal color, full opacity |
| `experimental` | New entity, usedBy == 0, deps > 0 | Dashed border, 0.8 opacity |
| `deprecated` | Name matches deprecation patterns OR manual | Grey, 0.5 opacity |
| `orphan` | 0 deps AND 0 usedBy | Light grey, 0.3 opacity |

---

## Acceptance Criteria

### AC1: Dependency Classification
- **Given** the scanner has resolved deps against the nameIndex
- **When** a dependency is NOT resolved internally
- **Then** it is classified into one of: `external-tool`, `planned`, or removed (noise already filtered by NOG-16A)
- **Evidence**: Registry entities have `externalDeps` and `plannedDeps` arrays alongside `dependencies`

### AC2: External Tools Registry
- **Given** a predefined `EXTERNAL_TOOLS` set (coderabbit, git, supabase, browser, docker, etc.)
- **When** a dep matches an external tool name
- **Then** it appears in `externalDeps` (not `dependencies`)
- **Evidence**: Agent entities have `externalDeps: [coderabbit, git, browser]` etc.

### AC3: Planned Dependencies Detection
- **Given** a dep doesn't resolve to registry AND doesn't match external tools AND exists as a file reference pattern (kebab-case, ends with -manager/-handler/-loader etc.)
- **When** the scanner classifies deps
- **Then** it appears in `plannedDeps`
- **Evidence**: Entities reference planned modules explicitly

### AC4: Entity Lifecycle Auto-Detection
- **Given** the scanner has built all entities with deps and usedBy
- **When** a post-processing step runs
- **Then** each entity gets a `lifecycle` field auto-assigned based on heuristics:
  - `production`: usedBy.length > 0
  - `orphan`: dependencies.length === 0 AND usedBy.length === 0
  - `deprecated`: name matches patterns (backup-, old-, deprecated)
  - `experimental`: default for entities with deps but no usedBy
- **Evidence**: `lifecycle` field present on all entities

### AC5: Lifecycle Override
- **Given** an entity has auto-detected lifecycle
- **When** the entity's source file contains a `lifecycle:` field in YAML frontmatter or metadata
- **Then** the manual value overrides auto-detection
- **Evidence**: Entity with `lifecycle: production` in source file keeps that value even if orphan heuristic would apply

### AC6: Registry Schema Update
- **Given** the registry YAML output
- **When** new fields are added
- **Then** they are backward-compatible (optional, no breaking changes to existing consumers)
- **Evidence**: Graph dashboard still works with old and new registry format

### AC7: Zero Regression
- **Given** all tests pass before changes
- **When** classification + lifecycle are applied
- **Then** existing `dependencies` and `usedBy` arrays remain correct; new fields are additive only
- **Evidence**: `npm test` passes

---

## Scope

### IN Scope
- `EXTERNAL_TOOLS` set (curated list of known external tools)
- Dependency classification post-processor (internal → dependencies, external → externalDeps, planned → plannedDeps)
- `lifecycle` field with auto-detection heuristics
- Lifecycle override from source file metadata
- `buildNameIndex()` exposed for classification (from NOG-16A)
- Tests for classification and lifecycle
- Registry regeneration with new fields

### OUT of Scope
- Graph UI changes (NOG-16C)
- Entity ID collision resolution / prefixing
- Manual lifecycle curation UI
- Deprecation workflow (auto-removal of deprecated entities)

---

## Dev Notes

### Implementation Approach

**Task 1: EXTERNAL_TOOLS set + classifyDependencies()**

```javascript
const EXTERNAL_TOOLS = new Set([
  'coderabbit', 'git', 'github-cli', 'docker', 'supabase', 'browser',
  'ffmpeg', 'n8n', 'context7', 'playwright', 'apify', 'clickup',
  'jira', 'slack', 'exa', 'eslint', 'jest', 'npm', 'node'
]);

function classifyDependencies(entity, nameIndex) {
  const internal = [];
  const external = [];
  const planned = [];
  for (const dep of entity.dependencies) {
    if (nameIndex.has(dep)) {
      internal.push(dep);
    } else if (EXTERNAL_TOOLS.has(dep.toLowerCase())) {
      external.push(dep);
    } else {
      planned.push(dep);
    }
  }
  entity.dependencies = internal;
  entity.externalDeps = external;
  entity.plannedDeps = planned;
}
```

**Task 2: detectLifecycle()**

```javascript
const DEPRECATED_PATTERNS = [/^old[-_]/, /^backup[-_]/, /deprecated/i, /^legacy[-_]/];

function detectLifecycle(entityId, entity) {
  // Manual override from source
  if (entity._lifecycleOverride) return entity._lifecycleOverride;
  // Heuristics
  for (const pat of DEPRECATED_PATTERNS) {
    if (pat.test(entityId)) return 'deprecated';
  }
  const hasDeps = entity.dependencies.length > 0;
  const hasUsedBy = entity.usedBy.length > 0;
  if (!hasDeps && !hasUsedBy) return 'orphan';
  if (hasUsedBy) return 'production';
  return 'experimental';
}
```

### Updated Registry Schema

```yaml
entities:
  tasks:
    dev-develop-story:
      path: .aios-core/development/tasks/dev-develop-story.md
      type: task
      lifecycle: production          # NEW (auto-detected or overridden)
      purpose: "..."
      keywords: [...]
      dependencies: [...]            # Only resolved-internal deps
      externalDeps: [coderabbit, git]  # NEW
      plannedDeps: [code-intel]        # NEW
      usedBy: [...]
      adaptability:
        score: 0.8
```

### Files to Modify

| File | Action | Notes |
|------|--------|-------|
| `.aios-core/development/scripts/populate-entity-registry.js` | MODIFY | +EXTERNAL_TOOLS, +classifyDependencies(), +detectLifecycle(), +DEPRECATED_PATTERNS, lifecycle override extraction |
| `tests/core/ids/populate-entity-registry.test.js` | MODIFY | +tests for dep classification, lifecycle detection, lifecycle override |
| `.aios-core/data/entity-registry.yaml` | AUTO | Regenerated with classified deps + lifecycle |

---

## Tasks

- [ ] **Task 1**: Add `EXTERNAL_TOOLS` set and `classifyDependencies()` function. Wire into `populate()` after `resolveUsedBy()`. Classify each entity's deps into `dependencies`, `externalDeps`, `plannedDeps`.
- [ ] **Task 2**: Add `DEPRECATED_PATTERNS` and `detectLifecycle()` function with 4-state heuristic. Wire into `populate()` post-processing.
- [ ] **Task 3**: Add lifecycle override extraction — scan source file YAML frontmatter/metadata for `lifecycle:` field during `scanCategory()`.
- [ ] **Task 4**: Add tests — dep classification (5+ cases), lifecycle detection (4+ cases per state), lifecycle override (2 cases), schema backward compat (1 case).
- [ ] **Task 5**: Run full validation, verify new fields in registry, confirm graph dashboard still loads.

---

## CodeRabbit Integration

### Story Type Analysis

**Primary Type**: Enhancement
**Complexity**: Medium

### Quality Gate Tasks

- [ ] Pre-Commit (@dev): Run `coderabbit --prompt-only -t uncommitted` before marking story complete
- [ ] Pre-PR (@devops): Run `coderabbit --prompt-only --base main` before creating pull request

### CodeRabbit Focus Areas

**Primary Focus**:
- Classification must not lose any dependency information (transform, not delete)
- Lifecycle heuristics must not misclassify actively-used entities
- EXTERNAL_TOOLS set must be maintainable (not hardcoded everywhere)

---

## Testing

```bash
npx jest tests/core/ids/populate-entity-registry.test.js
npm run lint
npm test
```

---

## Dev Agent Record

_Populated by @dev during implementation._

### Agent Model Used
_TBD_

### Debug Log References
_TBD_

### Completion Notes
_TBD_

### Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-21 | Research | Story created from registry governance research (Backstage lifecycle + DataHub aspects + Rush phantom detection) |

## QA Results

_Populated by @qa during review._
