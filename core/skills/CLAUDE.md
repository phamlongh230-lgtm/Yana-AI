# core/skills — On-Demand Workflow Knowledge

Skills are structured knowledge files that Claude reads when triggered by a matching user request. They are not hooks (they don't fire automatically) and not agents (they don't spawn sub-processes).

## Rules for working in this directory

- Each skill must have a clear **purpose**, **trigger conditions**, **rules**, **anti-patterns**, and a **verification** step.
- Do not write a skill that duplicates an existing command or agent — check `core/commands/` and `core/agents/` first.
- Skills must not be excessively long. If a skill exceeds ~200 lines of guidance, split it or trim it.
- Do not copy content from external sources without attribution if the use is substantial.
- Every new skill added must be registered in `skills-lock` if `verify-skills-lock.sh` policy requires it.

## Skill file structure

Each skill lives in its own subdirectory:
```
core/skills/<skill-name>/
  SKILL.md   ← required: the skill content Claude reads
```

## Trigger discipline

- Triggers must be specific enough that they don't fire on unrelated prompts.
- If a skill overlaps heavily with another, prefer extending the existing one.

## Output Contract (required for skills with outputs)

Skills that produce analysis, recommendations, or data-based conclusions MUST include an explicit `## Output Contract` section specifying:

- **Forced conclusion** — a definitive answer, not hedged language. No "may", "might", "seems", "consider". If uncertain, state confidence % and reason, not vagueness.
- **Output shape** — exact fields the skill will always produce (e.g. verdict, confidence, evidence, next-action).
- **Ambiguity ban** — phrases like "it depends", "you should evaluate", "there are pros and cons" are banned as the final output. They may appear in reasoning, never in the conclusion.

```markdown
## Output Contract

Verdict:     [SPECIFIC DECISION — not "it depends"]
Confidence:  [0–100%]
Evidence:    [what was checked, with sources]
Next action: [one concrete step]
```

## In-Skill Verification (required for skills using numbers or external data)

Skills that process numeric data, metrics, or external facts MUST embed a verification step — not just recommend one. The skill must specify:

- What to cross-check (which fields, which sources)
- Acceptable deviation threshold (e.g. ≤1% for financial figures)
- What to do on mismatch (flag, reject, or note discrepancy)

```markdown
## Verification Step

Before finalizing output:
1. Re-check [specific field] against [source B]
2. Deviation > [threshold] → flag and note in output, do not silently correct
3. If cross-check unavailable → label output as "unverified" with confidence ≤ 60%
```

## Adversarial team pattern (for complex analysis skills)

When a skill requires balanced, high-stakes analysis, use opposing roles rather than a single perspective. Spawn subagents with explicitly conflicting mandates — do not aim for consensus, aim for productive tension.

See `core/skills/adversarial-team-pattern/SKILL.md` for the full template.

Rule: if you spawn 2+ subagents to analyze the same question, at least one must have a "challenge / find flaws" role. Consensus-only multi-agent = single agent with extra steps.

## Anti-patterns to avoid

- Skills that claim facts without verification steps.
- Skills that instruct Claude to take destructive actions without a gate.
- Skills that reference external URLs or credentials directly.
- Placeholder skills with empty or lorem-ipsum content.
- Skills producing vague conclusions ("it depends", "consider your needs") as final output.
- Multi-agent skills where all agents are instructed to agree.

## When adding a new skill

1. Create `core/skills/<name>/SKILL.md`.
2. Register it in `skills-lock` if required.
3. Confirm `verify-skills-lock.sh` still passes.
4. Update MANIFEST.json skills count if the total changes.
