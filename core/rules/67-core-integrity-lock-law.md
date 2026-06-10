# 67-core-integrity-lock-law

**Status:** Active
**Tier:** TIER 1 — SECURITY
**Gate:** L0/L1 — session boot, pre-commit, pre-push
**Scope:** core/rules/ · core/gates/ · core/hooks/ · core/scripts/

---

## Rule

The core infrastructure surface is pinned by a SHA-256 manifest at
`core/config/core-lock.json`. Any session, commit, or push MUST treat a
core-lock verification failure as a hard stop — no exceptions, no overrides
by any agent.

This is the **detection** half of [[49-immutable-infrastructure-law]] (core is
a read-only surface at runtime) and a practical first step toward
[[61-code-signing-law]] (full ECDSA artifact signing).

## Commands

```bash
# Verify (boot / pre-commit / pre-push) — exit 0 intact, 1 violation, 2 no lock
bash core/scripts/verify-core-lock.sh

# Regenerate after an INTENTIONAL, reviewed core change
bash core/scripts/update-core-lock.sh
```

## Violation Classes

| Class | Meaning | Threat covered |
|-------|---------|----------------|
| `DRIFT` | Pinned file content changed | Gate/rule silently weakened in place |
| `MISSING` | Pinned file deleted | Safety rule removed |
| `EXTRA` | Unpinned file appeared in locked dir | Malicious rule/hook injection |

All three classes → exit 1 → block. `EXTRA` is deliberately a violation:
injecting a new rule file is the cheapest way to reprogram the engine.

## Regeneration Protocol

1. A core change is made intentionally (by human, or by agent with approval)
2. Review the diff of the changed core files — every file, every line
3. Run `update-core-lock.sh` — lockfile records new hashes + timestamp
4. Commit core change **and** lockfile in the same commit

The lockfile is tracked in git, so regenerating it can never hide tampering:
the regeneration itself is a visible diff with authorship and history.

## Prohibited

```
❌ Regenerating the lock to "make the gate pass" without reviewing the diff
❌ Agent regenerating the lock to bless its own unauthorized core change
❌ Excluding a directory from LOCKED_DIRS to avoid a violation
❌ Continuing a session after a verification failure without human review
❌ Deleting core-lock.json (verify exits 2 — treat as violation until restored)
```

## Verification Result Handling

```
exit 0 → proceed
exit 1 → STOP. Report drifted/missing/extra files to the human.
         Do not write to core/. Do not commit. Do not push.
         Resolution paths: git checkout (restore) OR review + update-core-lock.sh
exit 2 → lockfile or dependency missing — restore from git before proceeding
```

Results are appended to the L0 audit trail via `secure-logger.sh`
(`core_lock_verify PASS|VIOLATION`).

## References

- `core/scripts/verify-core-lock.sh` — verifier implementation
- `core/scripts/update-core-lock.sh` — manifest generator
- `core/rules/49-immutable-infrastructure-law.md` — runtime write policy
- `core/rules/61-code-signing-law.md` — signing roadmap (supersedes this when implemented)
- `core/config/skills-lock.json` — same pattern, skills surface
