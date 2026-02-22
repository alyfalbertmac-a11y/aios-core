# Story GD-12: Multi-Level Neighborhood Expansion — Depth-Based Graph Exploration

## Metadata

| Field | Value |
|-------|-------|
| **Story ID** | GD-12 |
| **Epic** | CLI Graph Dashboard |
| **Type** | Enhancement |
| **Status** | Draft |
| **Priority** | P0 |
| **Points** | 5 |
| **Agent** | @dev (Dex) |
| **Quality Gate** | @qa (Quinn) |
| **Blocked By** | ~~GD-10~~ (Done — Tooltip & Interaction Redesign) |
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
| `@dev` | Implementor | Modifies html-formatter.js — BFS algorithm, depth UI, opacity system. |
| `@qa` | Quality Gate | Validates BFS correctness, visual differentiation, test coverage. |

## Story

**As a** developer exploring entity relationships in the AIOS graph dashboard,
**I want** to expand from a selected node to see 1st, 2nd, 3rd, or Nth degree connections with visual depth differentiation,
**so that** I can progressively explore dependency chains without being overwhelmed by the full 712-entity graph.

## Context

Currently, double-click focus mode shows only direct neighbors (1st degree). This story extends focus mode with a depth selector allowing multi-level expansion. Inspired by Neo4j Bloom's expand pattern and Obsidian's depth filter.

### Algorithm: Iterative BFS with Depth Limit

