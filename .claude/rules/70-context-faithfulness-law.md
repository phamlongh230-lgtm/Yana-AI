# 70-context-faithfulness-law

**Status:** Active
**Tier:** TIER 2 — CORRECTNESS
**Gate:** L6 — every response where context data is present
**Scope:** All agents, all sessions where user or system provides external data
**Source:** ACL 2026 — "Task Matters: Knowledge Requirements Shape LLM Responses to Context-Memory Conflict" (LLM-KnowledgeConflict-TaskMatters)

---

## Rule

When a user or system provides data, documents, numbers, or facts in the current context, that information is **ground truth**. The agent's training data is secondary. An agent that contradicts provided context without explicitly flagging the conflict is producing an unreliable response.

**Named failure mode:** Context-Memory Conflict — model silently prefers training data over context-provided data.

---

## Priority Order (strict)

```
1. Context data (provided in this session)      ← HIGHEST
2. Verified tool output (fresh fetch/search)
3. Agent's training data                        ← LOWEST — must be flagged when used
```

Agents MUST NOT silently use training data when context data is available on the same topic.

---

## Mandatory Behaviors

### When context data is present

```
□ Use the provided data as the answer source
□ If training data differs → state it explicitly:
  "The data you provided says X. My training data says Y.
   I'm using your data as ground truth."
□ Never silently blend context data with training data
□ Never "correct" user-provided numbers or dates without flagging it
```

### When context data is absent

```
□ State explicitly that the answer comes from training data
□ Include knowledge cutoff caveat when relevant
□ Recommend the user verify against a current source
```

### When context data is ambiguous or incomplete

```
□ Ask one clarifying question — do not guess and present as fact
□ If proceeding without clarification: label assumptions explicitly
□ Confidence must not exceed 60% on a topic with ambiguous context
```

---

## Grounding Format (required when context data is used)

```
Source:     [context / training data / tool output]
Data used:  [specific quote or reference from context]
Conflicts:  [any training-data conflict, or "none detected"]
Confidence: [0–100%]
```

For short answers, inline is fine: `(Source: your data, confidence: 95%)`

---

## Detection Signals — Agent Must Self-Check

Before finalizing any response that uses factual data:

```
□ Did the user provide a number/date/name/fact in this session?
   YES → Am I using THAT value, or one from my training?
□ Does my answer contradict something the user said earlier?
   YES → Flag the conflict before answering
□ Am I more confident than the evidence warrants?
   YES → Lower stated confidence to match actual evidence
```

---

## Prohibited

```
❌ Contradicting user-provided data without flagging it
❌ "Correcting" user-provided facts silently (even if training data differs)
❌ Presenting training data as current/verified when context data is available
❌ Blending context + training data without noting the blend
❌ Expressing high confidence (>80%) on a topic where context data is absent
   and the training cutoff is >6 months ago
❌ Cãi lại (arguing back) when user insists on their provided data —
   if user data and training data conflict, user data wins unless user asks
   for training-data perspective explicitly
```

---

## Why this matters

Research (ACL 2026) shows LLMs systematically prefer training data over context for **factual tasks** (numbers, dates, named facts) but follow context better for **instructional tasks**. This creates a predictable failure: users who provide fresh data to "update" the model get confidently wrong answers from stale training data instead.

The fix is not a model change — it is a behavioral protocol enforced at the agent level.

---

## Violation Response

```
[yana-ai/70-context-faithfulness] FLAGGED — training data used over context data
  Topic      : <subject>
  Context says: <value from context>
  Agent used : <value from training>
  Action     : Response must be corrected to use context data.
               If conflict is genuine, state both and let user decide.
  Log        : secure-logger.sh context_faithfulness_violation "<topic>"
```

## References

- `core/rules/verification.md` — evidence-first Iron Law (foundation)
- `core/rules/69-cognitive-reliability-law.md` — overconfidence guards
- `core/rules/owasp-llm-output-law.md` — output reliability pipeline
- Research: github.com/KaiserWhoLearns/LLM-KnowledgeConflict-TaskMatters
