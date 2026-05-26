# YAMTAM — Auditor-First Strategy

**Status:** Active  
**Last updated:** 2026-05-26  
**Author:** Vũ Văn Tâm  
**Source of truth:** [DIRECTION.md](../../DIRECTION.md)

---

## The Problem with the Old Positioning

YAMTAM was built as a full control layer for AI coding agents. The architecture is solid — 6-layer gate system, 45+ hooks, 164 commands. But the entry point was wrong.

**Old ask:** "Adopt my entire control layer."  
**Outsider response:** "Why would I learn a new system before knowing if I need it?"

The value is real. The ask was too big. No one installs something they don't yet understand.

---

## The Insight

Every developer using AI coding agents (Claude Code, Cursor, Copilot) has the same underlying risk:

- They don't know what their AI can actually do to their repo
- They haven't audited their `.claude/settings.json`, `.mcp.json`, or CI workflows
- They assume "it's fine" until something breaks

YAMTAM already knows what to look for. The gap is: they don't run YAMTAM before they feel pain.

**The insight:** lead with the audit, not the solution.

---

## The New Positioning

```
YAMTAM audits your AI coding agent setup before it can damage your repo.
```

**Tagline:** Scan first. Guard later.

This is not a change of product. It is a change of door.

```
Before:   "Here is my control layer — adopt it."
After:    "Run this one command — I'll show you what's exposed."
```

---

## Product Funnel

```
1. yamtam audit .
   ↓  (outsider sees their own risk score in 30 seconds)
   
2. Policy Kit
   ↓  (adopt the fixes YAMTAM recommends, one at a time)
   
3. Full Control Layer
      (deep users who want runtime enforcement, not just auditing)
```

The top of the funnel requires zero commitment. One command. No install ceremony. No learning YAMTAM first.

---

## MVP: `yamtam audit .`

### What it scans

| Target | Risk checked |
|--------|-------------|
| `.claude/settings.json` | allowedTools too broad, wildcard Bash, dangerouslyAllowAll |
| `.mcp.json` | filesystem full access, remote MCP with unknown origin |
| `.github/workflows/*.yml` | auto-merge without gate, auto-deploy on push, secrets exposed |
| `package.json` / `scripts/` | postinstall with `curl\|bash`, `rm -rf`, `chmod 777` |
| `.env`, `.env.*` | real API key patterns, private key blocks |

### Output format

```
YAMTAM Agent Audit Report
─────────────────────────
Target:  .
Scanned: 14 files
Score:   41/100  |  Risk: HIGH

[CRITICAL] .claude/settings.json — allowedTools contains Bash(*) (wildcard shell)
[HIGH]     .github/workflows/ai-pr.yml — auto-merge has no approval gate
[HIGH]     .mcp.json — filesystem server has root-level access
[MED]      package.json — postinstall runs remote shell script
[LOW]      scripts/deploy.sh — no dry-run mode

Run `yamtam audit . --markdown report.md` to export this report.
Run `yamtam audit . --fail-on high` to use in CI.
```

### Score model (deterministic, no AI)

- Start at 100
- CRITICAL finding: −30
- HIGH finding: −20
- MEDIUM finding: −10
- LOW finding: −3

| Score | Risk level |
|-------|-----------|
| 90–100 | LOW |
| 70–89 | MEDIUM |
| 40–69 | HIGH |
| 0–39 | CRITICAL |

### CLI interface

```bash
yamtam audit .                        # console output
yamtam audit . --json                 # machine-readable
yamtam audit . --markdown report.md  # file export
yamtam audit . --fail-on high        # CI gate (exit 1 if HIGH+)
yamtam audit . --fail-on critical    # CI gate (exit 2 if CRITICAL only)
```

### Exit codes

| Code | Meaning |
|------|---------|
| 0 | Clean — no findings above LOW |
| 1 | MEDIUM or HIGH findings present |
| 2 | CRITICAL findings present |
| 3 | Scanner error (file unreadable, parse failure) |

---

## Phase 1 Constraints

These constraints are not temporary — they are deliberate.

**Rule-based only.** No LLM in the scanner. Every finding is deterministic regex or JSON path. Users can read the rule source and understand exactly why a finding fired.

**No auto-fix in v0.1.** YAMTAM shows what is wrong. The human fixes it. This builds trust before we add automation.

**README leads with audit.** The L0–L5 gate architecture is real and valuable — but it moves to a second section. Outsiders see the audit output first.

**Docs and schema before code.** Rules are locked in YAML before a single line of TypeScript is written. This prevents implementation-first drift.

---

## Roadmap

| Version | Milestone |
|---------|-----------|
| v0.1 | `yamtam audit .` — scan, score, report. No auto-fix. |
| v0.2 | CI Gate — `--fail-on`, GitHub Action example |
| v0.3 | Policy Kit — recommended configs, fix templates |
| v0.4 | Control Layer — scope guard, truth gate, token guard (existing YAMTAM) |
| v0.5 | Runtime Evals — task lifecycle, evidence schema |

---

## What We Are Not Doing

- No "YAMTAM secures all AI agents" claim — we say "audits common risk patterns"
- No auto-fix at launch — earn trust first
- No 50 rules immediately — 5 sharp rules beat 50 vague ones
- No L0–L5 in the hero — that is the depth, not the door
