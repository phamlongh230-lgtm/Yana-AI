# Yana AI — Direction: Harness Scaling Layer

**Status:** Planned — not yet implemented
**Version target:** v1.9.x
**Created:** 2026-05-27
**Author:** Vũ Văn Tâm + analysis

---

## Tóm tắt

Public brand vẫn là: **Yana AI Agent Auditor — Audit first. Guard later.**

Bên trong architecture, bổ sung **5 lớp Harness Add-on** để lấp đúng 5 lỗ trống hiện tại của harness:
spec discipline, context control, skill routing, memory hygiene, runtime/cost governance.

---

## Full Layer Stack (sau khi thêm)

```
Sovereign Identity Gate
        │
        ▼
L0    Audit                  (đang có — audit-log.sh)
L0.5  Spec Gate              (MỚI)
        │
        ▼
L1    Scope Guard            (đang có — scope-guard.sh)
L1.5  Validate               (đang có — token-scope-guard.sh)
        │
        ▼
L2    Context Governance Gate  (MỚI — thay Commit Gate cũ)
L2.5  Skill Routing Gate       (MỚI)
        │
        ▼
L3    Truth Gate             (đang có — truth-gate-guard.sh)
L3.5  Prompt Injection Guard  (đang có — sovereign-interceptor.js)
L3.8  Memory Hygiene Gate    (MỚI)
        │
        ▼
L4    Runtime & Cost Gate    (MỚI — thay Deploy Gate cũ)
L4.5  Supply Chain Guard     (đang có — 44-supply-chain-vetting)
        │
        ▼
L5    Destructive Guard      (đang có — guard-destructive.sh)
```

---

## 5 lớp mới — mô tả ngắn

### L0.5 — Spec Gate

**Vấn đề:** Agent sửa code khi chưa có spec rõ ràng → scope drift, thiếu acceptance criteria.

**Mục tiêu:** Không cho agent implement nếu task thiếu goal / scope / acceptance criteria / test plan.

**Findings sẽ emit:**
- `[HIGH] Task has no acceptance criteria`
- `[HIGH] PR generated without test plan`
- `[MED] Task has no rollback note`

**Files cần tạo:**
```
.yana-ai/policies/spec-gate.md
.yana-ai/schemas/spec.schema.json
.yana-ai/templates/task-spec.md
```

**Priority:** NOW (giúp Auditor khác biệt ngay)

---

### L2 — Context Governance Gate

**Vấn đề:** Agent load cả repo, cả docs, cả reference labs → cháy token, context bẩn, secrets lọt vào context.

**Mục tiêu:** Giới hạn những gì agent được phép đọc vào context theo scope task.

**Findings sẽ emit:**
- `[HIGH] Prompt includes .env-like content`
- `[MED] Agent command loads entire docs/ instead of scoped context pack`
- `[MED] Skill loading policy missing`

**Files cần tạo:**
```
.yana-ai/policies/context-governance.md
.yana-ai/context-packs/README.md
.yana-ai/scanner/context-risk-checks.yml
```

**Priority:** NOW (giúp Auditor khác biệt ngay)

---

### L2.5 — Skill Routing Gate

**Vấn đề:** Task nhỏ load toàn bộ skills → token waste, wrong tool path.

**Mục tiêu:** Map task type → skill set tối thiểu cần thiết.

**Routing matrix:**
```
task nhỏ        → no skill hoặc 1 skill
CI failure      → ci-triage
release         → release-guard + truth-gate
security task   → agent-shield + destructive-guard
docs-only       → no runtime/test-heavy skill
```

**Findings sẽ emit:**
- `[LOW] Too many skills enabled for a docs-only task`
- `[MED] No routing policy for security-related task`
- `[HIGH] Destructive command path has no destructive-guard mapping`

**Files cần tạo:**
```
.yana-ai/policies/skill-routing.md
.yana-ai/indexes/skills-index.json
.yana-ai/scanner/skill-routing-checks.yml
```

**Priority:** LATER (sau Context Governance)

---

### L3.8 — Memory Hygiene Gate

**Vấn đề:** Agent dựa vào decision cũ, stale production rule, handoff không có bằng chứng.

**Mục tiêu:** Kiểm tra memory trước khi agent dùng → từ chối nếu không có ngày/source/evidence.

**Findings sẽ emit:**
- `[MED] Memory decision has no date or source`
- `[HIGH] Agent relies on stale production rule`
- `[MED] Handoff says "fixed" but no verification evidence found`

**Files cần tạo:**
```
.yana-ai/memory/decisions.md
.yana-ai/memory/known-risks.md
.yana-ai/policies/memory-hygiene.md
.yana-ai/scanner/memory-hygiene-checks.yml
```

**Priority:** LATER (khó đo hơn — implement sau cùng)

---

### L4 — Runtime & Cost Gate

**Vấn đề:** Agent chạy quá lâu, sửa quá nhiều files, không có test evidence nhưng claim done.

**Mục tiêu:** Abort nếu lệch khỏi ngưỡng token / diff size / changed files / runtime. Require evidence trước khi done.

**Rules:**
- Task nhỏ sửa > 10 files → warn
- Không có test evidence → không được done
- Token vượt budget → summarize rồi dừng
- Fallback fail → không được claim success

**Findings sẽ emit:**
- `[HIGH] Verification missing for production-related change`
- `[MED] Agent task changed 18 files without scope expansion note`
- `[MED] No token budget policy configured`

**Files cần tạo:**
```
.yana-ai/policies/runtime-cost.md
.yana-ai/schemas/run-log.schema.json
.yana-ai/reports/task-report-template.md
```

**Priority:** NOW (trực tiếp support Auditor output)

---

## Thứ tự implement

```
Phase 1 (v1.9.0):  L0.5 Spec Gate + L2 Context Governance
Phase 2 (v1.9.1):  L4 Runtime & Cost Gate
Phase 3 (v1.9.2):  L2.5 Skill Routing Gate
Phase 4 (v1.9.3):  L3.8 Memory Hygiene Gate
```

---

## Messaging công khai (không thay đổi)

```
Yana AI Agent Auditor
Audit first. Guard later.

Yana AI audits and hardens the harness around AI coding agents.
```

Không quảng bá "12 lớp". Harness Scaling là internal architecture.

---

## Files cần tạo (checklist)

- [ ] `docs/architecture/HARNESS_SCALING_LAYERS.md` — full spec
- [ ] `.yana-ai/schemas/spec.schema.json`
- [ ] `.yana-ai/schemas/run-log.schema.json`
- [ ] `.yana-ai/policies/spec-gate.md`
- [ ] `.yana-ai/policies/context-governance.md`
- [ ] `.yana-ai/policies/skill-routing.md`
- [ ] `.yana-ai/policies/memory-hygiene.md`
- [ ] `.yana-ai/policies/runtime-cost.md`
- [ ] `.yana-ai/templates/task-spec.md`
- [ ] `.yana-ai/context-packs/README.md`
- [ ] `.yana-ai/indexes/skills-index.json`
- [ ] `.yana-ai/memory/decisions.md`
- [ ] `.yana-ai/memory/known-risks.md`
- [ ] `.yana-ai/reports/task-report-template.md`
