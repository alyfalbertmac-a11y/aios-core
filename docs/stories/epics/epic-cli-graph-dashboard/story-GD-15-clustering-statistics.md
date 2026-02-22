# Story GD-15: Clustering & Statistics — Category Grouping and Graph Metrics Panel

## Metadata

| Field | Value |
|-------|-------|
| **Story ID** | GD-15 |
| **Epic** | CLI Graph Dashboard |
| **Type** | Enhancement |
| **Status** | Draft |
| **Priority** | P2 |
| **Points** | 5 |
| **Agent** | @dev (Dex) |
| **Quality Gate** | @qa (Quinn) |
| **Blocked By** | GD-13 (Graph Metrics & Layout Switching) |
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
| `@dev` | Implementor | Modifies html-formatter.js — clustering API, statistics computation, metrics panel. |
| `@qa` | Quality Gate | Validates clustering behavior, metric accuracy, test coverage. |

## Story

**As a** developer analyzing the AIOS entity graph,
**I want** to cluster nodes by category (collapsible groups) and see a statistics panel with graph metrics,
**so that** I can reduce visual complexity of the 712-entity graph and understand its structural properties.

## Context

vis-network has a built-in clustering API that groups nodes by condition. Combined with a statistics panel showing key metrics (node/edge count, density, top connected nodes), this provides analytical insight into the entity registry structure.

### vis-network Clustering API

```javascript
network.cluster({
  joinCondition: (nodeOptions) => nodeOptions.category === 'agent',
  clusterNodeProperties: {
    label: 'agent (12)',
    shape: 'dot',
    size: 25,
    color: categoryColor
  }
});
```

### Graph Metrics

| Metric | Formula | What It Shows |
|--------|---------|---------------|
| Node count | `nodes.length` | Total entities |
| Edge count | `edges.length` | Total relationships |
| Density | `2 * E / (V * (V-1))` | How interconnected the graph is |
| Avg degree | `2 * E / V` | Average connections per node |
| Top 5 nodes | Sort by degree descending | Most connected entities |

