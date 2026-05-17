# YAMTAM ENGINE — Changelog

All notable changes to YAMTAM ENGINE release packs are documented here.

> **Note:** This changelog tracks **release pack** events. This scaffold repo
> does not enforce any release item at runtime until the pack's `hooks/`,
> `scripts/`, and `tests/` are imported into `core/`.

---

## v1.3.0 — Truth Gate Runtime, Scope Guard, L1 Memory, Drift Detector
*2026-05-17*

### New Hooks
- `truth-gate-guard.sh` (Stop): scans last assistant message for claim verbs
  (done/fixed/deployed…); warns when no evidence patterns or fallback qualifiers
  present. Non-blocking. Bypass: `YAMTAM_TRUTH_GATE_BYPASS=1`.
- `scope-guard.sh` (PreToolUse): warns when Write/Edit targets product dirs
  (`app/ components/ lib/ db/ migrations/ .env* vercel.json`…).
  Advisory only. Bypass: `YAMTAM_SCOPE_OK=1`.

### New Commands
- `/verify` — full health check: git state + hook syntax + test suite + drift report.
  Shows actual command output (Truth Gate compliant).
- `/memory [keyword]` — search and list L1 Atomic Memory facts by keyword,
  type, scope, or confidence.

### New Scripts
- `drift-check.sh` — detects task drift (done with no recent commit), README
  overclaims (feature with no grep hit), and stale L1 facts (expired).
  Exit 0 clean / 1 dirty. Integrated into `/verify`.
- `search-facts.sh` — grep-based L1 fact retrieval. Filters: `--type`, `--scope`,
  `--confidence`, `--expired`, `--all`.
- `add-fact.sh` — interactive fact writer. Enforces scope mandatory, blocks
  secret patterns, defaults confidence to `unverified`.

### L1 Atomic Memory
- `memory/L1_atomic/SCHEMA.md` — field spec: id, type, statement, source,
  confidence, scope, expires_at, forbidden_assumptions, evidence.
- `memory/L1_atomic/INDEX.md` — auto-updated index table.
- File-based only. No network, no server, no npm deps.
- L0/L2/L3 not implemented.

### Spec Updates
- `gates/truth_gate.md` — status updated from "Future Hook" to "Implemented".
- `MANIFEST.json` — hooks 20→22, commands 21→23, scripts 10→13, memory section added.

### Infra
- `.gitignore` — added `.claude/state/` (runtime logs, not committed).
- Hook test suite expanded: +7 truth-gate test cases.

---

## v1.2.9-fixed — Hook Test Suite & Release QA
*2026-05-07*

- Added hook test suite with 13 automated tests across 4 hooks (in pack).
- Test suite reports 13/13 PASS when run from imported pack.
- Added `verify-claude-pack.js` for pack integrity check.
- Documented known limitations explicitly.
- Fixed `RELEASE_CHECKLIST.md` to match v1.2.9 scope (not v1.2 template).
- Cleaned filename encoding issues (`#U2014` → ASCII).
- Updated `MANIFEST.json` to reflect actual file structure.
- Added `README.md` at pack root.

---

## v1.2.8-fixed — PocketOS / API Destruction Guard
*2026-04*

- Added `api-destruct-guard.sh`: blocks raw destructive HTTP/GraphQL calls.
- Defense against PocketOS-style incidents (agent deletes Railway volume autonomously).
- Updated `AGENT_INCIDENT_DEFENSE.md` with PocketOS case analysis.

---

## v1.2.7 — Replit-Incident Defense / Production Protection
*2026-04*

- Strengthened `guard-destructive.sh` following Replit incident analysis.
- Added production command block patterns.
- Updated `AGENT_INCIDENT_DEFENSE.md` with Replit case.

---

## v1.2.6 — Handoff Mode
*2026-04*

- Added checkpoint/handoff protocol for context window limits.
- Agent generates structured handoff note before token exhaustion.

---

## v1.2.5 — E2E Safety
*2026-04*

- Added E2E safety layer to prevent runaway test loops.
- Timeout guards on E2E test runs.

---

## v1.2.4 — Local Audit Log
*2026-03*

- All hook decisions (allow/warn/deny) logged locally.
- Log format: `timestamp | hook | input | decision`.

---

## v1.2.3 — Scope Lock
*2026-03*

- Agent scope bounded to declared task.
- Cross-scope edits require explicit approval.

---

## v1.2.2 — Budget Mode Switch
*2026-03*

- Manual budget mode toggle to reduce API cost during low-priority tasks.

---

## v1.2.1 — Truthful Cost Guard
*2026-03*

- Cost estimation before expensive operations.
- Agent must report estimated cost, not hide it.

---

## v1.0–v1.1 — Foundation
*2026-02/03*

- Initial hook architecture.
- `db-protect.sh`, `token-scope-guard.sh` first versions.
- Basic agent ruleset.
