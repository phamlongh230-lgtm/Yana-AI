# Hacker News — Show HN

## Title
```
Show HN: YAMTAM ENGINE – Agent OS for Claude Code/Cursor/Zed (8,550 skills, Rust runtime, 9-layer safety)
```

## Body
```
I'm 17, from Vietnam, and spent the last month building a safety layer for AI coding agents.

The problem: Claude Code, Cursor, and similar tools make real mistakes. Force-push to main. rm -rf the wrong dir. Install typosquatted packages. Commit secrets. By the time you notice, it's done.

YAMTAM sits between the agent and your system. Every tool call passes through 9 gates before execution:
- Anti-evasion (blocks base64 decode+exec, pipe-to-shell)
- Shell sanitization (quotes all vars, strips metacharacters)
- Egress check (blocks SSRF, AWS metadata endpoint 169.254.169.254)
- Supply chain gate (typosquatting detection, CVE check on every install)
- Blast radius cap
- Permission tiers
- ECDSA code signing
- Merkle audit log (tamper-detected hash chain)
- Sovereign overlord (human can freeze all agents instantly)

What's in the repo:
- 8,550 skill definitions (frontend, backend, AI/LLM, K8s, security, WASM, DevOps...)
- 93 specialist agent definitions
- 61 enforced security rules
- 46 pre/post hooks
- Rust runtime (yamtam-rt on crates.io) — 17 subcommands, 1256x faster than Python scanner
- 12 harness adapters: Claude Code, Cursor, OpenCode, Zed, Gemini, Copilot, Aider...

Total: 1,026,000 lines, 15,502 files.

Built by one person in ~1 month. Apache 2.0.

Repo: https://github.com/phamlongh230-lgtm/yamtam-engine
Docs: https://phamlongh230-lgtm.github.io/yamtam-engine/

Happy to answer questions about the architecture or any specific gate.
```

---

## Notes
- Post under your GitHub account
- Best time: Tuesday–Thursday 9–11am EST
- Tag: show-hn, ai, security, rust, claude
- Reply to every comment in first 2 hours — HN rewards engagement
