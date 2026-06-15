# Yana AI L1 Atomic Memory — Schema v1.0

Each fact lives in its own `.md` file with this YAML frontmatter.
Do not store secrets, tokens, credentials, or personally identifiable data.

---

## Required Fields

```yaml
---
id:         <uuid or short slug, e.g. "fact-001">
type:       <fact | decision | constraint | assumption | observation>
statement:  <one sentence — the fact itself>
source:     <where this came from: "user:2026-05-17" | "git-log:abc123" | "file:path/to/file.md">
confidence: <unverified | low | medium | high>
scope:      <Yana AI | product | both>
---
```

## Optional Fields

```yaml
expires_at:            <YYYY-MM-DD — when this fact should be re-verified; omit if perpetual>
tags:                  [tag1, tag2, tag3]  # short labels for tag-based search; lowercase, hyphenated
forbidden_assumptions: <list of things that must NOT be inferred from this fact>
evidence:              <path or quoted excerpt that backs the statement>
superseded_by:         <id of the fact that replaced this one>
```

## Tags

Tags are short, lowercase, hyphenated labels used to group and filter facts.
Examples: `hook`, `memory`, `scope`, `ci`, `electron`, `auth`, `release`.

- Use `--tag TAG` in `search-facts.sh` to filter by tag.
- One fact can have multiple tags.
- Tags are stored in the fact file frontmatter only — not indexed in INDEX.md.
- Tags must not encode secrets or PII.

## Confidence Levels

| Level      | Meaning                                                      |
|------------|--------------------------------------------------------------|
| unverified | Default. Written from memory or inference, not confirmed.    |
| low        | Some indirect evidence exists but not authoritative.         |
| medium     | Confirmed once via direct observation (git, file, output).   |
| high       | Confirmed repeatedly, backed by persistent evidence.         |

Confidence is `unverified` by default. It MUST be promoted manually — never auto-promoted.

## Scope Values

| Value   | Meaning                                             |
|---------|-----------------------------------------------------|
| Yana AI  | Applies only to this yana-ai repo             |
| product | Applies only to the target product being built      |
| both    | Applies across both contexts                        |

Scope is mandatory. Without it, the fact cannot be safely applied.

## Hard Limits

- No network calls, no external services
- No secrets, tokens, API keys, credentials, or passwords
- `confidence: unverified` is the default — promote only after manual verification
- `scope` is required — a fact without scope cannot be safely used

## Example Fact File

```markdown
---
id: fact-001
type: constraint
statement: Yana AI-scoped tasks must not touch app/ components/ lib/ db/ without explicit cross-scope approval.
source: user:2026-05-17
confidence: high
scope: both
expires_at: 2027-01-01
forbidden_assumptions:
  - Do not assume approval carries over between sessions
  - Do not assume Yana AI scope = product scope
evidence: gates/action_gate.md § Scope Rules
---

Cross-scope edits require an explicit "approved to cross scope into <path>" statement from the user
in the current session. The approval does not persist across sessions.
```
