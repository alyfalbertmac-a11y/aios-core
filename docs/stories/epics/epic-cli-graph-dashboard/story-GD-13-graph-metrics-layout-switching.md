# Story GD-13: Graph Metrics & Layout Switching — Node Sizing by Degree and Layout Modes

## Metadata

| Field | Value |
|-------|-------|
| **Story ID** | GD-13 |
| **Epic** | CLI Graph Dashboard |
| **Type** | Enhancement |
| **Status** | Draft |
| **Priority** | P1 |
| **Points** | 5 |
| **Agent** | @dev (Dex) |
| **Quality Gate** | @qa (Quinn) |
| **Blocked By** | GD-11 (Physics Control Panel) |
| **Branch** | `feat/epic-nogic-code-intelligence` |
| **Origin** | Tech Search: graph-dashboard-controls (2026-02-22) |

---

## Executor Assignment

```yaml
executor: "@dev"
quality_gate: "@qa"
quality_gate_tools: ["jest", "eslint"]
```

### Agent Routing Rationale

| Agent | Role | Justification |
|-------|------|---------------|
| `@dev` | Implementor | Modifies html-formatter.js — degree computation, layout switching, sizing UI. |
| `@qa` | Quality Gate | Validates degree calculations, layout transitions, test coverage. |

## Story

**As a** developer analyzing the AIOS entity graph,
**I want** to size nodes by their connection count (degree centrality) and switch between layout algorithms (force-directed, hierarchical, circular),
**so that** I can identify the most connected entities and view the dependency structure from different perspectives.

## Context

The graph currently renders all nodes at uniform size with force-directed layout only. Adding node sizing by degree helps identify hub entities (entity-registry, aios-init, etc.). Layout switching enables hierarchical views for dependency analysis and circular for overview.

### Degree Centrality

Degree = number of connections per node. Computed from edges: count edges where `from === nodeId` or `to === nodeId`.

### Available Layouts

| Layout | vis-network Config | Best For |
|--------|-------------------|----------|
| Force-directed | `physics: { solver: 'barnesHut' }` | General exploration |
| Hierarchical | `layout: { hierarchical: { direction: 'UD', sortMethod: 'directed' } }` | Dependency trees |
| Circular | Custom positioning: `Math.cos/sin` | Overview, pattern detection |

