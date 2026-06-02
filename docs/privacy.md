# Privacy Policy — YAMTAM ENGINE GitHub App

**Effective date:** 2026-06-02

## What we collect

When you install the YAMTAM ENGINE GitHub App, we access:

- **Repository metadata** (name, default branch) — to create the setup PR
- **File contents** — only to check if YAMTAM config files already exist before writing

We do **not** collect, store, or transmit:
- Your source code
- Commit history
- Issues or pull request content
- User identity or email

## How we use it

The App reads the minimum required data to open one pull request with YAMTAM safety config files. All processing happens in a stateless Cloudflare Worker — no data is persisted after the request completes.

## Data storage

None. The Cloudflare Worker is stateless. No database. No logs retained beyond the request lifecycle.

## Third parties

The App runs on [Cloudflare Workers](https://workers.cloudflare.com). Cloudflare may log request metadata (IP, timestamp) per their own [privacy policy](https://www.cloudflare.com/privacypolicy/).

## Contact

Questions: open an issue at [github.com/phamlongh230-lgtm/yamtam-engine/issues](https://github.com/phamlongh230-lgtm/yamtam-engine/issues)
