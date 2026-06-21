---
id: fact-hermes-integration-paused
type: decision
statement: hermes_adapted integration is scoped to a 6-phase plan; only Phase 0 (foundation fixes) is done — Phases 1-5 (wiring tool_guardrails/system_prompt/context_compressor/memory_manager into live hooks) are designed but not started.
source: file:/home/codespace/.claude/plans/squishy-stirring-cookie.md
confidence: high
scope: Yana AI
tags: [hermes, hooks, dormant-code, session-bootstrap, paused]
forbidden_assumptions:
  - Do not assume core/lib/hermes_adapted/ is wired into anything yet — only sanitize_context/build_memory_context_block wiring (Phase 1) and beyond are still pending
  - Do not re-derive the architecture analysis from scratch — read the plan file first, it already covers why MemoryManager's ThreadPoolExecutor and StreamingContextScrubber are NOT wireable as-is
evidence: core/lib/hermes_adapted/*.py, plan file above
---

Phase 0 completed this session (commits 2a71ef8a, cb2aa8ac):
1. Fixed truth-gate-guard.sh — its jq transcript filter assumed a JSON array
   and a top-level .role key; real transcripts are JSONL with
   {"type":"assistant","message":{"role":...,"content":...}}. The hook had
   been silently no-op since 2026-05-19. Now fixed in both core/hooks/ and
   .claude/hooks/, with new test cases in run-hook-tests.sh.
2. Registered session-bootstrap.sh (UserPromptSubmit) and
   per-tool-circuit-breaker.sh (PreToolUse .*) in .claude/settings.json —
   both were fully built/tested since 2026-05-19/05-24 but never wired in
   (confirmed via git log -S, not a deliberate removal).

Also flagged (not fixed, out of scope): core/hooks/ and .claude/hooks/ have
already drifted (no sync mechanism exists); HOOK_WIRING.md is a downstream
consumer template, not a description of this repo's own settings.json.

Next session: read the plan file, confirm Phase 0 is still green
(core/tests/hooks/run-hook-tests.sh), then start Phase 1 (sanitize_context
wiring into session-bootstrap.sh — lowest risk, do first).
