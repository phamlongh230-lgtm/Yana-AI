# YAMTAM ENGINE

**Personal Agent Operating System**

Multi-agent workflow orchestration with runtime security gates and evidence-based verification.

---

## What is YAMTAM?

YAMTAM ENGINE is a standalone operating system for AI agents. It provides:

- **Security gates** — 6-layer enforcement (L0-L5) blocking unsafe operations
- **Multi-agent orchestration** — 90 specialized agents for different roles
- **Evidence-based verification** — no claims without proof
- **Cross-engine support** — works with Claude Code, Cursor, Aider, Copilot

This is **not a product**. It's an operating system that applies to any codebase via release packs.

---

## Stats

| Component | Count |
|---|---|
| Agents | 90 |
| Commands | 164 |
| Hooks | 35 |
| Skills | 351 |
| Scripts | 46 |
| Rules | 60 |
| Checks | 826 |

**Version:** 1.6.1  
**Status:** Private  
**Owner:** Vũ Văn Tâm  
**License:** Proprietary

---

## Architecture

### 6-Layer Gate System

```
L0 — Audit       audit-log.sh, telemetry-sender.sh
L1 — Scope       token-scope-guard.sh, scope-guard.sh
L2 — Commit      commit-gate.sh
L3 — Truth       truth-gate-guard.sh
L4 — Deploy      deploy-gate.sh
L5 — Destructive guard-destructive.sh, db-protect.sh, api-destruct-guard.sh
```

Each layer enforces progressively stricter controls:
- **L0-L1**: Log and warn
- **L2-L3**: Advisory blocks
- **L4-L5**: Hard blocks (require bypass env vars)

### Memory System

- **L1 Atomic Memory** — persistent facts, git-tracked
- **L2 Session Memory** — ephemeral facts, cleared each session

### Cross-Engine Support

| Engine | Enforcement |
|---|---|
| Claude Code | Runtime hooks (native) |
| Cursor | Hard enforcement via safe-run.sh |
| Aider | Hard enforcement via shell proxy |
| GitHub Copilot | Advisory (prompt layer) |

---

## Repository Structure

```
yamtam-engine/
├── core/
│   ├── agents/          90 agent definitions
│   ├── commands/        164 slash commands
│   ├── hooks/           35 runtime hooks
│   ├── skills/          351 workflow skills
│   ├── scripts/         46 utility scripts
│   ├── rules/           60 operating rules
│   └── tests/           826 verification checks
├── gates/               Gate specifications (truth, action, security)
├── docs/                Documentation
├── memory/
│   ├── L1_atomic/       Persistent memory
│   └── L2_session/      Session memory
├── releases/            Release packs
└── adapters/            Cross-engine adapters
```

---

## How to Apply

YAMTAM applies to target projects via release packs:

```bash
# Extract release pack into target project
unzip releases/yamtam-engine-v1.6.1.zip -d /path/to/project/.claude/

# Verify installation
cd /path/to/project
bash .claude/tests/hooks/run-hook-tests.sh
```

Or install via Claude Code plugin:
```
/plugin install phamlongh230-lgtm/yamtam-engine
```

---

## Key Features

### Truth Gate (L3)

Blocks claims without evidence:
- ❌ "Tests passed" (no output shown)
- ✅ "Tests passed — 47 passed, 0 failed" (evidence shown)

Claim verbs require proof: `done`, `passed`, `clean`, `fixed`, `deployed`, `merged`, `verified`

### Action Gate (L0-L5)

Risk-based approval system:
- **L0 Read** — allowed
- **L1 Local write** — logged
- **L2 Commit** — warn on cross-scope
- **L3 Push** — request approval
- **L4 Deploy** — block by default
- **L5 Production data** — hard block

### Scope Guard

Prevents cross-scope edits:
- YAMTAM-scoped tasks cannot edit product code (`app/`, `components/`, `lib/`)
- Product-scoped tasks cannot edit YAMTAM files
- Requires explicit approval to cross boundaries

---

## Commands

Key slash commands:

| Command | Purpose |
|---|---|
| `/verify` | Full health check (git + hooks + tests + drift) |
| `/memory [keyword]` | Search L1 + L2 memory |
| `/session` | Manage session memory |
| `/rollback` | List checkpoints and rollback |
| `/risk-scan` | Pre-execution risk analysis |
| `/scope-declare` | Declare file scope before edits |
| `/security-audit` | Security review |
| `/handoff` | Generate session handoff |
| `/status` | Project status card |

Full list: `core/commands/` (164 commands)

---

## Skills

Organized by category:

- **Security** (11): red-team-check, blue-team-fix, supply-chain-security, zero-trust-patterns
- **AI/Agent** (19): rag-architect, prompt-engineering, research-team, tree-of-thoughts
- **Frontend/UI** (21): baseline-ui, shadcn-patterns, design-tokens-system, generative-ui-patterns
- **IaC/DevOps** (5): kubernetes-patterns, terraform-patterns, docker-patterns, cicd-patterns
- **Data/Backend** (11): database-patterns, graphql-patterns, caching-patterns, resilience-patterns
- **Workflow** (10): plan-first, verify-before-done, tdd, debug-protocol, worktree-safety

Full list: `core/skills/` (351 skills)

---

## Agents

90 specialized agents across domains:

- **Core Development** (8): fullstack-engineer, api-designer, microservices-architect
- **Quality Assurance** (6): test-automation-engineer, qa-lead, performance-tester
- **Infrastructure** (8): devops-engineer, sre, cloud-architect
- **Security** (4): security-engineer, penetration-tester, compliance-auditor
- **Data/AI** (6): data-engineer, ml-engineer, llm-architect
- **Business** (4): business-analyst, technical-writer, ux-researcher

Full list: `core/agents/`

---

## Rules

60 operating rules enforcing:

- **Meta** (1): 00-meta-rule-enforcer
- **Security** (4): 43-prompt-jailbreak-advanced, 44-supply-chain-vetting
- **Isolation** (3): 03-privilege-isolation, 04-sandbox-isolation-law
- **Autonomous** (2): 63-autonomous-session-law, 64-scope-drift-law
- **Sovereign** (1): sovereign-overlord-gate-law

Full list: `core/rules/`

---

## Verification

826 total checks:
- 65 hook tests
- 12 audit tests
- 334 skill trigger tests
- 65 red-team scenarios
- 6 smoke tests

Run full verification:
```bash
bash core/tests/hooks/run-hook-tests.sh
bash core/tests/skills/test-skill-triggering.sh
```

---

## Release Process

```bash
# Build release pack
bash core/scripts/build-release.sh

# Runs: syntax check → 826 checks → drift check → zip

# Tag and push (triggers GitHub Actions)
git tag v1.6.1
git push origin v1.6.1
```

---

## Documentation

- `AGENTS.md` — Entry point for AI assistants (read first)
- `gates/truth_gate.md` — L3 Truth Gate specification
- `gates/action_gate.md` — L0-L5 Action Gate specification
- `docs/SEPARATION.md` — Boundary between YAMTAM and product repos
- `docs/AGENT_BEHAVIOR.md` — Good vs bad agent behavior examples
- `docs/HOOK_WIRING.md` — Hook configuration guide
- `ROADMAP.md` — Feature roadmap
- `CHANGELOG.md` — Release history

---

## What YAMTAM is NOT

- Not a product app
- Not user-facing software
- Not bundled with product repos by default
- Not a replacement for real production safety (IAM, backups, RBAC, monitoring)
- Not allowed to claim success without evidence

See `.out-of-scope/` for deliberately excluded features.

---

## License

YAMTAM ENGINE is proprietary software.

Copyright © 2026 Vũ Văn Tâm. All rights reserved.

No one is allowed to copy, modify, redistribute, publish, host, sell, or create derivative works from this project without prior written permission.

See `LICENSE` for details.

---

## Contact

**Owner:** Vũ Văn Tâm  
**Repository:** yamtam-engine  
**Version:** 1.6.1  
**Last Updated:** 2026-05-23