[Source: docs/research/2026-02-22-graph-dashboard-controls/02-research-report.md#3.5]

## Acceptance Criteria

### Category Clustering

1. A "CLUSTERING" section in sidebar with a "Cluster by Category" toggle button
2. "CLUSTERING" header uses section-label pattern (uppercase, gold, letter-spacing)
3. When "Cluster by Category" is activated, nodes group into category clusters (agent, task, template, etc.)
4. Each cluster node shows: category name + node count as label (e.g., "agent (12)")
5. Cluster nodes use the category color from existing THEME color mapping
6. Cluster nodes are sized proportionally to the number of contained nodes (min 20px, max 50px)
7. Double-clicking a cluster expands it to show individual nodes
8. Clicking "Cluster by Category" again re-clusters all expanded groups
9. Clustering preserves existing filter state (filtered-out nodes remain filtered)

### Statistics Panel

10. A "STATISTICS" section in sidebar below clustering section
11. "STATISTICS" header uses section-label pattern
12. Statistics panel shows: Total Nodes, Total Edges, Graph Density (2 decimals), Average Degree (1 decimal)
13. Statistics panel shows "Top 5 Connected" list: entity name + degree count, sorted descending
14. Statistics update dynamically when filters change (recalculate for visible nodes only)
15. Each metric row uses `THEME.text.secondary` for label, `THEME.text.primary` for value

### Cross-cutting

16. All CSS from THEME tokens — zero new hardcoded hex values
17. All existing tests pass, new tests cover clustering toggle and statistics HTML generation

## Tasks / Subtasks

> **Execution order:** Task 1 → Task 2 → Task 3 → Task 4 → Task 5

- [ ] **Task 1: Category clustering** (AC: 1, 2, 3, 4, 5, 6, 7, 8, 9)
  - [ ] 1.1 Add "CLUSTERING" section with section-label header
  - [ ] 1.2 Add "Cluster by Category" toggle button
  - [ ] 1.3 Implement cluster function: iterate categories, call `network.cluster()` for each
  - [ ] 1.4 Set cluster node properties: label with count, category color, proportional size
  - [ ] 1.5 Double-click handler on cluster: call `network.openCluster(clusterNodeId)`
  - [ ] 1.6 Re-cluster function: close all and re-cluster
  - [ ] 1.7 Preserve filter state during clustering (skip filtered nodes in joinCondition)

- [ ] **Task 2: Statistics computation** (AC: 12, 13, 14)
  - [ ] 2.1 Add `computeGraphStats(nodes, edges)` function
  - [ ] 2.2 Compute: nodeCount, edgeCount, density, avgDegree
  - [ ] 2.3 Compute top 5 connected nodes sorted by degree descending
  - [ ] 2.4 Recalculate on filter change events

- [ ] **Task 3: Statistics panel UI** (AC: 10, 11, 15)
  - [ ] 3.1 Add "STATISTICS" section with section-label header
  - [ ] 3.2 Display 4 metric rows: label (`THEME.text.secondary`) + value (`THEME.text.primary`)
  - [ ] 3.3 Display "Top 5 Connected" list with name + degree count
  - [ ] 3.4 Gold-line separator between metrics and top-5 list

- [ ] **Task 4: Update tests** (AC: 17)
  - [ ] 4.1 Test: CLUSTERING section exists with toggle button
  - [ ] 4.2 Test: cluster function uses `network.cluster()` in script
  - [ ] 4.3 Test: cluster handler calls `openCluster` on double-click
  - [ ] 4.4 Test: STATISTICS section exists with 4 metric elements
  - [ ] 4.5 Test: computeGraphStats function exists in script
  - [ ] 4.6 Test: top-5 connected list element exists
  - [ ] 4.7 Test: statistics uses THEME tokens for styling
  - [ ] 4.8 Run full suite: `npm test` — zero regressions

- [ ] **Task 5: Visual validation**
  - [ ] 5.1 Generate graph and click "Cluster by Category" — verify nodes collapse into category groups
  - [ ] 5.2 Double-click a cluster — verify it expands to show individual nodes
  - [ ] 5.3 Verify statistics panel shows correct node/edge counts
  - [ ] 5.4 Apply a filter — verify statistics update for filtered subset
  - [ ] 5.5 Check top-5 list — verify most connected entities are correct

## Scope

### IN Scope
- Category-based clustering using vis-network cluster API
- Cluster expand/collapse via double-click
- Statistics panel: node count, edge count, density, avg degree, top 5 connected
- Dynamic statistics update on filter change

### OUT of Scope
- Community detection algorithms (Louvain, modularity)
- Clustering by other attributes (lifecycle, path prefix)
- Graph comparison (before/after clustering)
- Exporting statistics
- Category distribution chart/visualization

## Dependencies

```
GD-13 (Metrics & Layout) → GD-15 (Clustering & Statistics)
GD-14 (Export & Minimap) → independent, parallel track
```

**Soft dependency on GD-13:** Degree computation from GD-13 reused for statistics and top-5 list.

## Complexity & Estimation

**Complexity:** Medium
**Estimation:** 5-7 hours

## Dev Notes

### Technical References
- vis-network clustering: `network.cluster({ joinCondition, clusterNodeProperties })` [Source: research/02-research-report.md#3.5]
- `network.openCluster(clusterNodeId)` to expand [Source: vis-network API]
- Graph density: `2 * E / (V * (V - 1))` for undirected graph [Source: graph theory]
- Reuse degree computation from GD-13 if already implemented

### Implementation Notes
- Clustering modifies the network in-place — original nodes hidden inside clusters
- `network.isCluster(nodeId)` checks if a node is a cluster
- `network.getNodesInCluster(clusterNodeId)` returns contained node IDs
- Statistics should update when clustering is toggled (clustered view vs expanded view)

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
| `.aios-core/core/graph-dashboard/formatters/html-formatter.js` | Modified | Add clustering, statistics panel |
| `tests/graph-dashboard/html-formatter.test.js` | Modified | Add clustering and statistics tests |

## QA Results

*(To be filled by @qa)*

## Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-22 | @sm (River) | Story drafted from tech-search research |
