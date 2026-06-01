# Reddit Posts

---

## r/ClaudeAI

**Title:**
```
I built a safety OS for Claude Code — 8,550 skills, 9-layer gate system, Rust runtime. Open source.
```

**Body:**
```
Been using Claude Code daily and kept running into the same problem: it's powerful but sometimes makes 
real mistakes — force-pushes, wrong rm -rf, installing suspicious packages.

So I built YAMTAM ENGINE: a hook layer that sits between Claude Code and your system.

Every tool call passes through gates before executing:
- Blocks force push, rm -rf, curl|bash
- Detects typosquatted packages before install
- Blocks SSRF (AWS metadata endpoint, private IPs)
- Merkle audit log — every action recorded, tamper-proof
- Sovereign freeze — one command stops all agents instantly

Also includes:
- 8,550 skill definitions (searchable at the docs site)
- 93 specialist agent definitions
- Rust CLI (yamtam-rt) — yamtam scan, yamtam graph, yamtam vault, yamtam doctor
- Works with Claude Code, Cursor, OpenCode, Zed, Gemini, Copilot

Install: npm install yamtam-engine && npx yamtam-install

Repo: https://github.com/phamlongh230-lgtm/yamtam-engine
Docs: https://phamlongh230-lgtm.github.io/yamtam-engine/

Apache 2.0, free forever. Built by one person (17yo, Vietnam) in ~1 month.
```

---

## r/artificial

**Title:**
```
Show r/artificial: Agent OS with 9-layer safety gates for AI coding tools — blocks SSRF, force-push, typosquatting, and more before execution
```

**Body:**
```
The core problem with AI coding agents isn't capability — it's that mistakes happen silently and 
irreversibly. By the time you see the damage, `git push --force` already ran.

YAMTAM ENGINE is a hook-based safety layer that intercepts every tool call:

Gate system (9 layers):
1. Anti-evasion — base64 decode+exec, pipe-to-shell blocked at L1
2. Shell sanitization — shellcheck-inspired, strips metacharacters
3. Egress check — SSRF prevention (169.254.169.254, RFC1918 ranges)
4. Supply chain — typosquatting detection, CVE scan before every npm/pip install
5. Blast radius — caps how destructive a single action can be
6. Permission tiers — agents have R/W/X/P authority levels
7. ECDSA signing — generated code must be signed before execution
8. Merkle audit chain — hash-chained log, tamper-detected instantly
9. Sovereign gate — human veto + freeze swarm + full rollback

Beyond safety:
- 8,550 skill definitions across frontend, backend, AI/LLM, K8s, security, WASM
- 93 specialist agent definitions
- Rust runtime (1256x faster than Python scanner)
- 12 harness adapters: Claude Code, Cursor, OpenCode, Zed, Gemini, Copilot, Aider

1,026,000 lines total. Apache 2.0.

https://github.com/phamlongh230-lgtm/yamtam-engine
```

---

## r/rust (for yamtam-rt)

**Title:**
```
yamtam-rt: Rust CLI for AI agent safety — scan, graph, vault, hunt, fix, doctor (17 subcommands, 1256x faster than Python)
```

**Body:**
```
Released yamtam-rt on crates.io — the Rust runtime for YAMTAM ENGINE, an agent safety OS for 
Claude Code and other AI coding tools.

cargo install yamtam-rt

17 subcommands:
- yamtam scan .       — security scan (secrets, CVEs, supply chain risks)
- yamtam graph .      — knowledge graph (file deps, import resolution for Rust/TS/Python/Go)
- yamtam vault search — search 8,550 skill definitions
- yamtam hunt .       — OWASP pattern hunting
- yamtam fix .        — auto-fix rule violations
- yamtam doctor .     — full system health check
- yamtam map .        — blast radius map for agent permissions
- yamtam ci           — CI gate checks (826 rule checks)
- yamtam watch .      — file watcher with hook triggers

Benchmark on 10k-file repo: 1256x faster than the Python equivalent.

Built with: clap, serde, walkdir, regex, sha2, ureq, rayon

Repo: https://github.com/phamlongh230-lgtm/yamtam-engine
Crate: https://crates.io/crates/yamtam-rt
```

---

## r/programming

**Title:**
```
I spent a month building a 9-layer safety system for AI coding agents. Here's what I learned about the attack surface.
```

**Body:**
```
After using Claude Code and Cursor daily, I catalogued every dangerous action an AI agent could take 
and built gates for each. Here's what surprised me:

1. The biggest risk isn't rm -rf — it's supply chain.
   Agents suggest `pip install req-uests` (typosquatted). Users trust and run it.
   Gate: pattern-match against top 1000 packages, flag 1-2 char differences.

2. SSRF via AI is real.
   Agents with WebFetch tools can be prompted to hit 169.254.169.254 (AWS metadata).
   Gate: resolve DNS before request, check against RFC1918 + link-local ranges.

3. Prompt injection through tool results.
   External URL → agent fetches → result contains "ignore previous instructions".
   Gate: scan tool results for injection markers before returning to context.

4. Context flooding.
   Attacker controls a tool result → returns 500KB of text → blows context window.
   Gate: 16KB cap on all tool results.

5. Audit logs can be deleted.
   An agent that can write to logs can delete evidence of its own mistakes.
   Gate: Merkle hash chain — every entry includes SHA256 of previous entry.
   Deletion = chain break = detected instantly.

The full system (YAMTAM ENGINE) is open source:
https://github.com/phamlongh230-lgtm/yamtam-engine

Happy to go deeper on any of these attack vectors.
```

---

## Posting order (recommended)
1. r/ClaudeAI — highest relevance, most likely to get traction fast
2. HN Show HN — technical audience, best for long-term visibility
3. r/rust — for yamtam-rt specifically
4. r/artificial — broader AI safety angle
5. r/programming — educational angle, attack surface breakdown