[Source: docs/research/2026-02-22-graph-dashboard-controls/02-research-report.md#3.1-3.2]

## Acceptance Criteria

### Node Sizing

1. A "NODE SIZE" section in sidebar with toggle options: Uniform / By Degree / By In-Degree / By Out-Degree
2. "NODE SIZE" header uses section-label pattern (uppercase, gold, letter-spacing)
3. "Uniform" mode: all nodes same size (current behavior, default)
4. "By Degree" mode: node size scales proportionally to total connection count (10px min, 40px max)
5. "By In-Degree" mode: size based on incoming edges only (nodes that depend ON this entity)
6. "By Out-Degree" mode: size based on outgoing edges only (entities this node depends ON)
7. Size computation uses `edges` data to count connections per node, normalized to min/max range
8. When sizing mode changes, nodes update via DataSet batch update

### Layout Switching

9. A "LAYOUT" section in sidebar with 3 toggle buttons: Force / Hierarchical / Circular
10. "LAYOUT" header uses section-label pattern
11. "Force" (default): `physics.solver = 'barnesHut'`, `layout.hierarchical.enabled = false`
12. "Hierarchical": `layout.hierarchical = { enabled: true, direction: 'UD', sortMethod: 'directed', levelSeparation: 150, nodeSpacing: 100 }`
13. "Circular": custom positioning using `Math.cos/sin` with physics disabled
14. Layout switch applies via `network.setOptions()` for force/hierarchical
15. Circular layout manually sets node x/y positions and disables physics
16. Active layout button highlighted with `THEME.border.gold`

### Cross-cutting

17. All CSS from THEME tokens — zero new hardcoded hex values
18. Layout switching preserves filter state and focus mode
19. All existing tests pass, new tests cover sizing computation and layout HTML generation

## Tasks / Subtasks

> **Execution order:** Task 1 → Task 2 → Task 3 → Task 4 → Task 5

- [ ] **Task 1: Degree computation** (AC: 4, 5, 6, 7)
  - [ ] 1.1 Add `computeDegrees(edges)` function: returns `{ nodeId: { total, in, out } }`
  - [ ] 1.2 Count in-degree: edges where `to === nodeId`
  - [ ] 1.3 Count out-degree: edges where `from === nodeId`
  - [ ] 1.4 Total degree = in + out
  - [ ] 1.5 Normalize to size range: `minSize + (degree / maxDegree) * (maxSize - minSize)` where min=10, max=40

- [ ] **Task 2: Node sizing UI** (AC: 1, 2, 3, 8)
  - [ ] 2.1 Add "NODE SIZE" section with section-label header
  - [ ] 2.2 Add 4 radio-style toggle buttons: Uniform / By Degree / By In-Degree / By Out-Degree
  - [ ] 2.3 Default: "Uniform" active
  - [ ] 2.4 On mode change: recompute node sizes and batch update DataSet
  - [ ] 2.5 Gold-line separator below header

- [ ] **Task 3: Layout switching UI** (AC: 9, 10, 16)
  - [ ] 3.1 Add "LAYOUT" section with section-label header
  - [ ] 3.2 Add 3 toggle buttons: Force / Hierarchical / Circular
  - [ ] 3.3 Default: "Force" active with `THEME.border.gold` highlight
  - [ ] 3.4 Gold-line separator below header

- [ ] **Task 4: Layout switching logic** (AC: 11, 12, 13, 14, 15, 18)
  - [ ] 4.1 Force layout: `network.setOptions({ physics: { enabled: true, solver: 'barnesHut' }, layout: { hierarchical: { enabled: false } } })`
  - [ ] 4.2 Hierarchical layout: `network.setOptions({ physics: { enabled: false }, layout: { hierarchical: { enabled: true, direction: 'UD', sortMethod: 'directed', levelSeparation: 150, nodeSpacing: 100, treeSpacing: 200 } } })`
  - [ ] 4.3 Circular layout: compute x/y using `Math.cos/sin`, set positions, disable physics
  - [ ] 4.4 Preserve current filter/focus state across layout changes

- [ ] **Task 5: Update tests** (AC: 19)
  - [ ] 5.1 Test: NODE SIZE section exists with 4 toggle options
  - [ ] 5.2 Test: LAYOUT section exists with 3 toggle buttons (Force/Hierarchical/Circular)
  - [ ] 5.3 Test: computeDegrees function exists in script output
  - [ ] 5.4 Test: layout switch handlers call network.setOptions
  - [ ] 5.5 Test: circular layout uses Math.cos and Math.sin
  - [ ] 5.6 Test: section-label headers present for both sections
  - [ ] 5.7 Run full suite: `npm test` — zero regressions

- [ ] **Task 6: Visual validation**
  - [ ] 6.1 Generate graph and toggle "By Degree" — verify hub nodes are larger
  - [ ] 6.2 Switch to Hierarchical — verify tree layout
  - [ ] 6.3 Switch to Circular — verify ring layout
  - [ ] 6.4 Switch back to Force — verify physics resumes
  - [ ] 6.5 Combine with filters — verify sizing/layout persists with filter changes

## Scope

### IN Scope
- Node sizing by degree centrality (total, in, out)
- Layout switching (force-directed, hierarchical, circular)
- Sidebar UI for both features
- Degree computation from edges data

### OUT of Scope
- Betweenness centrality / PageRank (computationally expensive)
- More than 3 layout algorithms
- Edge thickness by weight
- Saving layout/sizing preferences

## Dependencies

```
GD-11 (Physics Controls) → GD-13 (Metrics & Layout)
                               ↓
                           GD-14 (Export & Minimap)
```

**Hard dependency on GD-11:** Layout switching interacts with physics controls (force layout needs physics on, others need it off). GD-11 establishes the physics on/off toggle.

## Complexity & Estimation

**Complexity:** Medium
**Estimation:** 5-7 hours

## Dev Notes

### Technical References
- Degree centrality: O(E) single pass over edges [Source: research/02-research-report.md#3.1]
- Hierarchical layout: `sortMethod: 'directed'` follows dependency direction [Source: research/02-research-report.md#3.2]
- Circular layout: requires manual x/y positioning and physics disabled [Source: research/02-research-report.md#6.3]

### File Locations
- Primary: `.aios-core/core/graph-dashboard/formatters/html-formatter.js`
- Tests: `tests/graph-dashboard/html-formatter.test.js`

## Testing

```bash
npm test -- --testPathPattern="graph-dashboard"
```

## Dev Agent Record

### Agent Model Used
*(To be filled by @dev)*

### Debug Log References
*(To be filled by @dev)*

### Completion Notes
*(To be filled by @dev)*

## File List

| File | Action | Description |
|------|--------|-------------|
| `.aios-core/core/graph-dashboard/formatters/html-formatter.js` | Modified | Add degree computation, sizing, layout switching |
| `tests/graph-dashboard/html-formatter.test.js` | Modified | Add metrics and layout tests |

## QA Results

*(To be filled by @qa)*

## Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-22 | @sm (River) | Story drafted from tech-search research |
