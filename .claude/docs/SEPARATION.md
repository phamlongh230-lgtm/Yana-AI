# Yana AI — Separation Policy

## Core principle

Yana AI is a **personal agent operating system**.
It is NOT a product. It is NOT bundled with any product repo by default.

Any product repo that uses Yana AI treats it as an **external tool**, applied
via a release pack into the target's `.claude/` directory.

---

## Why separated

Mixing operating tooling with product code causes:

- Handover packages leak agent operating files to recipients who do not
  need them (teachers, clients, downstream developers).
- Agent memory, brain dumps, and decision logs become visible in the
  product repo, which is inappropriate.
- Version drift: product releases vs tooling releases get conflated.
- Cross-scope edits: an agent operating on the product can accidentally
  modify operating tooling, and vice versa.

---

## Boundary rules

### Yana AI repo (this repo) contains:

```txt
core/hooks/         hook source
core/scripts/       support scripts
core/tests/         hook test suite
gates/              truth gate, action gate specs
docs/               Yana AI internal docs
releases/           versioned packs
CHANGELOG.md
ROADMAP.md
MANIFEST.json
README.md
```

### Yana AI repo does NOT contain:

```txt
any product application code (app/, components/, lib/, etc.)
any product database schema or migrations
any product UI assets (public/, static/)
any environment files (.env, .env.*)
any product-specific secrets, API keys, or credentials
any product-specific handover documents
```

### Target product repo contains (after applying Yana AI):

```txt
.claude/hooks/      ← copied from Yana AI release pack
.claude/scripts/    ← copied from Yana AI release pack
.claude/tests/      ← copied from Yana AI release pack
```

### Target product repo does NOT contain:

```txt
MEMORY.md           ← agent operating file, lives outside product repo
BRAIN_DUMP.md       ← agent operating file, lives outside product repo
agent checkpoint files
gates/              ← Yana AI internal
docs/               ← Yana AI internal (product has its own docs/)
```

---

## How Yana AI is applied to a product

1. Cut a release in Yana AI repo:
   `releases/yana-ai-vX.Y.Z-fixed.zip`
2. In the target product repo:
   ```bash
   unzip yana-ai-vX.Y.Z-fixed.zip -d .claude/
   ```
3. Commit to the product repo with a clear message:
   ```
   chore: apply Yana AI vX.Y.Z-fixed
   ```

The release pack contains only `hooks/`, `scripts/`, `tests/`.
No memory, no docs, no operating files.

---

## How to update Yana AI in a product

Same as apply — unzip overwrites. Always re-run the test suite afterward.
Never edit hooks directly inside a product repo. All edits happen in this
Yana AI repo, then a new release is cut and applied.

---

## How to remove Yana AI from a product

```bash
git rm -r .claude/hooks/ .claude/scripts/ .claude/tests/
git commit -m "chore: remove Yana AI hooks"
```

---

## README policy

- Product README: product description, contribution history. Untouched by Yana AI.
- Yana AI README: operating system description, apply guide.
- The two READMEs do not cross-reference each other in detail.
- A product README MAY note "this repo uses Yana AI vX.Y.Z" in tooling section.
