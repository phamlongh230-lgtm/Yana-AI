# Out of Scope: Enterprise RBAC

## What it is
A full role-based access control system: user management, role hierarchies, permission inheritance, audit trails tied to identity, JWT-based agent authentication.

## Why it's tempting
`rbac-guard.sh` exists and checks `rbac.json`. It's easy to imagine extending it: "what if we had team roles, permission groups, approval workflows?"

## Why we don't do it
**Agent identity is unreliable.** Claude Code does not provide cryptographically verified agent identity. `agent_name` in hook payloads is a string — any agent can claim any name. Building a security-critical access control system on top of an unverified identifier is a false sense of security.

**Single developer target.** Yana AI is personal tooling. The "team" is one person. Enterprise RBAC is designed for 50+ users with compliance requirements and org-level policy enforcement. It adds ceremony with no safety benefit at this scale.

**The current `rbac.json` is enough.** A lightweight policy file that fails open for unknown agents and fails closed for known restricted ones covers the real use case: "don't let the `qa-engineer` agent push to production."

## What to do instead
- Use `rbac.json` for lightweight agent-level tool restrictions
- For real team access control, use GitHub branch protection, required reviews, and environment secrets — infrastructure-level controls that can't be bypassed by a hook
