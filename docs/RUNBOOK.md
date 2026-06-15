# Yana AI — Runbook

How to apply Yana AI to any project.

---

## Prerequisites

- Target project uses git.
- Target project has a `.claude/` directory (or will have one).
- You have the Yana AI release pack: `yana-ai-vX.Y.Z-fixed.zip`.

---

## Apply Yana AI to a Project

```bash
# 1. Backup current state
cd /path/to/target-project
git status
git diff > before-yana-ai-vX.Y.Z.patch

# 2. Apply pack
unzip /path/to/yana-ai-vX.Y.Z-fixed.zip -d .claude/

# 3. Verify syntax
bash -n .claude/hooks/*.sh .claude/scripts/*.sh

# 4. Verify pack integrity
node .claude/scripts/verify-claude-pack.js

# 5. Run hook tests
.claude/tests/hooks/run-hook-tests.sh

# Expected:
# Total tests: 13
# Passed: 13
# Failed: 0

# 6. Commit
git add .claude/
git commit -m "chore: apply Yana AI vX.Y.Z-fixed"
```

---

## Update Yana AI in an Existing Project

Same as apply — unzip overwrites existing files.
Always run tests after update.

```bash
git diff .claude/ > yana-ai-update-diff.patch   # optional: save diff
unzip yana-ai-vX.Y.Z-fixed.zip -d .claude/
.claude/tests/hooks/run-hook-tests.sh
git add .claude/
git commit -m "chore: update Yana AI to vX.Y.Z-fixed"
```

---

## Remove Yana AI from a Project

```bash
git rm -r .claude/hooks/ .claude/scripts/ .claude/tests/
git commit -m "chore: remove Yana AI hooks"
```

---

## Add Truth Gate to AI Prompt

After applying, add this to your Claude Code or AI assistant prompt template:

```
Yana AI vX.Y.Z-fixed is active.
Hooks: api-destruct-guard, token-scope-guard, guard-destructive, db-protect.

Before using: done / finished / passed / clean / fixed /
pushed / deployed / merged / verified

Show strong evidence (git output, test output, file content, CI log).
If evidence unavailable, use: claimed / reportedly / expected / unverified.

Before any write/commit/push:
- Report git status
- Confirm scope (which files will be touched)
- Wait for approval if risk >= commit
```

---

## Cut a New Yana AI Release

```bash
# In yana-ai repo:

# 1. Update CHANGELOG.md
# 2. Run tests
.claude/tests/hooks/run-hook-tests.sh   # must be 13/13 PASS

# 3. Bump MANIFEST.json version

# 4. Pack
cd core/
zip -r ../releases/yana-ai-vX.Y.Z-fixed.zip hooks/ scripts/ tests/

# 5. Commit + tag
git add .
git commit -m "release: yana-ai vX.Y.Z-fixed"
git tag vX.Y.Z-fixed
git push origin main --tags
```

---

## Hooks Reference

| Hook | Trigger | Action |
|---|---|---|
| `api-destruct-guard.sh` | DELETE/PATCH/GraphQL mutation | deny |
| `token-scope-guard.sh` | Read .env / grep token | warn |
| `guard-destructive.sh` | rm -rf, git push --force | deny |
| `db-protect.sh` | DROP TABLE, prisma reset, prod DB URL | deny |

Override (use with caution):
```bash
YANA_PROD_APPROVED=1 <command>
```
