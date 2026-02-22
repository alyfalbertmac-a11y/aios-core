# Story GD-14: Export & Minimap — Graph Capture and Navigation Overview

## Metadata

| Field | Value |
|-------|-------|
| **Story ID** | GD-14 |
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
| `@dev` | Implementor | Modifies html-formatter.js — canvas export, minimap rendering, viewport sync. |
| `@qa` | Quality Gate | Validates export output, minimap interaction, test coverage. |

## Story

**As a** developer using the AIOS graph dashboard,
**I want** to export the graph as PNG or JSON and have a minimap for navigation,
**so that** I can share graph snapshots in documentation/PRs and navigate large graphs efficiently.

## Context

With 712 entities, navigating the full graph requires zooming and panning. A minimap provides overview context. Export enables capturing graph state for documentation, reports, and issue tracking.

### Export Methods

| Format | Method | Use Case |
|--------|--------|----------|
| PNG | `network.canvas.canvas.toDataURL('image/png')` | Screenshots, docs |
| JSON | `JSON.stringify({ nodes: [...], edges: [...] })` | Data backup, sharing |

### Minimap Approaches

Canvas thumbnail approach: render graph to a small offscreen canvas, overlay viewport rectangle, click to pan.

[Source: docs/research/2026-02-22-graph-dashboard-controls/02-research-report.md#3.3-3.4]

## Acceptance Criteria

### Export

1. An "EXPORT" section in sidebar with 2 buttons: "PNG" and "JSON"
2. "EXPORT" header uses section-label pattern (uppercase, gold, letter-spacing)
3. PNG export: triggers browser download of current graph view as `.png` file
4. PNG export captures the current canvas state including all visible nodes, edges, and current zoom/pan
5. JSON export: triggers browser download of `{ nodes: [...], edges: [...], metadata: { total, timestamp } }` as `.json` file
6. JSON export includes all node properties (id, label, category, lifecycle, path) and edge properties (from, to)
7. Download filenames include timestamp: `aios-graph-{YYYY-MM-DD-HHmm}.png` / `.json`

### Minimap

8. A minimap panel (200x150px) appears in the bottom-right corner of the graph area
9. Minimap renders a scaled-down view of the entire graph (all nodes as small dots, edges as thin lines)
10. A semi-transparent rectangle on the minimap shows the current viewport area
11. Clicking on the minimap pans the main graph to center on that location
12. Minimap updates when graph changes (zoom, pan, filter, layout switch)
13. Minimap can be toggled on/off via a small button (eye icon or "Map" label)
14. Minimap uses `THEME.bg.card` background with `THEME.border.subtle` border

### Cross-cutting

15. All CSS from THEME tokens — zero new hardcoded hex values
16. Export buttons have ARIA labels for accessibility
17. All existing tests pass, new tests cover export buttons and minimap HTML generation

## Tasks / Subtasks

> **Execution order:** Task 1 → Task 2 → Task 3 → Task 4 → Task 5

- [ ] **Task 1: Export UI and PNG export** (AC: 1, 2, 3, 4, 7)
  - [ ] 1.1 Add "EXPORT" section with section-label header in sidebar
  - [ ] 1.2 Add "PNG" button styled with `THEME.bg.card`, `THEME.border.subtle`
  - [ ] 1.3 PNG click handler: get canvas via `network.canvas.canvas.toDataURL('image/png')`
  - [ ] 1.4 Create download link with timestamp filename: `aios-graph-{date}.png`
  - [ ] 1.5 Trigger download via temporary `<a>` element click

- [ ] **Task 2: JSON export** (AC: 5, 6, 7)
  - [ ] 2.1 Add "JSON" button next to PNG button
  - [ ] 2.2 JSON click handler: serialize nodes and edges data
  - [ ] 2.3 Include metadata: `{ total: nodes.length, timestamp: new Date().toISOString() }`
  - [ ] 2.4 Create Blob and trigger download with timestamp filename

- [ ] **Task 3: Minimap HTML/CSS** (AC: 8, 9, 13, 14)
  - [ ] 3.1 Add minimap container div: 200x150px, fixed position bottom-right
  - [ ] 3.2 Style with `THEME.bg.card` background, `THEME.border.subtle` border, `border-radius: THEME.radius.md`
  - [ ] 3.3 Add `<canvas id="minimap-canvas">` inside container
  - [ ] 3.4 Add toggle button to show/hide minimap
  - [ ] 3.5 Minimap visible by default

- [ ] **Task 4: Minimap rendering and interaction** (AC: 10, 11, 12)
  - [ ] 4.1 Render minimap: draw all nodes as 2px dots at scaled positions
  - [ ] 4.2 Draw edges as 0.5px lines between scaled node positions
  - [ ] 4.3 Draw viewport rectangle (semi-transparent gold overlay) representing current view
  - [ ] 4.4 Update minimap on zoom/pan events: `network.on('zoom')`, `network.on('dragEnd')`
  - [ ] 4.5 Click handler on minimap: calculate graph coordinates from click position, call `network.moveTo()`
  - [ ] 4.6 Update minimap on filter/layout changes

- [ ] **Task 5: Update tests** (AC: 15, 16, 17)
  - [ ] 5.1 Test: EXPORT section exists with PNG and JSON buttons
  - [ ] 5.2 Test: export buttons have ARIA labels
  - [ ] 5.3 Test: PNG export handler uses `toDataURL` in script
  - [ ] 5.4 Test: JSON export handler serializes nodes/edges in script
  - [ ] 5.5 Test: minimap container exists with canvas element
  - [ ] 5.6 Test: minimap has toggle button
  - [ ] 5.7 Test: minimap uses THEME tokens for styling
  - [ ] 5.8 Run full suite: `npm test` — zero regressions

- [ ] **Task 6: Visual validation**
  - [ ] 6.1 Click PNG export — verify PNG downloads with correct content
  - [ ] 6.2 Click JSON export — verify JSON has nodes/edges/metadata
  - [ ] 6.3 Verify minimap shows scaled graph overview
  - [ ] 6.4 Pan/zoom main graph — verify minimap viewport rectangle updates
  - [ ] 6.5 Click on minimap — verify main graph pans to that location
  - [ ] 6.6 Toggle minimap off/on — verify it hides/shows

## Scope

### IN Scope
- PNG export via canvas toDataURL
- JSON export with full node/edge data
- Minimap overview panel with viewport rectangle
- Click-to-pan on minimap
- Minimap toggle

### OUT of Scope
- SVG export (complex, would need custom renderer)
- Print-optimized export
- Minimap drag viewport (click only)
- Export with filters/annotations embedded
- Sharing/upload integration

## Dependencies

```
GD-13 (Metrics & Layout) → GD-14 (Export & Minimap)
                               ↓
                           GD-15 (Clustering & Statistics)
```

**Soft dependency on GD-13:** Minimap needs to work with all layout modes. Layout mode info helps export metadata.

## Complexity & Estimation

**Complexity:** Medium-High
**Estimation:** 6-8 hours

## Dev Notes

### Technical References
- Canvas export: `network.canvas.canvas.toDataURL()` [Source: research/02-research-report.md#3.4]
- Minimap pattern: second canvas with scaled rendering [Source: research/02-research-report.md#3.3]
- `network.getViewPosition()` and `network.getScale()` for viewport tracking
- `network.moveTo({ position: { x, y }, animation: true })` for pan-on-click

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
| `.aios-core/core/graph-dashboard/formatters/html-formatter.js` | Modified | Add export buttons, minimap |
| `tests/graph-dashboard/html-formatter.test.js` | Modified | Add export and minimap tests |

## QA Results

*(To be filled by @qa)*

## Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-22 | @sm (River) | Story drafted from tech-search research |
