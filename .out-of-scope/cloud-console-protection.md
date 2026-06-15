# Out of Scope: Cloud Console Protection

## What it is
Hooks or guards that protect cloud infrastructure — AWS IAM policies, GCP org policies, Vercel team settings, Cloudflare firewall rules — from being modified by agents.

## Why it's tempting
The PocketOS incident involved a Railway API call. Yana AI already has `api-destruct-guard.sh` and `deploy-gate.sh`. "Why not go further and protect the cloud console itself?"

## Why we don't do it
**Wrong layer.** Cloud console protection belongs at the infrastructure level — IAM least-privilege, service accounts with read-only roles, environment-scoped tokens. A shell hook cannot protect a cloud console that the agent has a token for. If the token exists, the hook can be bypassed.

**Scope creep into infrastructure.** Yana AI operates inside `CLAUDE_PROJECT_DIR`. Cloud console protection requires reaching into credential management, token scoping, and network policy — all outside the hook layer's legitimate scope.

**Token-based defense already exists.** `token-scope-guard.sh` warns when agents read or grep for credential files. `api-destruct-guard.sh` blocks destructive HTTP calls. That's the right level — warn/block the *use* of credentials, not manage the credentials themselves.

## What to do instead
- Provision agents with scoped, read-only tokens
- Use short-lived tokens with minimal permissions
- Enable cloud provider audit logging (CloudTrail, GCP Audit Logs)
- Use `token-scope-guard.sh` + `api-destruct-guard.sh` to catch misuse at the agent layer
