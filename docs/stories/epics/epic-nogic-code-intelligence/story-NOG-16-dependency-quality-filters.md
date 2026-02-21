# Story NOG-16A: Scan Config Expansion + Sentinel Filter

## Metadata

| Field | Value |
|-------|-------|
| **Story ID** | NOG-16A |
| **Epic** | NOGIC — Code Intelligence Integration |
| **Type** | Enhancement |
| **Status** | Draft |
| **Priority** | P0 (highest impact) |
| **Points** | 3 |
| **Agent** | @dev (Dex) |
| **Quality Gate** | @qa (Quinn) |
| **Blocked By** | None (standalone — improves NOG-15 output quality) |
| **Branch** | `feat/epic-nogic-code-intelligence` |
| **Origin** | QA Review NOG-15 + Research `docs/research/2026-02-21-registry-governance/` |
| **Series** | NOG-16A → NOG-16B → NOG-16C |

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
the entity registry scanner to cover ALL framework directories and filter out sentinel/noise values

### So that
the registry achieves 85%+ dependency resolution rate (from current 52%), enabling accurate graph visualization and reliable IDS gates.

---

## Context

### Research Findings (docs/research/2026-02-21-registry-governance/)

Deep analysis of the 750 unresolved deps revealed the **root cause is NOT noise** — it's missing scan directories:

| Cause | % of 750 unresolved | Solution |
|-------|---------------------|----------|
| **Infra scripts not scanned** (87 files in `infrastructure/scripts/`) | 46% | Add to SCAN_CONFIG |
| **Product checklists not scanned** (16 files in `product/checklists/`) | 7% | Add to SCAN_CONFIG |
| Sentinel values (`N/A`) | 15% | isSentinel() filter |
| Planned/future modules | 13% | Tagged in NOG-16B |
| Noise (NL text, comments) | 7% | isNoise() filter |
| External tools (coderabbit, git) | 4% | Tagged in NOG-16B |

### Known Risk: Entity ID Collision

Adding `infrastructure/scripts/` will cause ID collisions with `development/scripts/` (e.g., `backup-manager` exists in both). The scanner already has duplicate detection (`seenIds` Set) — duplicates are logged and skipped. This is acceptable for now; NOG-16B may address prefixing.

### Current Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Entities | 563 | ~666 |
| Total deps | 1570 | ~1570 |
| Resolved deps | 820 (52%) | ~1300 (~85%) |
| Unresolved deps | 750 (48%) | ~270 (~15%) |

---

## Acceptance Criteria

### AC1: Scan Config Expansion
- **Given** the scanner has 10 SCAN_CONFIG entries
- **When** the scanner runs
- **Then** it also scans `infrastructure/scripts/`, `infrastructure/tools/`, `product/checklists/`, and `product/data/`
- **Evidence**: Entity count increases from 563 to 640+ (exact depends on dedup)

### AC2: Sentinel Value Filter
- **Given** the scanner processes dependency lists from markdown files
- **When** a dependency value matches a sentinel pattern (`N/A`, `na`, `none`, `TBD`, `TODO`, `-`, empty string)
- **Then** it is excluded from the entity's `dependencies` array
- **Evidence**: 0 entities with `N/A` as dependency after scan

### AC3: Noise Filter
- **Given** the scanner extracts dependencies from markdown
- **When** a captured dependency contains spaces (natural language) or matches known noise patterns
- **Then** it is excluded from the entity's `dependencies` array
- **Evidence**: 0 deps like "Docker MCP Toolkit" or "filesystem access" in registry

### AC4: Verbose Logging
- **Given** the scanner filters sentinel/noise deps
- **When** `--verbose` flag or `AIOS_DEBUG=true` is set
- **Then** filtered deps are logged with source entity (e.g., `[IDS] Filtered sentinel "N/A" from "advanced-elicitation"`)
- **Evidence**: Console output shows filtered deps when verbose

### AC5: Resolution Rate Improvement
- **Given** the current registry has 52% resolution rate
- **When** scan config expansion + filters are applied
- **Then** resolution rate reaches 80%+ (measured by scanner metrics output)
- **Evidence**: Scanner logs `[IDS] Resolution rate: XX%`

### AC6: Zero Regression
- **Given** all 32 existing tests pass before changes
- **When** changes are applied
- **Then** all existing tests still pass, and real dependency relationships are preserved
- **Evidence**: `npm test` passes, dev agent still has 41+ deps

### AC7: Duplicate Entity Handling
- **Given** `infrastructure/scripts/` and `development/scripts/` may contain files with the same basename
- **When** the scanner encounters a duplicate entity ID
- **Then** it logs a warning and skips the duplicate (existing behavior preserved)
- **Evidence**: `[IDS] Duplicate entity ID "X"` warnings logged, no crashes

---

## Scope

### IN Scope
- 4 new SCAN_CONFIG entries (infra-scripts, infra-tools, product-checklists, product-data)
- ADAPTABILITY_DEFAULTS for new types
- Category descriptions for new categories
- SENTINEL_VALUES set + isSentinel() function
- Noise filter (deps with spaces, known NL patterns)
- Apply filters in detectDependencies(), extractMarkdownCrossReferences(), extractYamlDependencies()
- Verbose logging with --verbose / AIOS_DEBUG support
- Resolution rate metric in scanner output
- Tests for all new functionality
- Registry regeneration

