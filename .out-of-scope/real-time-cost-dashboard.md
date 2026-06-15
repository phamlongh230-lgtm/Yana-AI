# Out of Scope: Real-Time Cost Dashboard

## What it is
A live UI or terminal dashboard showing token usage, API cost, and context window consumption per session or agent.

## Why it's tempting
Claude Code sessions can get expensive. Watching cost in real-time feels like useful feedback — "I'm at $0.40 this session, maybe stop here."

## Why we don't do it
**We cannot know.** Claude Code does not expose token counts or cost in hook payloads. Any number we display would be an estimate derived from character counts — imprecise, misleading, and likely wrong for cached tokens. Showing fake-precise numbers is worse than showing nothing. `telemetry-sender.sh` already logs tool activity to `.claude/state/telemetry.jsonl` (factual, no estimates) — that's the right ceiling.

**Over-engineering for current scale.** A single developer running Yana AI on personal projects doesn't need a dashboard. The cost signal is "did I notice something expensive?" not "is the number above X?"

## What to do instead
- Check the Anthropic console for actual spend
- Use `bash core/scripts/view-audit.sh` for tool activity
- Use `budget-mode.sh on` to restrict expensive operations when concerned about cost
