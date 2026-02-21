# Story NOG-10: Phase 0A — Safe Quick Wins (UAP & SYNAPSE Wiring Fixes)

## Metadata

| Field | Value |
|-------|-------|
| **Story ID** | NOG-10 |
| **Epic** | NOGIC — Code Intelligence Integration |
| **Type** | Bug Fix / Performance |
| **Status** | Draft |
| **Priority** | P0 |
| **Points** | 3 |
| **Agent** | @dev (Dex) |
| **Quality Gate** | @qa (Quinn) |
| **Blocked By** | NOG-9 (Done) |
| **Branch** | `feat/epic-nogic-code-intelligence` |

---

## Story

As a **framework developer**, I want critical wiring bugs fixed in the UAP and SYNAPSE pipelines, so that the bracket system actually works, git detection is fast, and token estimation is accurate — resolving the "Infrastructure Exists, Wiring Falta" pattern discovered in NOG-9.

---

## Problem Statement

NOG-9 research discovered 3 critical wiring bugs and 1 performance bottleneck:

1. **QW-1:** `updateSession()` never called — brackets always FRESH (feature dead)
2. **QW-3:** `chars/4` underestimates 15-25% on XML output
3. **QW-5:** 52ms from 3x `execSync('git ...')` when `.git/HEAD` read = 0.06ms

These are not new features — they are **fixes to existing infrastructure that was never connected**.

### Evidence

| Fix | Research Source | File Reference |
|-----|---------------|----------------|
| QW-1 | C4-session-state.md | `.claude/hooks/synapse-engine.cjs:47-52` |
| QW-3 | C6-token-budget.md | `.aios-core/core/synapse/context/context-tracker.js:103` |
| QW-5 | A4-git-detection.md | `.aios-core/infrastructure/scripts/git-config-detector.js:136` |

---

## Acceptance Criteria

### AC1: updateSession() Wiring (QW-1)
- [ ] `updateSession()` is called after each SYNAPSE hook execution with `{ context: { last_bracket } }` update
- [ ] After 3+ prompts in a session, bracket is no longer always FRESH
- [ ] **Benchmark:** session file shows `prompt_count` incrementing and `last_bracket` transitioning
- [ ] **Test:** `tests/synapse/engine.test.js` — new test verifying bracket transitions after N prompts
- [ ] **Rollback:** Single commit, revertible with `git revert`
- [ ] **Observability:** `.synapse/sessions/{uuid}.json` → `context.last_bracket` field reflects real state

### AC2: Token Estimation Safety Multiplier (QW-3)
- [ ] `estimateContextPercent()` applies 1.2x safety multiplier for SYNAPSE XML output
- [ ] Token estimation accuracy improves from ~70-80% to ~85-90%
- [ ] **Benchmark:** Before/after comparison with real SYNAPSE output (chars vs estimated tokens)
- [ ] **Test:** `tests/synapse/context-tracker.test.js` — new test with XML input validating multiplier
- [ ] **Rollback:** Single constant change, trivially revertible
- [ ] **Observability:** Bracket transitions happen earlier (FRESH→MODERATE sooner)

### AC3: Direct .git/HEAD Read with Fallback Chain (QW-5)
- [ ] Git branch detection uses direct file read as primary method
- [ ] Fallback chain: `.git/HEAD` read → worktree/gitfile resolution → `execSync` fallback
- [ ] Git detection time drops from 52ms to <2ms for normal branches
- [ ] **Mandatory Tests (Guardrail #1):**
  - [ ] Test: normal branch (`ref: refs/heads/feat/my-branch`)
  - [ ] Test: detached HEAD (raw commit hash)
  - [ ] Test: worktree/gitfile (`.git` is a file with `gitdir:` pointer)
  - [ ] Test: no `.git` directory (graceful null return)
- [ ] **Benchmark:** `uap-metrics.json` → `gitConfig.duration` before/after
- [ ] **Rollback:** Fallback chain means `execSync` still works if file read fails
- [ ] **Observability:** `uap-metrics.json` → `gitConfig.duration` < 5ms

---

## Scope

### IN Scope
- Fix updateSession() wiring in hook pipeline
- Apply 1.2x safety multiplier to token estimation
- Replace execSync git calls with direct .git/HEAD read + fallback chain
- Tests for all 3 fixes including edge cases

### OUT of Scope
- Real token counting from API (separate story NOG-11)
- Output format changes (separate story)
- Any changes to SYNAPSE pipeline architecture

---

## Tasks/Subtasks

- [ ] 1. QW-1: Add `updateSession()` call in hook pipeline after `engine.process()`
  - [ ] 1.1 Identify correct insertion point in `synapse-engine.cjs` or `hook-runtime.js`
  - [ ] 1.2 Call `updateSession(sessionId, sessionsDir, { context: { last_bracket: result.bracket } })`
  - [ ] 1.3 Write test: bracket transitions after 1, 5, 20, 50 prompts
- [ ] 2. QW-3: Apply 1.2x safety multiplier in `estimateContextPercent()`
  - [ ] 2.1 Modify formula in `context-tracker.js` to use `chars / 4 * 1.2` for XML content
  - [ ] 2.2 Write test with real SYNAPSE XML output comparing old vs new estimate
- [ ] 3. QW-5: Replace git execSync with direct file read + fallback chain
  - [ ] 3.1 Implement `_detectBranchDirect()` in `git-config-detector.js`
  - [ ] 3.2 Handle normal branch (ref: refs/heads/...)
  - [ ] 3.3 Handle detached HEAD (raw hash → return short hash + "(detached)")
  - [ ] 3.4 Handle worktree/gitfile (.git is file → resolve gitdir → read HEAD)
  - [ ] 3.5 Fallback to execSync on any error
  - [ ] 3.6 Write 4 mandatory tests (normal, detached, worktree, no-git)
  - [ ] 3.7 Verify with `uap-metrics.json` that duration < 5ms
- [ ] 4. Run full test suite (`npm test`) — zero regressions
- [ ] 5. Update story checkboxes and file list

---

## Testing

### Regression Tests
```bash
npm test                    # Full suite — zero failures
npm run lint                # No new lint issues
npm run typecheck           # No type errors (if applicable)
```

### Specific Tests
- `tests/synapse/engine.test.js` — bracket transition tests
- `tests/synapse/context-tracker.test.js` — token estimation with XML
- `tests/infrastructure/git-config-detector.test.js` — 4 branch detection scenarios

---

## CodeRabbit Integration

Standard self-healing (dev phase): max 2 iterations, CRITICAL/HIGH auto-fix.

---

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2026-02-21 | @sm (River) | Story created — Draft |