### OUT of Scope
- Dependency classification taxonomy (NOG-16B)
- Entity lifecycle states (NOG-16B)
- Graph filtering UI (NOG-16C)
- Entity ID prefixing to resolve collisions (future)
- Modifying task files to remove N/A entries (data migration)

---

## Dev Notes

### Implementation Approach

**Task 1: SCAN_CONFIG Expansion**

```javascript
// Add to SCAN_CONFIG array:
{ category: 'infra-scripts', basePath: '.aios-core/infrastructure/scripts', glob: '**/*.js', type: 'script' },
{ category: 'infra-tools', basePath: '.aios-core/infrastructure/tools', glob: '**/*.{yaml,yml,md}', type: 'tool' },
{ category: 'product-checklists', basePath: '.aios-core/product/checklists', glob: '**/*.md', type: 'checklist' },
{ category: 'product-data', basePath: '.aios-core/product/data', glob: '**/*.{yaml,yml,md}', type: 'data' },
```

**Task 2: Sentinel + Noise Filter**

```javascript
const SENTINEL_VALUES = new Set(['n/a', 'na', 'none', 'tbd', 'todo', '-', '']);

function isSentinel(value) {
  return SENTINEL_VALUES.has(value.toLowerCase().trim());
}

function isNoise(value) {
  // Natural language fragments (contains spaces and > 3 words)
  if (value.includes(' ') && value.split(/\s+/).length > 2) return true;
  // Template placeholders
  if (value.includes('{{') || value.includes('${')) return true;
  // Very short fragments (1-2 chars, not agent refs)
  if (value.length <= 2) return true;
  return false;
}
```

**Task 3: Resolution Rate Metric**

```javascript
// In populate(), after resolveUsedBy():
const { total, resolved, unresolved } = countResolution(allEntities, nameIndex);
const rate = Math.round(resolved / total * 100);
console.log(`[IDS] Resolution rate: ${rate}% (${resolved}/${total} deps resolved, ${unresolved} unresolved)`);
```

### Files to Modify

| File | Action | Notes |
|------|--------|-------|
| `.aios-core/development/scripts/populate-entity-registry.js` | MODIFY | +4 SCAN_CONFIG, +SENTINEL_VALUES, +isSentinel(), +isNoise(), filter integration, verbose support, resolution metric |
| `tests/core/ids/populate-entity-registry.test.js` | MODIFY | +tests for new SCAN_CONFIG, sentinel filter, noise filter, resolution metric |
| `.aios-core/data/entity-registry.yaml` | AUTO | Regenerated with expanded scan + clean deps |

---

## Tasks

- [ ] **Task 1**: Add 4 new SCAN_CONFIG entries (infra-scripts, infra-tools, product-checklists, product-data) + ADAPTABILITY_DEFAULTS + category descriptions. Verify dirs exist and handle missing gracefully.
- [ ] **Task 2**: Add `SENTINEL_VALUES` set, `isSentinel()`, and `isNoise()` functions. Apply in `detectDependencies()`, `extractMarkdownCrossReferences()`, and `extractYamlDependencies()` before adding to deps Set.
- [ ] **Task 3**: Extract `buildNameIndex()` from `resolveUsedBy()` as reusable function. Add resolution rate metric to `populate()` output.
- [ ] **Task 4**: Add `--verbose` / `AIOS_DEBUG` support for filtered dep logging. Log sentinel, noise, and unresolved filters separately.
- [ ] **Task 5**: Add tests — SCAN_CONFIG (14 categories), sentinel filter (6+ cases including edge cases), noise filter (4+ cases), resolution metric (1 case), regression (verify real deps preserved).
- [ ] **Task 6**: Run full validation (`npm test`, `npm run lint`, scanner execution), verify metrics improvement, regenerate graph.

---

## CodeRabbit Integration

### Story Type Analysis

**Primary Type**: Enhancement
**Complexity**: Medium

### Quality Gate Tasks

- [ ] Pre-Commit (@dev): Run `coderabbit --prompt-only -t uncommitted` before marking story complete
- [ ] Pre-PR (@devops): Run `coderabbit --prompt-only --base main` before creating pull request

### Self-Healing Configuration

**Expected Self-Healing**:
- Primary Agent: @dev (light mode)
- Max Iterations: 2
- Timeout: 15 minutes
- Severity Filter: CRITICAL, HIGH

### CodeRabbit Focus Areas

**Primary Focus**:
- SCAN_CONFIG: new entries must not break existing categories
- Sentinel filter: must NOT filter real entity names (e.g., entity named "todo-list" is valid)
- Noise filter: must NOT filter short valid entity names
- Duplicate handling: must log but not crash

**Secondary Focus**:
- Performance: 14 categories should still scan in <5s
- Verbose logging format consistent with existing `[IDS]` prefix

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
| 1.0 | 2026-02-21 | @qa (Quinn) | Story created from NOG-15 QA review concerns 1 & 2 |
| 2.0 | 2026-02-21 | Research | Expanded scope based on registry governance research. Renamed NOG-16 → NOG-16A. Added scan config expansion as P0 priority. Split into 3-story series (NOG-16A/B/C) |

## QA Results

_Populated by @qa during review._
