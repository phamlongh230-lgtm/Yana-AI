# Out of Scope: Multi-Agent Coordination

## What it is
Orchestrating multiple Yana AI instances across projects — shared memory, cross-repo hooks, centralised gate policy, agent-to-agent messaging.

## Why it's tempting
Large codebases span multiple repos. Wouldn't it be powerful if the backend repo's agent and the frontend repo's agent shared L1 facts and coordinated deploys?

## Why we don't do it
**Wrong layer.** Yana AI is a personal agent operating system — single repo, single session, single developer. Cross-repo coordination is infrastructure, not hook layer. The moment we add networking, shared state, or message passing, we've built a distributed system with all its failure modes (split-brain, stale facts, coordination overhead).

**Multica is the right tool.** Multi-agent coordination belongs in a dedicated orchestration layer (multica, LangGraph, etc.), not in shell hooks.

**Scope boundary would collapse.** Every Yana AI hook runs inside `CLAUDE_PROJECT_DIR`. The moment a hook reaches outside that boundary, it can affect other projects — exactly the kind of blast radius Yana AI is designed to prevent.

## What to do instead
- Apply the same Yana AI pack independently to each repo
- Share L1 facts manually: export from one project's `memory/L1_atomic/` and import to another via `add-fact.sh`
- Use multica or a dedicated orchestration layer for cross-repo coordination
