# YAMTAM L1 Atomic Memory — Index

Auto-updated by `core/scripts/add-fact.sh` when a new fact is added.
Do not edit manually — run `bash core/scripts/add-fact.sh` instead.

Schema: `memory/L1_atomic/SCHEMA.md`

---

## Facts

| ID | Type | Scope | Confidence | Statement (truncated) | File |
|----|------|-------|------------|----------------------|------|
| fact-scope-boundary | constraint | both | high | YAMTAM-scoped tasks must not edit app/ components/ lib/ db/ migrations/… | [fact-scope-boundary.md](fact-scope-boundary.md) |
| fact-truth-gate | fact | YAMTAM | high | Truth Gate (L3) is enforced by AI prompt + runtime Stop hook truth-gate-guard.sh… | [fact-truth-gate.md](fact-truth-gate.md) |
| fact-hook-exit-codes | fact | YAMTAM | high | Hooks use exit 0 to allow, exit 0 + stdout to warn, JSON + exit 2 to block… | [fact-hook-exit-codes.md](fact-hook-exit-codes.md) |
| fact-confidence-rule | constraint | YAMTAM | high | L1 fact confidence must be promoted manually only — never auto-promoted… | [fact-confidence-rule.md](fact-confidence-rule.md) |

<!-- add-fact.sh appends rows above this line -->
<!-- END INDEX -->