```javascript
function getNeighborsAtDepth(network, nodeId, maxDepth) {
  const visited = new Set([nodeId]);
  const levels = new Map();
  levels.set(nodeId, 0);
  let currentLevel = [nodeId];
  for (let depth = 1; depth <= maxDepth; depth++) {
    const nextLevel = [];
    for (const current of currentLevel) {
      const neighbors = network.getConnectedNodes(current);
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          levels.set(neighbor, depth);
          nextLevel.push(neighbor);
        }
      }
    }
    currentLevel = nextLevel;
  }
  return { visited, levels };
}
```
[Source: docs/research/2026-02-22-graph-dashboard-controls/02-research-report.md#2.2]

### Visual Depth Differentiation

| Depth | Opacity | Border | Size Modifier |
|-------|---------|--------|---------------|
| 0 (selected) | 1.0 | goldStrong | 1.2x |
| 1st degree | 1.0 | gold | 1.0x |
| 2nd degree | 0.7 | subtle | 0.9x |
| 3rd degree | 0.4 | subtle | 0.8x |
| Hidden | 0.1 | none | 0.7x |

[Source: docs/research/2026-02-22-graph-dashboard-controls/02-research-report.md#2.3]

## Acceptance Criteria

### Depth Selector UI

1. When a node is double-clicked (focus mode activated), a depth selector bar appears below the sidebar filter section
2. Depth selector shows toggle buttons: [1] [2] [3] [All] in a horizontal row
3. Default depth is 1 (current behavior — direct neighbors only)
4. Clicking a depth button triggers BFS expansion to that depth level
5. "All" button removes depth filter and shows the entire graph
6. Depth selector shows count: "Nodes: {visible} / {total}" in `THEME.text.tertiary`
7. Depth selector disappears when focus mode is exited (click on empty area)

### BFS Algorithm

8. BFS iteratively expands using `network.getConnectedNodes()` per depth level
9. Each node is annotated with its depth level (0 = selected, 1 = direct neighbor, etc.)
10. BFS correctly handles cycles (visited set prevents infinite loops)
11. Edges are visible only when BOTH connected nodes are visible at the current depth

### Visual Differentiation

12. Selected node (depth 0): opacity 1.0, border `THEME.border.goldStrong`, size 1.2x normal
13. 1st degree nodes: opacity 1.0, border `THEME.border.gold`, normal size
14. 2nd degree nodes: opacity 0.7, border `THEME.border.subtle`, size 0.9x
15. 3rd degree nodes: opacity 0.4, border `THEME.border.subtle`, size 0.8x
16. Non-visible nodes (beyond depth): hidden (`hidden: true` in vis-network DataSet)
17. Depth transitions are smooth (vis-network DataSet batch update for performance)

### Cross-cutting

18. All styling uses existing THEME tokens — no new hardcoded hex values
19. Keyboard shortcuts: pressing 1/2/3/A sets depth level when in focus mode
20. All existing 75+ tests pass, new tests cover BFS algorithm and depth UI generation
21. Performance: BFS on 712 nodes completes in <50ms for depth <= 3

## Tasks / Subtasks

> **Execution order:** Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → Task 6

- [ ] **Task 1: BFS algorithm implementation** (AC: 8, 9, 10, 21)
  - [ ] 1.1 Add `getNeighborsAtDepth(network, nodeId, maxDepth)` function in `<script>` section
  - [ ] 1.2 Returns `{ visited: Set, levels: Map }` — nodeId to depth mapping
  - [ ] 1.3 Handle cycles via `visited` Set
  - [ ] 1.4 Iterative (not recursive) for stack safety on large graphs

- [ ] **Task 2: Depth selector UI generation** (AC: 1, 2, 3, 6, 7)
  - [ ] 2.1 Add depth selector HTML: `<div id="depth-selector">` with 4 toggle buttons [1][2][3][All]
  - [ ] 2.2 Style buttons: `THEME.bg.card` background, `THEME.text.secondary` text, `THEME.border.gold` when active
  - [ ] 2.3 Add node count display: "Nodes: {n} / {total}" in `THEME.text.tertiary`
  - [ ] 2.4 Depth selector hidden by default, shown when focus mode activates
  - [ ] 2.5 Default depth button [1] is active on focus mode entry

- [ ] **Task 3: Depth expansion logic** (AC: 4, 5, 11, 17)
  - [ ] 3.1 On depth button click: call `getNeighborsAtDepth()` with selected depth
  - [ ] 3.2 Batch update all nodes: set `hidden`, `opacity`, `size` based on depth level
  - [ ] 3.3 Update edges: `hidden = !(visited.has(from) && visited.has(to))`
  - [ ] 3.4 "All" button: reset all nodes to visible, remove depth filter
  - [ ] 3.5 Update node count display after each depth change
  - [ ] 3.6 Use `nodes.update([...changes])` batch for performance

- [ ] **Task 4: Visual differentiation system** (AC: 12, 13, 14, 15, 16, 18)
  - [ ] 4.1 Depth 0 (selected): opacity 1.0, border goldStrong, size *= 1.2
  - [ ] 4.2 Depth 1: opacity 1.0, border gold, normal size
  - [ ] 4.3 Depth 2: opacity 0.7, border subtle, size *= 0.9
  - [ ] 4.4 Depth 3: opacity 0.4, border subtle, size *= 0.8
  - [ ] 4.5 Beyond max depth: `hidden: true`
  - [ ] 4.6 All values from THEME tokens — zero hardcoded hex

- [ ] **Task 5: Keyboard shortcuts** (AC: 19)
  - [ ] 5.1 Listen for keydown 1/2/3 when focus mode is active
  - [ ] 5.2 Key "a" or "A" triggers "All" (show entire graph)
  - [ ] 5.3 Update active button state visually on keypress

- [ ] **Task 6: Update tests** (AC: 20)
  - [ ] 6.1 Test: depth selector HTML exists with 4 buttons [1][2][3][All]
  - [ ] 6.2 Test: depth selector has node count display element
  - [ ] 6.3 Test: BFS function exists in script output
  - [ ] 6.4 Test: BFS returns correct structure (visited Set, levels Map concept in JS)
  - [ ] 6.5 Test: depth button click handler calls getNeighborsAtDepth
  - [ ] 6.6 Test: edge visibility logic checks both from and to nodes
  - [ ] 6.7 Test: keyboard shortcut listeners for 1/2/3/A in script output
  - [ ] 6.8 Test: depth selector hidden by default (display: none)
  - [ ] 6.9 Run full suite: `npm test` — zero regressions

- [ ] **Task 7: Visual validation**
  - [ ] 7.1 Generate graph: `node bin/aios-graph.js --deps --format=html`
  - [ ] 7.2 Double-click a node — verify depth selector appears
  - [ ] 7.3 Click [2] — verify 2nd degree neighbors appear at reduced opacity
  - [ ] 7.4 Click [3] — verify 3rd degree expands further
  - [ ] 7.5 Click [All] — verify full graph returns
  - [ ] 7.6 Press Escape or click empty — verify depth selector disappears

## Scope

### IN Scope
- BFS algorithm for multi-level neighborhood expansion
- Depth selector UI (buttons 1/2/3/All)
- Opacity-based visual differentiation by depth
- Edge visibility synced with node visibility
- Node count indicator
- Keyboard shortcuts (1/2/3/A)

### OUT of Scope
- Depth slider (continuous, like Obsidian) — buttons are clearer for discrete levels
- Animated expansion transitions (nodes pop in/out)
- Depth > 3 button (user can use "All" for that)
- Direction-based expansion (in-degree vs out-degree)
- Saving depth state across sessions

## Dependencies

```
GD-10 (Tooltip & Interaction) → GD-12 (Depth Expansion)
GD-11 (Physics Controls)     → independent, same sidebar area
```

**Soft dependency on GD-10:** Uses existing focus mode (double-click) as entry point.

## Complexity & Estimation

**Complexity:** Medium-High
**Estimation:** 5-7 hours
**Dependencies:** GD-10 (Done) — focus mode and THEME tokens must exist

## Dev Notes

### Technical References
- BFS algorithm: iterative with depth limit, O(V+E) per expansion [Source: research/02-research-report.md#2.2]
- Neo4j Bloom expand pattern: click to expand 1st degree, click again for 2nd [Source: research/02-research-report.md#2.4]
- vis-network DataSet batch update: `nodes.update([...changes])` for performance [Source: research/02-research-report.md#5.2]
- `network.getConnectedNodes(nodeId)` returns array of neighbor IDs [Source: vis-network API]

### Implementation Notes
- Existing focus mode (double-click handler) is in the `<script>` section of html-formatter output
- Extend the existing `network.on('doubleClick')` handler to initialize depth selector
- Use DataSet `update()` not `remove()/add()` — preserves node positions
- Opacity in vis-network: use `color.opacity` or inline style rgba with alpha

### File Locations
- Primary: `.aios-core/core/graph-dashboard/formatters/html-formatter.js`
- Tests: `tests/graph-dashboard/html-formatter.test.js`

## Testing

```bash
npm test -- --testPathPattern="graph-dashboard"
```

Expected: All existing 75+ tests pass + ~9 new tests for depth expansion

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
| `.aios-core/core/graph-dashboard/formatters/html-formatter.js` | Modified | Add BFS, depth selector, visual differentiation |
| `tests/graph-dashboard/html-formatter.test.js` | Modified | Add depth expansion tests |

## QA Results

*(To be filled by @qa)*

## Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-22 | @sm (River) | Story drafted from tech-search research |
