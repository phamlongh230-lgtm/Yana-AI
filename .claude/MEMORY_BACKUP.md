# Yana AI — Memory Backup
# Generated: 2026-06-26 | Backup trước khi chuyển máy mới
# Restore: copy file này vào đúng paths và chạy theo hướng dẫn cuối file

---
## PHẦN 1 — .claude/assistant/ (trợ lý điều hành)

### context.md

# Context — Yana AI

## Đang làm
- Repo đã tiến rất xa so với lần context.md cập nhật trước (đó là sau session Hermes 19/06). Từ đó tới giờ có ~40 commit mới: CI fail đã fix xong (PR #14 merged), core-lock sạch, security P0 đã vá, thêm hàng loạt port mới (DGM, penpot, serve-sim, openclaw gateway, 754 skill cybersecurity), Rust port 2 hook, macOS/Apple Silicon compat (12 file — đã commit ở b7d5d212, không còn "uncommitted" nữa).
- **Semantic router — review xong (22/06), có số liệu thật, chưa quyết định tích hợp.** Đọc hết 9/9 file trong `docs/files.zip` (design doc, INTEGRATION.md, 4 file Rust, run_eval.py, verify_logic.py, dataset.jsonl). Chạy thật trong /tmp sandbox (không đụng repo):
  - `verify_logic.py` (port thuật toán Rust → Python để verify độc lập cargo test): **12/12 test pass** (parse frontmatter, cosine similarity, binary roundtrip YSK1, bad-magic rejection).
  - `run_eval.py` chạy baseline thật trên `core/skills` (4195 skill) + `dataset.jsonl` (40 mẫu, đã verify 4 mẫu ngẫu nhiên khớp skill thật trong repo): **top1 all=60.0%, en=75.0%, vi=45.0%, MRR=0.696**. Đối chiếu logic tokenize/scoring trong file khớp 1:1 với `findBestSkill` thật ở `tools/yana-web/lib/skills.js`.
  - Kết luận: premise đúng — router regex hiện tại kém tiếng Việt thật (lệch 30 điểm top1), không phải lo ngại lý thuyết. Thiết kế có kỷ luật đo-trước-claim-sau, đúng "stable before powerful".
  - **Đã compile + test thật 4 file Rust** trong project Cargo riêng ở /tmp (offline, dùng crate cache sẵn từ yana-rt: clap 4/serde 1/serde_json 1/anyhow 1/walkdir 2, không bật feature fastembed/sidecar để tránh tải model qua mạng): `cargo build --offline` sạch 0 lỗi (7 warning cosmetic do cfg feature chưa khai báo), `cargo test --offline` **8/8 test pass thật**. Chưa kiểm được nhánh fastembed thật (cần tải model 130MB qua mạng — chưa làm, cần anh cho phép network egress).
  - Đã báo kết quả đầy đủ cho anh trong chat 22/06. Còn thiếu: quyết định cuối có tích hợp vào repo chính hay không.

## openclaw `src/sessions/` port — 10/10 module portable đã xong (22/06)
**Việc:** Port "lõi" openclaw — anh xác nhận muốn lấy thêm core algorithmic modules (giống cách đã làm với 49eaea7c + d9885ffb), không phải port toàn bộ 1.5GB. Subsystem: `src/sessions/` (24 file, pin commit `e2c567538d8964ab594f63ea3121ee72149f273d`).
**Đã port + commit (2 commit, chưa push):**
- `74e2a691` — `string_coerce.py` (4 hàm), `session_key_case_preservation.py` + `session_key_utils.py` (tách từ `session-key-utils.ts` 353 dòng vì vượt hard-limit 300 dòng/file). 48 test mới (12+36).
- `e1ed5821` — 9 module còn lại: `classify_session_kind.py`, `session_id.py`, `session_label.py`, `session_chat_type_shared.py`, `session_lifecycle_events.py`, `transcript_events.py`, `session_id_resolution.py` (+ `session_routing_key.py` và `number_coercion.as_positive_safe_integer` là 2 dependency phụ phát hiện ra trong lúc port), `input_provenance.py`, `model_overrides.py`. 113 test mới.
- Tổng: **365/365 test pass** (toàn repo). Test của mọi module có file `.test.ts` gốc (session-id, session-lifecycle-events, transcript-events, session-id-resolution, input-provenance, model-overrides) đều dịch 1:1 từ test gốc, không tự bịa case.
- `model_overrides.py` có ngoại lệ có chủ đích với golden principle #1 (immutability) — `entry` bị mutate in-place, vì đó đúng là contract thật của API gốc (cả 2 hàm chỉ trả `{updated: bool}`). Đã ghi rõ lý do trong docstring.
- Đã vendor toàn bộ `.ts` gốc đã port vào `vendor/openclaw/_upstream/sessions/` + `vendor/openclaw/_upstream/routing/session-key.ts` (cho `to_agent_request_session_key`).
**KHÔNG portable nguyên vẹn (loại khỏi scope, không phải "chưa làm"):** `session-chat-type.ts` (phần `deriveSessionChatType` phụ thuộc plugin registry `bootstrap-registry.js`), `send-policy.ts` (phụ thuộc `normalizeChatType` + `deriveSessionChatType` plugin-coupled).
**`user-turn-transcript.ts` (634 dòng) — đã đọc xong, port PARTIAL có chủ đích (đã hỏi + được duyệt 22/06):**
- Đã port `user_turn_transcript.py`: `resolve_persisted_user_turn_text`, `build_persisted_user_turn_media_inputs_from_fields` (+ helper riêng), `build_persisted_user_turn_message`, `merge_prepared_user_turn_message_for_runtime`, `prepare_persisted_user_turn_message_for_transcript_write`. Mime-type lookup (`@openclaw/media-core/mime`, package ngoài, chưa vendor) thay bằng Python stdlib `mimetypes.guess_type` — đã verify khớp kết quả với mọi case test gốc dùng tới (.png/.pdf/.bin/scheme "media://").
- KHÔNG port (I/O thật qua `persistSessionTranscriptTurn`, session-store nặng chưa port — giống lý do loại session-chat-type.ts): `appendUserTurnTranscriptMessage`, `persistUserTurnTranscript`, `appendFileTargetUserTurnTranscript`, `createUserTurnTranscriptRecorder`.
- `level-overrides.ts` — hóa ra portable thật (không nặng như tưởng): đã port `level_overrides.py` (`parse_verbose_override`/`apply_verbose_override`/`parse_trace_override`/`apply_trace_override` + `normalize_verbose_level`/`normalize_trace_level` lấy trực tiếp từ `auto-reply/thinking.shared.ts`, không cần port cả `thinking.ts` 376 dòng vốn kéo theo model-catalog-core không liên quan).
- 26 test mới (14 dịch 1:1 từ 3/7 describe block portable trong `user-turn-transcript.test.ts`, 12 tự viết cho `level-overrides.ts` vì không có `.test.ts` gốc).
**Tổng cộng subsystem `src/sessions/` coi như xong** (10 module batch đầu + 2 module batch này = tất cả phần portable đã port). Đã vendor đủ `.ts` gốc (`vendor/openclaw/_upstream/sessions/` 13 file + `vendor/openclaw/_upstream/auto-reply/thinking.shared.ts`).
**Trạng thái repo thật:** PR #15 đã merge (`adc38542`, 22/06). `main` local đã pull/rebase và push đồng bộ với `origin/main` (`d88968a2`) — xác nhận khớp hash 2 bên. `/tmp/openclaw_sessions_fetch/` vẫn còn cache toàn bộ file `.ts` đã fetch (có thể xóa, không còn cần).

## README đa ngôn ngữ (22/06)
Đã thêm `README.ko.md` — bản dịch tiếng Hàn đầy đủ của `README.md` (kể cả label sơ đồ Mermaid), theo đúng convention của `README.vi.md`. Đã thêm link 🇰🇷 vào language switcher của `README.md` và `README.vi.md`. Commit `d88968a2`, đã push lên main (anh tự push, không qua PR — không có branch protection thật trên GitHub, chỉ là tool-proxy-enforcer chặn agent tự push).
**Nếu muốn lấy thêm từ openclaw sau session này:** subsystem `src/sessions/` đã xong, cần anh chỉ tên subsystem tiếp theo (ví dụ session-memory-and-context-engine đã từng nhắc tới nhưng chưa chọn).

## 3 file zip vet-repo — đã vet xong (22/06)
Giải nén cả 3 trong sandbox `/tmp/zip_vet/` (không đụng repo chính), đọc LICENSE + cấu trúc:
- **OpenMontage-main.zip** (24MB) — ❌ loại, **AGPL-3.0** không tương thích Apache-2.0 của Yana AI. Domain (video production agentic) cũng không liên quan. Không port gì.
- **adr/openpilot-master.zip** (comma.ai) — License MIT OK, nhưng domain (OS xe tự lái, CAN bus, cảm biến) lệch hẳn khỏi Yana AI. `common/` có vài thuật toán thuần (simple_kalman.py, pid.py) nhưng không có use case nào cần — quyết định: **không port**, trừ khi anh có ý cụ thể.
- **spec-kit-main.zip** (GitHub chính thức, MIT) — ✅ port `workflows/expressions.py` — sandboxed expression evaluator (Jinja2 subset an toàn cho YAML workflow, không I/O/import/exec tùy ý). Đã port xong commit `a1233d66`: 3 file (`core/lib/spec_kit_adapted/{expressions,expression_matchers,expression_filters}.py`, tách vì file gốc ~130 dòng/hàm vượt hard-limit 50 dòng + `_filter_map` gốc 5 lớp nesting vượt hard-limit 3), vendor gốc ở `vendor/spec-kit/_upstream/`. 33 test mới (24 dịch 1:1 từ `TestExpressions` gốc + 9 fuzz/boundary tự viết theo fuzz-testing-constraints.md). 424/424 test pass, core-lock sạch. **Chưa push** — local main đang ahead origin (cần pull/rebase + push giống lần README tiếng Hàn). `templates/` của spec-kit (spec-template.md, plan-template.md...) còn có thể tham khảo cải thiện agent `spec-planner` hiện có — đây là quyết định thiết kế, chưa làm, cần anh quyết riêng nếu muốn.
`/tmp/zip_vet/` vẫn còn cache cả 3 repo đã giải nén.

## Ưu tiên tiếp theo
1. **Push commit `a1233d66`** (spec-kit expressions port) lên origin/main — local đang ahead, cần pull/rebase trước (như lần README tiếng Hàn).
2. **Semantic router** — đã review + compile + test xong, số liệu thật đã có (xem mục "Đang làm"). Còn chờ anh quyết định: tích hợp vào repo chính hay không, và có cho thử nhánh fastembed thật (tải model qua mạng) hay không.
3. **openclaw — đã port một phần** (9 module gateway rate-limit/health/sanitize, d9885ffb) + toàn bộ `src/sessions/`. Nếu muốn lấy thêm từ openclaw (subsystem khác như session-memory-and-context-engine) thì vẫn cần anh chỉ tên subsystem cụ thể trước.
4. `hermes-tool-guardrails` SKILL.md — vẫn chưa sửa mô tả sai (ghi command-allowlist nhưng code thật `agent/tool_guardrails.py` là loop-detection, khớp `hermes-tool-loop-guard`). Để session sau review riêng, không quan trọng/khẩn.

## Việc đã đóng (không cần nhắc lại)
- CI fail skill-count drift (3531 vs 3530) → đã fix, PR #14 merged (3f5db67c).
- Core-lock drift 4 file core/scripts (audit_scanner.py, ci_check.py, doctor.py, install_project.py) → đã review + regenerate, hiện verify-core-lock.sh báo sạch (220 ok, 0 drift, generated 2026-06-22T04:43).
- macOS/Apple Silicon compat cho 12 hook/script → đã commit (b7d5d212), test lại trên Linux không hồi quy.
- Security P0 identity-gate bypass + 4 audit finding khác → đã vá (24d0aa3f, 21/06).
- Hermes core (context-compressor, tool-guardrails, system-prompt, memory-manager, scrubber, conversation-loop) → port xong, 65 test pass.
- ECC (affaan-m) → xác nhận không có lõi tính toán để lấy, chỉ là thư viện skill — đóng, không cần làm gì thêm.
- 4 skill ECC (competitive analysis pipeline + brand discovery) đã import (ae125b77).
- mukul975/Anthropic-Cybersecurity-Skills (754 skill, Apache-2.0) → đã import (405f1897), không còn "để sau" nữa.
- DGM (jennyzzt/dgm) → đã port archive selection, patch filtering, tool output formatting (f0dced66).
- penpot → đã port color-conversion + path-name utils (2cc29f0e).
- serve-sim (EvanBacon) → đã port 4 utility nhỏ (a469e735).

## Repo ứng viên còn chưa động tới (license đã vet sẵn từ trước, vẫn hợp lệ)
| Repo | License | Trạng thái |
|---|---|---|
| `MervinPraison/PraisonAI` | MIT | Chưa lấy gì |
| `metauto-ai/GPTSwarm` | MIT | Chưa lấy gì |
| `xvirobotics/metabot` | MIT | Tham khảo design (kiến trúc giống Yana-AI), không copy code |
| `oliveirabruno01/babyagi-asi` | MIT | Chưa lấy gì |
| `mindsdb/anton` | MIT | Chưa lấy gì |
| `facebookresearch/HyperAgents` | CC BY-NC-SA 4.0 | ❌ loại — NC/SA không tương thích |
| `peterskoett/self-improving-agent` | Không có LICENSE | ❌ loại |

## Blockers
- Không có blocker an toàn/license đang chặn nào lúc này. Việc treo là do hết quota giữa session (semantic router review) và do anh chưa chốt quyết định (4 zip vet-repo, subsystem nào của openclaw lấy tiếp).


### memory.md

# Memory log — Yana AI assistant

## 2026-06-22 — macOS/ARM compat fixes (uncommitted) + semantic router design dropped in, hết quota giữa session

**Đã làm:**
- Audit + fix 12 file cho macOS/Apple Silicon (anh sắp đổi máy): sandbox-exec.sh, swarm-orchestrator.sh (ID generation dùng date+%N/md5sum kiểu GNU), decay-memory.sh + migrate-agent-identity.sh (sed -i không có suffix arg, vỡ trên BSD sed), và 8 file dùng cứng sha256sum (không có sẵn trên macOS, cần shasum -a 256): secure-logger.sh, update/verify-core-lock.sh, verify-audit-chain.sh, update/verify-skills-lock.sh, core/hooks/audit-log.sh + .claude/hooks/audit-log.sh (bản live copy). Tất cả đã test lại trên Linux — không hồi quy.
- Phát hiện phụ: .claude/state/audit-chain.log có 1 chain break từ trước (entry seq 42, 2026-06-18) — xác nhận bằng git stash là lỗi data cũ, không phải do session này gây ra. Chưa xử lý, để session sau.
- 3 file zip ngoài (docs/OpenMontage-main.zip, docs/adr/openpilot-master.zip, docs/spec-kit-main.zip) — anh xác nhận mục đích là vet/port giống pattern DGM/openclaw — CHƯA làm gì, chỉ list nội dung, chưa giải nén/đọc license.
- docs/files.zip (xuất hiện sau, 04:31) — KHÁC LOẠI: là design doc + draft code thật của anh (SEMANTIC_ROUTER_DESIGN.md, INTEGRATION.md, dataset.jsonl, run_eval.py, verify_logic.py, mod.rs/embed.rs/index.rs/store.rs) — đề xuất thay router skill-matching hiện tại (token-match tên folder, mù tiếng Việt — đã verify đúng 1:1 với code thật trong tools/yana-web/lib/skills.js findBestSkill) bằng semantic embedding (fastembed-rs bge-small, local-only, flat-file, brute-force cosine, 3 giai đoạn có gate). Đã đọc xong design doc + INTEGRATION.md + 4 file Rust — thiết kế kỷ luật, tự nhận rủi ro chưa verify được (Rust chưa compile thử), khớp đúng ROADMAP "stable before powerful". Đang đọc run_eval.py/verify_logic.py/dataset.jsonl khi hết quota — CHƯA xong review, CHƯA viết feedback, CHƯA động code thật trong repo.

**Anh nói / quyết định:**
- Chọn "review kỹ design doc trước, chưa đụng code" cho semantic router (qua AskUserQuestion)
- Hết quota giữa lúc đang đọc 3 file cuối — dừng ngay theo yêu cầu

**Trạng thái cuối:** 12 file core/scripts + core/hooks + .claude/hooks đã sửa, CHƯA commit, CHƯA chạy update-core-lock.sh (core-lock báo đúng 11 drift — như kỳ vọng, cần anh review diff trước khi regenerate theo rule 67). Việc tiếp theo khi quay lại: (1) anh review diff 12 file mac-fix → chạy update-core-lock.sh, (2) tiếp tục đọc 3 file còn lại của semantic-router rồi cho feedback, (3) quyết định xử lý 3 zip vet repo.

## 2026-06-26 — self-mod guard + tdd-evidence skill, pushed

**Đã làm:**
- `yana-rt guard self-mod` (commit `88170c62`): Rust guard mới, block Write/Edit/str_replace vào safety surface (core/rules/, gates/, .claude-plugin/hooks/hooks.json, src/guard/). Closes gap blast_radius không cover: single-file write tool bypass. 17/17 test pass. Wired vào PreToolUse hook stack đầu tiên.
- `tdd-evidence` skill (commit `1cac3efc`): port từ docs/SKILL.md của anh. Triggers không overlap skill `tdd`: yana-rt evidence run, signed receipt, viết test trước, YANA-EVIDENCE. 678/678 trigger test pass. Skill count: 1981.
- Cả 2 đã push lên origin/main.

**Anh nói / quyết định:**
- docs/files (4).zip = fire cần port ngay → self-mod guard
- docs/SKILL.md (tdd) → skill riêng `tdd-evidence`, không fold vào `tdd`

**Trạng thái cuối:** v0.42.1 · main sync với origin · docs/files.zip + (1)(2)(3).zip chưa vet · semantic router decision pending

## 2026-06-19 — khởi tạo bộ nhớ trợ lý + lên kế hoạch nhập lõi Hermes/ECC/OpenClaw

**Đã làm:**
- Chạy idea-loop lần đầu, phát hiện CI fail do skill count drift (3531 vs 3530)
- Soát 3 repo ngoài theo yêu cầu anh Tâm: hermes-agent (MIT), ECC của affaan-m (MIT, không phải crypto), openclaw (license "Other")
- Xác nhận repo đã có 9 skill tóm tắt từ hermes-agent với attribution đúng — chưa có code lõi thật

**Anh nói / quyết định:**
- Muốn tích hợp code lõi thật (không phải bản tóm tắt) từ 3 repo trên vào hệ thống, bỏ phần giới thiệu, qua đủ 9 lớp gate để lọc rác — khác cách làm trước (trước "thấy gì lấy gì", giờ là tích hợp lõi đầy đủ)
- Yêu cầu lưu lại để làm tiếp ngay (không phải để dành session sau)

**Trạng thái cuối:** v0.42.0 · CI đang fail (manifest drift) · chưa có code lõi Hermes/ECC/OpenClaw trong repo, chỉ có skill tóm tắt · việc tích hợp cần session coding thật (ngoài quyền idea-loop assistant)


---
## PHẦN 2 — Claude Code auto-memory (MEMORY.md index)

- [External tools integration (LM Studio/Qdrant/Lenis/Fabric)](project_external_tools_integration.md) — LM Studio + Lenis + Qdrant (incl. docker-compose, live-tested) all done, uncommitted; Fabric skill-picks deliberately skipped
- [Hermes integration paused at Phase 0](project_hermes_integration_paused.md) — plan at ~/.claude/plans/squishy-stirring-cookie.md, resume at Phase 1
- [Quota pacing](feedback_quota_pacing.md) — checkpoint state proactively on long sessions, don't wait to be told
- [2026-06-21 security audit + fixes](project_yana_ai_security_audit_2026-06-21.md) — P0 identity-gate bypass fixed; core/ vs .claude/ hook drift is a recurring footgun; push-to-main has no bypass by design
- [Tâm's working style (ENFP-T)](user_tam_profile.md) — big-picture thinker, tends to expand scope mid-task
- [Scope expansion guard](feedback_scope_expansion_guard.md) — flag it when anh adds new work mid-task instead of silently complying
- [Multi-agent is the default mode](feedback_multi_agent_default.md) — confirmed 2026-06-04, not single-agent fallback
- [Subagent spawn limit](feedback_agent_spawn_limit.md) — max 3 by default, 5 only with explicit permission
- [No auto strix-scan](feedback_no_auto_strix_scan.md) — never proactively suggest/run it, burns Opus quota fast
- [YAMTAM → Yana AI history](project_jnmt_yamtam_overview.md) — product rename, JNMT client-project boundaries, Railway deploy
- [Pixel office bridge](project_pixel_office_bridge.md) — in-progress: visualize subagent dispatch as pixel-art office (yana-pixel-bridge)
- [GitHub owner rename](project_yana_ai_github_rename.md) — phamlongh230-lgtm → yanacuti1121; link-fix work in progress
- [YAMTAM GitHub App deploy](reference_yamtam_github_app_deploy.md) — renamed to yana-github-app 2026-06-24; docs/ is also live Worker assets dir, never put secrets there
- [Repo tooling gotchas](feedback_repo_tooling_gotchas.md) — commit heredocs get blocked (use git commit -F), core/skills/ must be flat (no nested namespace dirs)
- [Persist learnings immediately](feedback_persist_learnings.md) — write to permanent memory the moment something is learned, don't defer to wrap-up
- [Skill bloat cleanup 2026-06-25](project_skill_bloat_cleanup_2026-06-25.md) — cut 2220 unused vendor-bulk skills (4200→1980), committed 39ae036c, anh pushes himself
- [Skill integration policy ("phase 4")](feedback_skill_integration_policy.md) — fold new repo findings into existing skills by default, only new SKILL.md if important
- [ruflo port — done](project_ruflo_port_in_progress.md) — 128 tests, 614/614 pass, committed 2f540173 — now confirmed pushed (origin/main in sync 25/06)
- [openclaw context-pruning port — WIP](project_openclaw_context_pruning_port_wip.md) — 3/6 files ported (no tests yet), stopped for quota 25/06, committed local 1979d544 not pushed
- [Local AI direction](project_local_ai_direction.md) — tính phát triển Yana AI + local 70B+ models, hướng chưa chốt (privacy/cost/offline), LM Studio đã có sẵn


---
## PHẦN 3 — Các memory file riêng lẻ

### feedback_agent_spawn_limit.md

---
name: feedback-agent-spawn-limit
description: Max 3 subagents per the existing rule by default; up to 5 only with explicit permission
metadata: 
  node_type: memory
  type: feedback
  originSessionId: a0fc0105-f578-486f-8e84-af9438c03459
---

Default to at most 3 concurrent/total subagent spawns in a session (matches
the repo's own `agent-excessive-agency-law.md` depth cap). If a task seems to
need more than 3, ask anh before going beyond — never silently spawn up to
the hard cap of 5.

**Why:** anh set this explicitly (2026-06-18) while reviewing the Pixel
Office work: "chỉ cho phép tối đa 5 agents nhưng phải xin phép, còn bình
thường tối đa 3 theo luật sẵn" — confirms the existing rule's default (3)
should hold, with 5 as an upper bound that always requires a check-in, not a
silent escalation.

**How to apply:** before spawning a 4th+ subagent in one task/session,
stop and ask, even if the work would clearly benefit from more parallelism.


### feedback_multi_agent_default.md

---
name: feedback-multi-agent-default
description: "As of 2026-06-04, anh Tâm confirmed multi-agent/parallel decomposition is the default mode, not single-agent"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: a0fc0105-f578-486f-8e84-af9438c03459
---

Default mode is multi-agent: decompose tasks and run parallel agents. Single-agent is the fallback, not the default.

**Why:** Confirmed preference as of 2026-06-04 — anh wants parallel decomposition by default for throughput.

**How to apply:** Use single-agent only when:
- Token budget ≤ 10% of session limit
- Task is genuinely atomic (edit 1 line, change 1 variable)
- Hard dependency exists (A must finish before B can even start)

Otherwise, default to decomposing into parallel agents.

Recovered 2026-06-18 from a crashed Codespace session on another project (yamtam-engine). ~2 weeks stale — confirm still current if it resurfaces, but this reads as a general workflow preference, not project-specific.


### feedback_no_auto_strix_scan.md

---
name: feedback-no-auto-strix-scan
description: Never proactively suggest or run strix-scan.sh — it burns Opus API quota fast
metadata: 
  node_type: memory
  type: feedback
  originSessionId: a0fc0105-f578-486f-8e84-af9438c03459
---

Do not proactively suggest or run `strix-scan.sh` (or any loop calling `claude -p`) unless anh Tâm explicitly asks for it.

**Why:** Each scan layer is a separate Opus API call — 5 layers means 5 calls, which burns through quota very quickly. Suggesting "hay mình chạy strix xem?" as a casual workflow step is expensive and unwanted.

**How to apply:** Only run strix when explicitly requested by name. Don't mention it as a suggestion during normal workflow.

Recovered 2026-06-18 from a crashed Codespace session on another project (yamtam-engine, has `strix-scan.sh` doing chunked L1–L5 audits at ~50-80K tokens/call). The underlying preference (don't burn quota on unsolicited expensive scans) likely generalizes beyond that specific script.


### feedback_persist_learnings.md

---
name: feedback-persist-learnings
description: "Whenever something is learned during a session, write it to permanent memory immediately — don't wait to be asked."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 1c4ca94c-6b47-406f-9e8f-6e9efbc1cb63
---

Anh Tâm: "mọi lần học được đều [phải ghi] vô bộ nhớ vĩnh viễn" — every time something is learned during work, persist it to permanent (L1-style) memory right away, not just left in session context.

**Why:** Session context is ephemeral; anything not written down is lost the moment the session ends or compacts. This came up right after a Hermes `error_classifier.py` port where the upstream pattern itself is "learn a lesson once, apply it for the rest of the *session*" — anh's comment generalizes that instinct to my own working memory too.

**How to apply:** Don't wait for an explicit "remember this" instruction. When a session surfaces a non-obvious fact, decision, root cause, or constraint (the things [[memory-persistence-law]] in core/rules already says must be persisted), write it to memory proactively, in the moment, not deferred to a wrap-up step. Pairs with [[feedback_quota_pacing]] (checkpoint proactively, don't wait to be told).


### feedback_quota_pacing.md

---
name: feedback-quota-pacing
description: "User's sessions on Yana-AI repo repeatedly get cut short by quota exhaustion — checkpoint state proactively, don't wait to be told"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: b2420d58-bf93-40a9-83e1-311e732eb892
---

This session was a continuation of one cut short by quota exhaustion the
previous night, and ended the same way again ("lưu lại đã gần hết quota" —
save it, quota almost out).

**Why:** quota running out is recurring, not a one-off — the user works in
long sessions on this repo and the cutoff arrives without much warning.

**How to apply:** Don't wait for an explicit "save" request before
persisting state on long/deep tasks (multi-phase plans, multi-commit work).
When a task is genuinely multi-session in scope (e.g. a phased plan), write
the L1 fact / plan-location pointer as soon as the phase boundary is
reached, not only when told quota is low — by the time the user says it,
there may be very little turn budget left to actually do the save
correctly. Keep checkpoints terse (commit message + one L1 fact pointing
at the plan file is enough — don't try to write a full recap when budget is
already tight).


### feedback_repo_tooling_gotchas.md

---
name: feedback-repo-tooling-gotchas
description: "Two recurring Yana AI repo gotchas found 2026-06-24 — commit heredoc gets blocked, and core/skills/ skills must be flat (no nested namespace dirs)"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 8eacd831-7cfd-409e-9122-71073b95f40b
---

**1. `git commit -m "$(cat <<'EOF' ... EOF)"` gets blocked in this repo.**
The repo's `tool-proxy-enforcer` hook flags any `$()`/backtick/`<()` pattern as
"subshell injection" regardless of context — including the standard heredoc
pattern normally used for multi-line commit messages. It also blocks the same
pattern inside ordinary `echo`/inline shell, e.g. `echo "done ($(git status...))"`.
**Why:** the repo's `anti-evasion-law.md` pattern-matches command substitution
unconditionally as a security gate, with no exception for benign uses.
**How to apply:** in this repo, write the commit message to a scratchpad file with
the `Write` tool and run `git commit -F <file>` instead. Same for any other
multi-line shell construction that would normally use `$(...)` — write to a file
and reference it, or use a literal value instead of a subshell.

**2. `core/skills/` skill loader is single-level only — nested namespace
directories make skills permanently unreachable.**
`tools/yana-web/lib/skills.js` / `core.js` resolve `skillsDir` to `core/skills` and
call `fs.readdirSync(SKILLS_DIR, {withFileTypes:true})` with **no recursion** —
it only ever looks for `core/skills/<name>/SKILL.md`, one level deep.
`core/scripts/gen_skills_page.py`'s `collect_skills()` has the identical
single-level `SKILLS_DIR.iterdir()` bug. Found 2026-06-24: `core/skills/gitnexus/`
held 7 real, well-written skills nested one level too deep
(`core/skills/gitnexus/gitnexus-cli/SKILL.md`) — 100% unreachable by both the
real product loader and the public skills page despite being good content.
Separately, `core/skills/.stubs/` held 88 *actual* junk skills (uniform 11-line
auto-import template, same `date_added`, truncated descriptions) using the same
nesting pattern — already as inert as the gitnexus ones, but for content-quality
reasons rather than just structural ones.
**How to apply:** when importing/porting a batch of skills, never create a
sub-namespace directory under `core/skills/<x>/<y>/SKILL.md` — always put each
skill directly at `core/skills/<skill-name>/SKILL.md`. Before declaring a bulk
skill-import "done," diff `find core/skills -maxdepth 1 -mindepth 1 -type d | wc -l`
against `find core/skills -maxdepth 2 -name SKILL.md | wc -l` — any gap means
something is nested wrong (gitnexus-shaped, fix by flattening) or empty
(.stubs-shaped, candidate for removal) and needs eyes-on before assuming the
skill is actually live.


### feedback_scope_expansion_guard.md

---
name: feedback-scope-expansion-guard
description: Stop and flag when anh Tâm expands scope mid-task instead of silently following along
metadata: 
  node_type: memory
  type: feedback
  originSessionId: a0fc0105-f578-486f-8e84-af9438c03459
---

When anh starts adding a new idea/feature ("à mà còn cái này nữa") while the current task isn't done/committed yet, push back immediately rather than just doing it.

**Why:** Anh Tâm is ENFP-T — sees big picture fast but drifts scope mid-session without noticing (see [[user-tam-profile]]). Silently complying enables the drift instead of helping.

**How to apply:**
- Task not finished + anh adds new work → ask: "Hiện còn X chưa xong — anh muốn finish X trước không?"
- If anh jumps to ≥2 different directions in one session → name it explicitly: "Scope đang mở rộng, em cần anh chọn 1 việc làm trước."
- Never silently comply with scope creep — that's enabling, not helping.

Recovered 2026-06-18 from a crashed Codespace session on another project (yamtam-engine). ~2 weeks stale — but this is a general collaboration preference, likely still valid regardless of project.


### feedback_skill_integration_policy.md

---
name: feedback-skill-integration-policy
description: "When vetting/porting an external repo, fold findings into an existing skill by default — only create a brand-new SKILL.md when the content is important enough to stand alone. Anh calls this \"giai đoạn 4\" (phase 4)."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 1c4ca94c-6b47-406f-9e8f-6e9efbc1cb63
---

Anh Tâm, 2026-06-25 (right after the 4200→1980 skill bloat cleanup): "từ giờ
những repo anh gửi mà nó có thể tích hợp vào skill cũ thì làm vậy, trừ khi nó
quan trọng mới tách ra thành skill riêng — làm vậy sẽ gọn hơn rất nhiều."

**Why:** Same root cause as [[project_skill_bloat_cleanup_2026-06-25]] — most
of the 2220 cut skills existed because bulk imports defaulted to "one new
skill file per item" instead of checking for an existing home first. Anh is
naming the preventive policy so it doesn't recur.

**How to apply:** Before creating a new SKILL.md from a vetted external
repo's pattern, check [[rule-consistency-policy]] (core/rules) for an
existing skill covering the same ground and extend it instead. Only create a
new standalone skill when the pattern is significant/novel enough to
warrant its own trigger surface. This does NOT apply to `core/lib/*_adapted/`
code ports (Hermes, ruflo, etc.) — those are executable library code, not
skill documentation; the policy is specifically about the SKILL.md layer.


### project_external_tools_integration.md

---
name: project-external-tools-integration
description: "Pending work to add LM Studio provider, Qdrant vector memory, and Lenis/Fabric to tools/yana-web — exact next steps and what's already done vs not"
metadata: 
  node_type: memory
  type: project
  originSessionId: 1f13d412-4a3b-464a-a4b9-97b7a4ea8ca7
---

User pasted a list of 16 external AI/dev tools (Kun, DeepSeek, MiniMax-M2.7, Continue,
Deer-Flow, video-use, Fabric, gstack, AirLLM, Heretic, Qdrant, Upscayl, TriliumNext,
Homepage, Insomnia, Temporal, Lenis, Cherry Studio, LM Studio, Ollama) and asked to
integrate them "for real" into Yana-AI. After research, most have no code integration
point (standalone desktop apps unrelated to the codebase — Kun, Upscayl, Cherry Studio,
Insomnia, Continue, TriliumNext, DeepSeek web/homepage). **Heretic explicitly excluded**
— it strips LLM safety/refusal behavior, directly conflicts with this repo's OWASP-style
security rules; do not implement even if asked again without flagging the conflict.

**Already implemented before this task started (do NOT redo):** Ollama and DeepSeek are
both fully wired as chat providers in `tools/yana-web` — backend `PROVIDERS` table in
server.js, desktop/chat.jsx, desktop/system.jsx setup instructions, mobile/m-chat.jsx.
Confirmed by reading the code directly, not from memory of an earlier (incorrect) verbal
summary that said they "could be added" — that summary was wrong, corrected with the user.

**Real remaining work, 3 tracks, each researched by a read-only subagent (per this repo's
subagent-policy.md — subagents return reports, main agent applies edits):**

## Track 1 — LM Studio provider (small, ready to implement directly)

Mirrors the existing `ollama` provider exactly (OpenAI-compatible local server, keyless,
loopback), just port 1234 instead of 11434, and no fixed default model (user must type
whatever model is loaded in the LM Studio app — used `"local-model"` as the placeholder
default). Full agent report with exact line numbers + exact code to insert is in this
session's transcript; the diffs needed:

- `tools/yana-web/server.js`: add `lmstudio:` block to `PROVIDERS` (after `ollama:`,
  before `gemini:`, ~line 189) mirroring ollama's shape exactly (port 1234, keyless,
  local, defaultModel `'local-model'`). Also add a matching `lmstudio:` entry to the
  `/api/models` listing table (after the `ollama:` entry there, ~line 740).
- `tools/yana-web/desktop/chat.jsx`: add `lmstudio: "local-model"` to the default-model
  map (~line 254), `lmstudio: ["local-model"]` to MODEL_CHOICES (~line 274), add
  `"lmstudio"` to `CHAT_LIVE_MODELS` Set (line 276) and `KEYLESS_PROVIDERS` Set (line 35).
- `tools/yana-web/desktop/system.jsx`: add `lmstudio:` entry to `PROVIDER_SETUP` object
  (~line 18, url: lmstudio.ai/download, cmd: "Open LM Studio → Developer tab", cmd2:
  "Start server (port 1234), load a model"), add `"lmstudio"` to `LIVE_MODEL_PROVIDERS`
  Set (line 8), add `|| p.id === "lmstudio"` to the `isLocal` check (~line 110).
- `tools/yana-web/mobile/m-chat.jsx`: add `lmstudio: "local-model"` to M_CHAT_MODELS map
  (~line 12), `"lmstudio"` to `M_KEYLESS` Set (line 14), a catalog entry to
  `M_MODEL_CATALOG` (~line 60), `"lmstudio"` to `M_LIVE_PROVIDERS` Set (~line 202), and
  `&& id !== "lmstudio"` to the keyless check (~line 377).
- `desktop/cron.jsx` / `mobile/m-cron.jsx`: leave untouched — their provider list doesn't
  even include "ollama", so adding lmstudio there would be scope creep beyond parity.
- system.jsx may have a separate `ProviderCard`-style array elsewhere not covered by the
  agent's read window — verify before considering this track fully done.

## Track 2 — Qdrant vector memory (needs human sign-off before coding — touches 5 files)

Per golden-principles.md rule #9 (no coding without design for 3+ file changes), this is
a DESIGN ONLY, not yet approved for implementation. Full design:

- Integration point: `tools/yana-web/memory.js` (flat JSON store at `.yana/memory.json`,
  capped/TTL-pruned/dedupe'd, feeds `contextBlock()` into the system prompt) — NOT
  `core/memory/` (that's agent-orchestration audit/trust state, unrelated, confirmed
  out of scope).
- Augment, don't replace: Qdrant adds semantic search alongside the existing JSON file,
  which stays the source of truth so the feature has zero new hard runtime dependency
  (yana-web currently has ZERO npm dependencies — confirmed).
- Embeddings: reuse local Ollama (`POST http://127.0.0.1:11434/api/embeddings`, model
  `nomic-embed-text`) — no new cloud dependency, consistent with rule 68 SOVEREIGN tier.
- New files: `tools/yana-web/qdrant-client.js` (upsertMemory/searchSimilar/deleteMemory/
  isAvailable), `tools/yana-web/embeddings.js` (embed(text) → vector | null, never throws).
- Changed files: `memory.js` (`add()` becomes async, fire-and-forget Qdrant upsert after
  the JSON write; new `searchRelevant(query, n)` exported, falls back to existing
  `contextBlock(n)` if Qdrant/embedding unavailable), `server.js` (~line 1215, swap
  `memory.contextBlock(12)` for `await memory.searchRelevant(userMessage, 12)`).
- npm client: `@qdrant/js-client-rest` v1.17.0, 223,691 weekly downloads, official —
  passes 44-supply-chain-vetting checklist.
- docker-compose.yml addition for `qdrant/qdrant` image (pin exact version, not
  `:latest`, per container-hardening-law).
- Fallback: every Qdrant/embedding call try/catch + warn, never blocks the request path
  — mirrors the existing yana-pixel-bridge "best-effort" pattern already in this repo.
- **Open questions still needing the human's decision before writing code:**
  1. Opt-in via env var (`YANA_QDRANT_URL` unset = feature fully off, zero infra by
     default) vs. always-attempt-with-fallback — recommend opt-in.
  2. Require Ollama+nomic-embed-text, or also support a no-Ollama path that just skips
     semantic search silently?
  3. Backfill existing `.yana/memory.json` entries into Qdrant on first run, or only
     new entries going forward?
  4. No existing docker-compose.yml found in the repo — this would be the first one.
  5. Is memory single-user or multi-user? If multi-user is ever planned, Qdrant
     payload needs a user-id field now to avoid a breaking migration later.

## Track 3 — Lenis smooth-scroll + Fabric skill picks (NOT STARTED — agent call was rejected by user before running)

Nobody has researched this yet. When resumed: Lenis (https://github.com/darkroomengineering/lenis)
would be a CDN `<script>` tag addition to `tools/yana-web/desktop/index.html` (no-build-step
app, loads React/marked/highlight.js via unpkg already — same pattern). Flagged concern:
likely desktop-only, since mobile already has native momentum scroll
(`-webkit-overflow-scrolling: touch` in mobile/mobile.css's `.mmain` rule) and Lenis might
conflict/be redundant there — verify before adding to mobile. Fabric pattern picks for
new `core/skills/` entries were never selected — need to re-run this research step.

## Update 2026-06-19 — Track 1 implemented, full triage done

**Track 1 (LM Studio) — DONE**, committed nowhere yet (awaiting explicit commit request
per this repo's "never commit without being asked" rule). Implemented across:
`server.js` (PROVIDERS block + /api/models live-list entry), `shared/data.js` (provider
catalog card — this file was NOT in the original plan, found by re-grepping for "ollama"
across the whole tree before declaring done), `desktop/chat.jsx`, `desktop/system.jsx`,
`mobile/m-chat.jsx`, `mobile/m-system.jsx` (also not in the original plan — has its own
keyless/connected/name-map logic separate from m-chat.jsx). Bumped cache-busting `?v=`
query strings on chat.jsx/system.jsx/m-chat.jsx/m-system.jsx in both index.html files
(existing repo convention, matches the recent yana-web caching fix commit). `cron.jsx` /
`m-cron.jsx` correctly left untouched — confirmed via grep they still don't reference
ollama either, so adding lmstudio there would be scope creep beyond parity.
**Lesson:** grep the whole tree for the pattern being mirrored before trusting an old
plan's file list — UI provider wiring tends to be duplicated in more places than expected
(this repo has at least 3 separate "is this provider local/keyless" checks per platform).

**Full triage of the user's 20-item tool list (not 16 — recount on 2026-06-19):**
- Already implemented, no work needed: Ollama, DeepSeek
- Excluded — conflicts with security rules, do not implement: Heretic (strips LLM
  safety/refusal behavior)
- No code integration point (standalone apps/tools, confirmed both sessions):
  Kun, Upscayl, Cherry Studio, Insomnia, Continue, TriliumNext, DeepSeek web/homepage,
  MiniMax-M2.7 (model weights, not an app — already usable via the generic
  Ollama/LM Studio "type any model name" flow, no dedicated provider needed),
  Deer-Flow (ByteDance Python agent framework, no embed point in a no-build-step
  Node app), video-use (browser automation CLI, unrelated to chat UI), gstack
  (low-certainty/unclear maturity, not vetted, no clear use here), AirLLM (Python
  layer-streaming inference lib — no OpenAI-compatible API out of the box, would
  need a custom adapter service, different shape from the Ollama/LM Studio pattern,
  not attempted), Homepage (self-hosted dashboard, unrelated to AI chat), Temporal
  (durable workflow engine — heavy infra, would be its own ADR-level decision, not
  a tools/yana-web feature)
- Track 1 LM Studio — DONE (see above)
- Track 2 Qdrant — still DESIGN ONLY, 5 open questions unanswered, blocked on human
  go/no-go before any code (golden-principles #9 HARD-GATE: 5-file + new-dependency
  change needs an approved plan first)
- Track 3 Lenis + Fabric — still NOT STARTED

## Update 2026-06-19 part 2 — Track 3 done (Lenis only), TODO.md 3-repo triage done

**Track 3 Lenis — DONE.** `desktop/app.jsx`: added `mainRef` on the `.yana-main`
element, a `React.useEffect` that dynamic-`import()`s `lenis@1.3.23` (latest release,
verified via `gh api repos/darkroomengineering/lenis/releases/latest` — pinned, not
`@latest`) straight from unpkg (no UMD build ships anymore, package is ESM-only via
`dist/lenis.mjs`, so plain `<script src>` would NOT work — must use dynamic `import()`),
constructs `new Lenis({ wrapper, content, autoRaf: true })`, skipped on the chat page
(own internal scroll) and behind `prefers-reduced-motion` (matches the existing
`desktop/water.js:8` precedent in this repo). Desktop only, confirmed mobile still
correctly excluded (native `-webkit-overflow-scrolling: touch` in mobile.css unchanged).
Bumped `app.jsx?v=` in desktop/index.html.

**Track 3 Fabric pattern picks — NOT attempted, deliberately.** Fabric has 255 patterns
(counted via `gh api repos/danielmiessler/fabric/contents/data/patterns`); this repo's
skill catalog already has 400+ entries with heavy topical overlap (security, refactoring,
docs, summarization, etc.). Properly vetting 255×400 for genuine non-duplicate value is
its own focused task, not a tail-end pick. Recommend either skip entirely or do it as a
dedicated session with the rule-consistency-policy.md duplication checklist applied
per-pattern — do not rubber-stamp a handful "for completeness."

**TODO.md's 3 repo→skill candidates — all triaged, ZERO new skills created (correct
outcome, not incomplete work):**
- `nidhinjs/prompt-master` (9.5k★, legit) — SKIP, duplicate. `core/skills/prompt-engineering/`
  already covers this exact ground (role framing, few-shot, CoT, format control,
  versioning, A/B testing, anti-fake-pass). prompt-master's only non-overlapping angle is
  multi-target-tool prompt shaping (Cursor vs Midjourney vs Devin need different prompt
  shapes) and an "ask clarifying questions before generating" workflow — if ever wanted,
  fold as a section into the existing skill, do not create a second one.
- `devbeta-hcode/pig-agents` (1★, TypeScript) — SKIP. Not a tool/pattern, it's a whole
  standalone competing IDE+agent app (React UI + Node backend, own ReAct loop, own patch
  engine). Doesn't fit the "install a CLI, here's how to invoke it" skill shape. Also no
  explicit OSS license found in the repo (just "© 2026 DEV BETA., JSC. All rights
  reserved") — copying any content would be a license/attribution risk per
  `core/skills/CLAUDE.md` and 44-supply-chain-vetting.md even if a skill made sense here.
- `Panniantong/Agent-Reach` — **ALREADY DONE, and done TWICE.** Found two existing skill
  dirs for the identical source repo: `core/skills/agent-reach/` (full, detailed, has
  Anti-Fake-Pass + See Also cross-refs) and `core/skills/panniantong--agent-reach/`
  (thinner installer-style version, the literal example TODO.md points to). This is a
  live rule-consistency-policy.md violation (duplicate skill content for one source) that
  predates this session — flagged to the user, NOT merged/deleted unilaterally (that's a
  deletion decision, not a "while I'm here" cleanup call per golden-principles #12).

TODO.md itself should be updated/cleared once the user has seen this — left untouched
so the user can decide whether to edit it directly or have it done.

## Update 2026-06-19 part 3 — Agent-Reach dedup done, Qdrant ~90% done, paused on quota AGAIN

**Agent-Reach duplicate — RESOLVED.** Kept `core/skills/agent-reach/` (richer, has
Anti-Fake-Pass + See Also). Removed `core/skills/panniantong--agent-reach/` via
`git rm -r` (not raw rm — tracked file, reversible). Ran
`bash core/scripts/verify-skills-lock.sh --prune` to clean the orphaned lockfile entry
in `core/config/skills-lock.json` — completed successfully (exit 0). TODO.md NOT yet
edited to remove the now-resolved Agent-Reach line — still says "3 link" pending, should
say 2 (prompt-master, pig-agents both SKIP per part-2 triage) — really 0 actionable,
everything in the original 3-link queue is resolved (2 skip, 1 was already done+deduped).

**Qdrant (Track 2) — code DONE, infra piece NOT done, NOT committed.** User approved
the 5 recommended defaults via "lm đi" (go ahead). Implemented:
- `tools/yana-web/package.json` — added `@qdrant/js-client-rest` at `1.18.0` (exact pin,
  re-verified as the actual latest via `npm view` at implementation time, not the stale
  1.17.0 the part-1 design doc guessed — always re-check the version at code time, not
  plan time). `npm install` run, lockfile updated, 4 packages added, 0 vulnerabilities.
- `tools/yana-web/embeddings.js` (NEW) — `embed(text)` via local Ollama
  `/api/embeddings`, model `nomic-embed-text` (override via `YANA_EMBED_MODEL`),
  5s timeout, resolves `null` on any failure, never throws.
- `tools/yana-web/qdrant-client.js` (NEW) — `isAvailable()` / `upsertMemory(entry, vector)`
  / `searchSimilar(vector, limit)` / `deleteMemory(id)`. Lazy `require()` of the npm
  package only inside `getClient()`, gated behind `YANA_QDRANT_URL` being set — unset env
  var means the require line never executes, zero behavior change, zero infra by default.
  Collection `yana_memory`, vector size 768 (nomic-embed-text dimension), Cosine distance,
  auto-created on first use via `ensureCollection()`.
- `tools/yana-web/memory.js` — did NOT make `add()` async as the part-1 design doc
  literally said; kept it sync (its sync return value is relied on by existing callers)
  and instead fire-and-forget the embed+upsert chain after the JSON write
  (`embed(clean).then(...).catch(() => {})`, not awaited) — same "fire-and-forget" goal,
  smaller diff, zero caller changes needed. Also wired `remove(id)` to fire-and-forget
  `qdrant.deleteMemory(id)` (not in the original design notes but a clear correctness gap
  — without it, deleted memories would surface forever via semantic search). Added new
  exported `async searchRelevant(query, n)`: tries embed+search, falls back to the
  existing `contextBlock(n)` on any failure/unavailability — callers always get a result.
- `tools/yana-web/server.js` line ~1246 — swapped `memory.contextBlock(12)` for
  `await memory.searchRelevant(task, 12)` (the design doc said `userMessage` — the real
  variable in `handleApiChat` is `task`, found by reading the function, not guessing).
- Verified: `node --check` passes on all 4 touched/new JS files. Smoke-tested by hand:
  `require('./memory.js')` loads clean, `searchRelevant()` correctly falls back to
  `contextBlock` both when `YANA_QDRANT_URL` is unset AND when it's set but the server
  is unreachable (no Qdrant/Ollama actually running in this sandbox) — `add()` does not
  throw with the env var set either, fire-and-forget dispatched as designed.

**Still NOT done for Qdrant — next session must do these before calling Track 2 complete:**
1. `docker-compose.yml` — the first one in this repo (per design doc: pin
   `qdrant/qdrant` to an exact image tag, not `:latest`, per container-hardening-law).
   Never created — ran out of turn budget right before this step.
2. Nothing committed to git yet — working tree has all the above as uncommitted changes
   alongside the still-uncommitted Track 1 (LM Studio) and Track 3 (Lenis) work from
   earlier in this same session.
3. TODO.md not updated to reflect the resolved/skipped items (see Agent-Reach note above).
4. Never actually tested against a real running Qdrant + Ollama instance — only tested
   the "unavailable/unreachable" fallback paths. The happy path (real upsert + real
   semantic search hit) is unverified. Flag this to the user before calling it Verified
   (per 69-cognitive-reliability-law L6.0 — this is Implemented, not yet Tested/Verified).

**Pattern across both quota cutoffs:** user runs this multi-track session until tokens
run out mid-task, says "hết quota/token rồi", expects exact resume from memory next
time. Keep this file current after every meaningful chunk of work, not just at the end —
already learned this the first time, applied it correctly this time (mid-session updates
above), do it again next time too.

## Update 2026-06-19 part 4 — all remaining gaps closed, Track 2 fully verified

User said "làm nốt cái commit afb2ab1 đi" (finish the work left at that backup commit).
Closed every item from the "Still NOT done" list above:

1. **`tools/yana-web/docker-compose.yml` — created.** Qdrant `v1.18.2` only (exact tag,
   not `:latest`), pinned via `gh api repos/qdrant/qdrant/releases/latest` at
   implementation time. Two services: `qdrant-init` (runs as root briefly, chowns the
   named volumes to uid 1000, exits) then `qdrant` (runs as `1000:1000`, `cap_drop: ALL`,
   `no-new-privileges`, CPU/mem limits, ports bound to `127.0.0.1` only). No in-container
   HEALTHCHECK — verified the published image's runtime stage has no curl/wget, didn't
   fake one. App itself deliberately NOT bundled into this compose file (it already has
   its own Dockerfile + runs natively) — would have been scope creep beyond what Track 2
   asked for.
2. **Real end-to-end test against live Qdrant — done, in this sandbox (Docker available,
   confirmed via `docker info`).** `docker compose up -d` actually pulled and started
   v1.18.2, confirmed non-root via `docker exec ... id` → `uid=1000 gid=1000`. Wrote a
   throwaway `/tmp` script exercising `qdrant-client.js` directly (upsertMemory ×3 with
   real 768-dim vectors, searchSimilar, deleteMemory) — upsert/search/delete all worked
   correctly against the real running instance (similarity ranking correct, delete
   actually removed the entry from subsequent search results). Cleaned up after:
   `docker compose down -v` + deleted the temp script — nothing left running.
   **Still not tested: the real Ollama embedding path** — no Ollama daemon in this
   sandbox (`curl 127.0.0.1:11434` failed). So `embeddings.js`'s real HTTP call to Ollama
   remains unverified beyond its already-tested null-on-failure fallback; only the Qdrant
   half of the chain has now been verified against real infra. Flag this distinction if
   asked "is Track 2 fully tested" — Qdrant: yes, real test. Ollama embed: still only the
   failure path is verified.
3. **TODO.md updated** — all 3 repo→skill items checked off with one-line resolution each
   (prompt-master skip, pig-agents skip, Agent-Reach deduped), stale
   `core/skills/panniantong--agent-reach/` doc reference fixed to `agent-reach/`, note
   updated from "3 link mới" to "đã resolve hết (0 actionable)".
4. Verified `node --check` on all 4 previously-touched JS files + compose YAML parses —
   all clean. Nothing committed — git status shows `TODO.md` modified + compose file
   untracked, same "ask before commit" convention as before. User has not yet been asked
   whether to commit this final pass.

**Scope-guard note:** writing `tools/yana-web/docker-compose.yml` tripped this repo's
cross-scope hook (Yana AI core vs. product-code boundary, `64-scope-drift-law`). Treated
the user's explicit "finish commit afb2ab18" instruction — whose entire diff is
`tools/yana-web` — as the required in-session approval, stated it explicitly, proceeded
with `YANA_SCOPE_OK=1` for that session. Apply the same reasoning next time work in this
file resumes under a similarly explicit product-scope instruction.


### project_hermes_integration_paused.md

---
name: project-hermes-integration-paused
description: Yana-AI repo — hermes_adapted hook integration plan paused at Phase 0; where to resume
metadata: 
  node_type: memory
  type: project
  originSessionId: b2420d58-bf93-40a9-83e1-311e732eb892
---

User asked to wire `core/lib/hermes_adapted/` (8 dormant, tested-but-unused
Python modules ported from NousResearch/hermes-agent) into the live Claude
Code hook pipeline. Investigation found the scope was bigger than expected:
2 related hooks (`session-bootstrap.sh`, `per-tool-circuit-breaker.sh`) were
fully built/tested since 2026-05 but never registered in `.claude/settings.json`,
and `truth-gate-guard.sh` (a live safety hook) had a transcript-parsing bug
making it silently no-op since 2026-05-19.

**Why:** these are exactly the same "finished but never connected" bug
pattern that recurred several times this session (mission/route CLI wiring,
doctor-dispatch, now hooks) — worth checking for on this repo specifically
whenever something "should obviously already work."

**How to apply:** A full 6-phase plan exists at
`/home/codespace/.claude/plans/squishy-stirring-cookie.md` (only readable
within a Claude Code session on this machine — if it's gone, the design
rationale is also duplicated in
`memory/L1_atomic/fact-hermes-integration-paused.md` inside the repo, which
is git-tracked). Phase 0 (foundation fixes) is done and committed
(2a71ef8a, cb2aa8ac). Phases 1-5 (the actual hermes wiring) are designed
but not started — pick up there, don't re-derive the architecture analysis
(it required reading all 8 hermes_adapted files + verifying a real
transcript file's JSONL schema empirically).

See also: [[feedback-quota-pacing]].


### project_jnmt_yamtam_overview.md

---
name: project-jnmt-yamtam-overview
description: "YAMTAM Engine was renamed to Yana AI (this repo) — product history, JNMT client-project boundaries, Railway deploy"
metadata: 
  node_type: memory
  type: project
  originSessionId: a0fc0105-f578-486f-8e84-af9438c03459
---

**Correction (2026-06-18):** "YAMTAM Engine" was the project's old name — anh Tâm renamed it to **Yana AI**, which is this very repo (`yana-ai`, confirmed in MANIFEST.json). Earlier draft of this memory wrongly treated YAMTAM as a separate project — it is this project's prior identity. The web app runs live on Railway: https://yanai-production.up.railway.app (`railway.toml` present in repo root).

The JNMT repos below are anh's **separate client project(s)** on another machine, where YAMTAM/Yana-AI tooling was/is applied — relationship between JNMT and current Yana-AI repo state not fully reconfirmed, treat as ~2 weeks stale until anh confirms specifics.

**JNMT repo boundaries** (don't confuse these — different repo, different machine, not this one):
| Repo | Path | Notes |
|---|---|---|
| jnmt-claude-code-agenl-21 | /home/phamlongh230/jnmt-claude-code-agenl-21 | Main build, has YAMTAM — Next.js 14 + GCP + Redis + Electron |
| jnmt-full | /home/phamlongh230/jnmt-full | Client handover — YAMTAM NOT applied |
| jnmt-clean | ~/jnmt-clean | Clean handover — do not edit |
| jnmt.vn | /home/phamlongh230/jnmt.vn | Unrelated, separate, already finished |

If anh says "jnmt" without specifying → ask whether he means agenl-21 or jnmt-full.

**Original YAMTAM product strategy** (now Yana AI's lineage): Positioning — "YAMTAM audits your AI coding agent setup before it can damage your repo." Tagline: "Scan first. Guard later." Funnel: Auditor CLI → Policy Kit → Control Layer → GitHub App.

Status as of ~2026-06-03 (pre-rename): PyPI v0.40.0 published (`pip install yamtam-engine`), npm v0.40.0 published, GitHub App v2 live (https://github.com/apps/yamtam-engine), GitHub Marketplace submitted/pending review. Current Yana-AI MANIFEST.json shows v0.41.3 — confirms continuity, not a separate product.

Phase 1 constraint: rule-based scanning only (no AI-based scanning), no auto-fix without `--yes`.

**Tech stack decision (2026-05-28):** Use Rust, not Java, for any new compiled component/service/CLI — Java's JVM startup overhead ("thuế") is unacceptable; Rust compiles to a native binary with no such overhead.

See [[reference-yamtam-github-app-deploy]] for deploy details.


### project_local_ai_direction.md

---
name: project-local-ai-direction
description: "Anh Tâm đang tính phát triển Yana AI chạy với local AI models (tham số cao, 70B+) — một phần privacy/cost/offline mode"
metadata: 
  node_type: memory
  type: project
  originSessionId: 943c1773-52bf-4a09-a70a-e14075be10d8
---

Anh đang tính phát triển Yana AI chạy với local AI models tham số cao (70B+).

**Why:** Chưa rõ hướng chính xác — "một phần thôi" — có thể là privacy mode (sensitive tasks local), cost mode (bulk tasks local), hoặc offline mode. Chưa chốt hướng.

**Context kỹ thuật đã thống nhất:**
- LM Studio đã tích hợp và tested (từ session cũ)
- 3 vấn đề chính: context window (local 4K–32K < Claude 200K), tool use quality (Qwen2.5 72B / Mistral Large / DeepSeek-R1 70B làm tốt nhất), routing logic
- Cần: provider abstraction layer (cloud vs local router) + context compression quan trọng hơn với local
- Hermes context-compressor skill đã import — sẽ dùng nhiều hơn với local models

**How to apply:** Khi anh quay lại topic này, không cần giải thích lại background. Hỏi thẳng: privacy mode, cost mode, hay offline mode để chọn architecture.


### project_openclaw_context_pruning_port_wip.md

---
name: openclaw-context-pruning-port-wip
description: "openclaw context-pruning subsystem port — 3/6 ported+tested (PR #20 merged), còn thinking.py + 3 core files"
metadata: 
  node_type: memory
  type: project
  originSessionId: e05c6496-4b18-4a6b-ac33-4c8d33d21ffc
---

**Trạng thái (2026-06-26, update sau PR #20 merge):** PR #20 `test/openclaw-context-pruning-units` đã merge vào main. Tests cho 3 file batch đầu đã có. Còn 4 file nữa chưa port (thinking.py + 3 context-pruning core).

**Đã port (3/6 file, KHÔNG có test — chỉ smoke-test bằng tay, đừng coi là Verified):**
- `core/lib/openclaw_adapted/cjk_chars.py` ← `utils/cjk-chars.ts`
- `core/lib/openclaw_adapted/glob_pattern.py` ← `agents/glob-pattern.ts`
- `core/lib/openclaw_adapted/parse_duration.py` ← `cli/parse-duration.ts` (dùng `string_coerce.py` đã có sẵn)

**Còn phải port (3 file, đã đọc xong source, biết rõ cách làm — xem vendor/ đã fetch sẵn):**
- `context_pruning_settings.py` ← `agent-hooks/context-pruning/settings.ts` (computeEffectiveSettings, DEFAULT_CONTEXT_PRUNING_SETTINGS) — phụ thuộc `parse_duration.py`
- `context_pruning_tools.py` ← `agent-hooks/context-pruning/tools.ts` (makeToolPrunablePredicate) — phụ thuộc `glob_pattern.py` + `string_coerce.py`
- `context_pruning.py` ← `agent-hooks/context-pruning/pruner.ts` (pruneContextMessages — đây là thuật toán chính, 412 dòng gốc) — phụ thuộc `cjk_chars.py`, `thinking.py` (chưa port, xem dưới), `context_pruning_settings.py`, `context_pruning_tools.py`

**`agents/thinking.ts` (753 dòng, đã vendor, đã đọc xong) — port PARTIAL có chủ đích:**
- Portable (port thành `thinking.py`): `isAssistantMessageWithContent`, `stripThinkingSignaturesFromMessage`, `stripStaleThinkingSignaturesForCompactionReplay`, `stripInvalidThinkingSignatures`, `dropThinkingBlocks` (← cái này `pruner.ts` cần), `shouldPreserveLatestAssistantThinking`, `stripThinkingBlocksFromMessage`, `dropReasoningFromHistory`, `assessLastAssistantMessage`.
- KHÔNG port (loại khỏi scope, giống lý do loại `session-chat-type.ts`/`send-policy.ts` trước đây): `wrapAnthropicStreamWithRecovery` + toàn bộ helper stream-recovery (dòng 537–753) — phụ thuộc `StreamFn`/logger/`infra/errors.js`, coupled với streaming/async-generator thật, không phải pure algorithm.

**KHÔNG portable (loại khỏi scope, đã xác nhận khi đọc):** `agent-hooks/context-pruning/extension.ts` (đăng ký hook qua `ExtensionAPI` thật), `agent-hooks/context-pruning/runtime.ts` (session-manager runtime registry thật), `agent-hooks/context-pruning.ts` (chỉ là barrel re-export). Cả 3 đã vendor nhưng sẽ không có file `.py` tương ứng.

**Việc tiếp theo khi quay lại (đúng thứ tự, có task list `TaskList` đang track #1-9):**
1. Viết `tests/test_openclaw_cjk_chars.py`, `tests/test_openclaw_glob_pattern.py`, `tests/test_openclaw_parse_duration.py` (3 file đã port ở trên nhưng chưa có test) — theo convention fuzz-testing-constraints.md (empty/max-length/injection cases) như các test khác trong `tests/test_openclaw_*.py`.
2. Port `thinking.py` (subset portable) + test.
3. Port `context_pruning_settings.py`, `context_pruning_tools.py`, `context_pruning.py` + test cho từng file (theo thứ tự dependency).
4. Chạy `python3 -m pytest tests/ -q` — baseline trước khi bắt đầu việc này là **614 passed**.
5. Commit (không push — anh tự push theo pattern mọi lần).

**Liên quan:** [[project_ruflo_port_in_progress]] (note cũ ghi "chưa push" nhưng `git rev-list --left-right --count origin/main...HEAD` ra `0 0` lúc 25/06 — đã được push, có thể anh tự push. Cần sửa lại note đó.)


### project_pixel_office_bridge.md

---
name: project-pixel-office-bridge
description: "In-progress: visualize Claude Code's subagent dispatch as pixel-art office activity (agent-office), relayed via yana-pixel-bridge"
metadata: 
  node_type: memory
  type: project
  originSessionId: a0fc0105-f578-486f-8e84-af9438c03459
---

**Goal:** when Claude Code spawns a subagent (Agent tool), show it visually as
a pixel character walking to a desk and working, then returning idle when
done — using the open-source `agent-office` project, not a from-scratch UI.

**Architecture decided (2026-06-18):**
```
Claude Code Agent tool call (PreToolUse/PostToolUse)
        ↓
.claude/hooks/agent-pixel-notify.sh   (in Yana-AI repo, committed ad05cac0)
        ↓ HTTP POST :5000/webhook/agent-hook
tools/yana-pixel-bridge/server.js     (in Yana-AI repo, committed 8b71fb21)
        ↓ socket.io broadcast (generic, any frontend can listen)
        ↓ HTTP POST :3000/api/external-agent-event (forward)
/workspaces/agent-office  (sibling clone, OWN git repo, NOT part of Yana-AI)
  packages/server/src/rooms/OfficeRoom.ts  — startExternalTask()/stopExternalTask()
  packages/server/src/index.ts             — POST /api/external-agent-event route
  (committed locally in agent-office's own repo, commit f3d8644 — not pushed anywhere)
        ↓ existing Colyseus state sync (untouched)
packages/ui (Phaser+React, port 5173)  — walk-to-desk/work/idle animation already built in
```

**Why this design:** Yana-AI's own Rust CLI (`src/*.rs`) does NOT orchestrate
LLM agents — it's a static scanner/task-tracker. The real "agent dispatch"
event only exists at the Claude Code application layer, observable via
hooks (`.claude/settings.json` already had a `PreToolUse` matcher
`"Agent|Task"` wired to `agent-budget-gate.sh` — added `agent-pixel-notify.sh`
alongside it, plus a new PostToolUse `Agent|Task` matcher). Chose to extend
agent-office's own Colyseus server (Strategy B, anh's pick) rather than
reimplement walk/sit/idle animation in a custom frontend (Strategy A) —
reuses their existing `'assign-task'` message handler logic.

**Status — paused mid-session, anh had to step out (2026-06-18 evening):**
- ✅ Hook script + settings.json wiring — tested end-to-end with simulated
  stdin, confirmed bridge receives start/stop correctly. Committed.
- ✅ Bridge server (`tools/yana-pixel-bridge/`) — own package.json/lockfile,
  tested webhook→socket.io path manually. Committed.
- ✅ agent-office fork edits (`OfficeRoom.ts` + `index.ts`) — TypeScript
  build verified clean (`npm run build --workspace=@agent-office/server`,
  had to build root-level first + rebuild `adapters` once due to a
  pre-existing workspace build-order quirk in their own repo, unrelated to
  my change). Committed locally in agent-office's repo.
- ❌ **NOT yet tested end-to-end**: bridge's new `forwardToAgentOffice()` call
  to `:3000/api/external-agent-event` was just written, never actually
  run against a live agent-office server. **This is the next step.**
- ❌ Never actually started agent-office's full stack (`npm run dev
  --workspace=@agent-office/ui` + `npm run start --workspace=@agent-office/server`)
  to see it visually — agent-office also needs Ollama running locally for
  its own LLM think-loop (unrelated to our HTTP endpoint, which works
  without Ollama).

**Next session — pick up here:**
1. Start agent-office server: `cd /workspaces/agent-office && npm run start --workspace=@agent-office/server`
2. Start our bridge: `cd /workspaces/Yana-AI/tools/yana-pixel-bridge && npm start`
3. curl the bridge's `/webhook/agent-hook` with a start/stop event, confirm
   agent-office's server log shows the task picked up (check `[TaskBoard]`-style
   log lines, or query Colyseus state) — this is the untested link.
4. Then start the UI (`npm run dev --workspace=@agent-office/ui`, port 5173)
   to visually confirm a character walks to a desk.
5. Decide: does anh want this auto-started, or manual per the original
   3-step "quy trình vận hành" (start bridge → start UI → use Claude Code)?

See also [[feedback_agent_spawn_limit]] (if saved) for the max-3/ask-before-5
subagent constraint anh set mid-session — applies generally, not just here.


### project_ruflo_port_in_progress.md

---
name: project-ruflo-port-in-progress
description: "ruflo task/swarm/workflow port — done: tested (128 tests), committed locally (2f540173), not pushed."
metadata: 
  node_type: memory
  type: project
  originSessionId: 1c4ca94c-6b47-406f-9e8f-6e9efbc1cb63
---

2026-06-25: Vetted `ruvnet/ruflo` (claude-flow successor, 61k stars, MIT,
`.vet-staging/ruflo-main.zip`), ported the real (non-stub) parts of
`v3/src/{task-execution,agent-lifecycle,coordination}/` into
`core/lib/ruflo_adapted/`, same pattern as the Hermes port. Session was
interrupted mid-port (code written, untested); resumed and finished same day.

**Vetting result (final, don't re-derive):**
- `memory/` backends (AgentDBBackend, SQLiteBackend, HybridBackend) — fake
  (in-memory Map despite docstrings claiming HNSW/SQLite). **Not ported.**
- `reachConsensus` — fake (`Math.random() > 0.5`). **Not ported** — Yana AI
  has a real BFT design (`core/rules/54-bft-consensus-law.md`).
- Everything else in `SwarmCoordinator.ts`, `Task.ts`, `Agent.ts`,
  `WorkflowEngine.ts` is real and was ported, including two documented
  upstream bugfixes (`ruflo#1872`): crashed-agent → structured failed
  TaskResult (not propagated), and `scaleAgents`/`compute_scale_plan` count
  is a target total, not a delta.
- `restoreWorkflow` and `processTaskExecution`'s artificial setTimeout —
  deliberately dropped (depend on the fake backends / admitted-fake delay).

**Finished 2026-06-25 (second half of session):**
- Confirmed no upstream `.test.ts` exists for any of the 4 ported source
  files (checked the zip directly under `v3/src/`) — tests written from
  documented behavior + `fuzz-testing-constraints.md` boundary cases, same
  as the Hermes error_classifier precedent.
- 128 new tests across 7 files: `tests/test_ruflo_{agent,task,
  swarm_scheduling,swarm_topology,swarm_coordinator,workflow_runner,
  workflow_engine}.py`. Full suite: 614/614 passing.
- Function/file hard-limit check (AST-based, `agent-code-constraints.md`:
  50 lines/func, 300 lines/file) — clean, no violations.
- Found + fixed one real gap while closing out: `ruflo_adapted/__init__.py`
  was missing the `License:` line the Rust provenance checker
  (`src/provenance/mod.rs`) requires — added it.
- Committed locally: `2f540173` on branch
  `fix/secrets-rename-link-skill-cleanup`. **Not pushed** — anh pushes
  himself (established pattern, see [[feedback_repo_tooling_gotchas]]).

**Risk closed:** the pause/resume sync-port adaptation in
`workflow/state.py`/`runner.py` (upstream busy-polls a real event loop;
this port stops at `current_task_index` and resumes by re-invoking the
runner) is now covered by
`test_run_workflow_resumes_from_current_task_index_not_from_scratch` and
`test_pause_and_resume_paused_workflow_runs_remaining_tasks` — both pass.

**Nothing left to resume here** — this entry can be archived/ignored unless
ruflo comes up again (e.g. anh wants another subsystem from the same repo,
or wants to push the branch).


### project_skill_bloat_cleanup_2026-06-25.md

---
name: project-skill-bloat-cleanup-2026-06-25
description: "Cut 2220 unused vendor-bulk skills (terminal--*, composio-skills--*, most openai--*), fixed the manifest drift that was failing CI on main."
metadata: 
  node_type: memory
  type: project
  originSessionId: 1c4ca94c-6b47-406f-9e8f-6e9efbc1cb63
---

2026-06-25: anh said the repo felt "cồng kềnh" (bloated) and asked to cut unused skills.
Investigation found `core/skills/` had 4200 skills, but 2265 of them (54%) were three
bulk vendor imports never wired into the live `.claude/skills/` set (398 skills) or the
skill-tiers list (343 skills): `terminal--*` (1009, generic CLI-tool wrapper docs,
unrelated to Yana AI), `composio-skills--*` (832, third-party SaaS automation wrappers),
`openai--*` (424, mixed — mostly vendor-specific business SaaS, ~45 genuinely
dev-relevant: cloudflare, github, supabase, superpowers, codex-security, plugin-eval,
sentry, linear, coderabbit).

**What was done:** removed `terminal--*` + `composio-skills--*` entirely, and 379/424
of `openai--*` (kept the 45 dev-relevant ones, anh approved this split via
AskUserQuestion). Re-synced `skills-lock.json`, `skill-trigger-index.json`,
`MANIFEST.json`, `plugin.json` skill counts to match disk. Also fixed 7 stale
gitnexus "ghost" entries in MANIFEST.json `actual_present` that were the actual cause
of the CI failure on `main` after PR #17 merged (gitnexus got flattened but manifest
wasn't regenerated).

**Verified:** `drift-check.sh` clean, `validate-manifest.sh --component skills` clean,
`core/tests/skills/test-skill-triggering.sh` 678/678 pass (no regression).

**Committed but not pushed** — commit `39ae036c` on
`fix/secrets-rename-link-skill-cleanup`. Anh said he'll push it himself.

**Found but deliberately not touched (pre-existing, out of scope):**
- `agents` component drift in MANIFEST.json (declared=101, actual=204) — existed
  before this session, unrelated.
- `skills-lock.json` hash-pin drift across ~871 entries + 88 missing — pre-existing,
  the lock file doesn't look like it's been kept in sync in a while. Worth a dedicated
  session if anh wants `verify-skills-lock.sh` actually green.

**How to apply:** if anyone asks "why did skill count drop from 4288 to 1980", point
here. If `plugin.json`'s `contents.checks_breakdown.skill_trigger_checks` field is
ever touched again — it is the count of skills covered by the *gated* trigger test
(`core/tests/skills/test-skill-triggering.sh`, 678 today), NOT the length of
`skill-trigger-index.json` (a much larger, ungated index) — conflating the two was a
mistake made and caught within this same session.


### project_yana_ai_github_rename.md

---
name: project-yana-ai-github-rename
description: "Yana-AI repo's GitHub owner username changed phamlongh230-lgtm → yanacuti1121; link-fix work in progress, not finished"
metadata: 
  node_type: memory
  type: project
  originSessionId: a0fc0105-f578-486f-8e84-af9438c03459
---

**Root cause of "404 everywhere" (2026-06-18):** Anh Tâm's GitHub account username changed from `phamlongh230-lgtm` to `yanacuti1121`. GitHub auto-redirects repo URLs (`github.com/phamlongh230-lgtm/Yana-AI` still resolves, both point to the same repo per `gh repo view`), but GitHub Pages (`<user>.github.io`) does NOT follow the rename — that's part of why the docs link 404s. The actual docs deploy target is Cloudflare Pages (project name `yana-ai`, see `.github/workflows/pages-cf.yml`), not GitHub Pages at all — the README link to a `.github.io` domain looks wrong independent of the rename. Real Cloudflare Pages URL unconfirmed (tried `yana-ai.pages.dev`, DNS didn't resolve).

**Why:** explains the desktop-machine chaos session — anh's account rename broke several outward-facing links across docs at once, on top of an unrelated Codespace RAM crash.

**Work done this session (local working tree only, NOT committed/pushed):**
- Replaced `phamlongh230-lgtm` → `yanacuti1121` in 28 tracked files (README.md, README.vi.md, CONTRIBUTING.md, package.json, Cargo.toml, pyproject.toml, action.yml, .claude-plugin/{plugin,marketplace}.json, .github/workflows/{release,yana-audit}.yml, .github/actions/scan/action.yml, .github/security-advisories/*.md, docs/* social posts + privacy + architecture + CLI_MVP_DESIGN, github-app/README.md, skills/yana-ai/SKILL.md, core/skills/openclaw--openclaw/SKILL.md, core/rules/slsa-artifact-law.md + .claude/rules/slsa-artifact-law.md, DIRECTION.md, OPENCODE.md, .zed/settings.json, reports/markdown-template.md)
- `core/rules/slsa-artifact-law.md` is pinned in `core/config/core-lock.json` (Tier-1 protected, see [[67-core-integrity-lock-law]]) — followed the regeneration protocol: reviewed the 1-line diff, ran `core/scripts/update-core-lock.sh`, re-verified PASS (218/218).
- Updated local `git remote origin` to `https://github.com/yanacuti1121/Yana-AI`.

**Pending — NOT yet fixed (found via broader `grep -rl "phamlongh230-lgtm" .` excluding .git/node_modules):**
```
.gitmodules, .cursorrules, install.sh
core/scripts/{upgrade.py,graph_query.py,doctor.py,badge_gen.py,harness_export.py,design_context.py,export_findings.py,report_html.py,audit_scanner.py,gen_skills_page.py}
github-app/src/installer.ts
docs/{io,music,search,changelog,skills,marketplace,guide,index}.html, docs/demo.svg, docs/demo.cast, docs/demo.sh
docs-dist/{music,search,skills,marketplace,guide}.html
tools/yana-web/server.js
site/astro.config.mjs, site/src/pages/{guide,search,marketplace,yana-ai-system-map,skills,music,changelog}.astro, site/src/layouts/BaseLayout.astro, site/src/components/Nav.astro
src/scanner/render.rs
demo/demo.sh
```
Session paused here — ran low on token budget mid-task. **Next session: finish this list with the same `sed -i 's/phamlongh230-lgtm/yanacuti1121/g'` approach**, then re-run the broad grep to confirm zero remaining, then ask anh before committing/pushing (per [[65-pre-push-verify-law]] and [[git-push-enforcement]] — nothing has been committed yet, all edits are in the working tree).

**Still unresolved / needs anh's input, not link-text fixes:**
- Real Cloudflare Pages docs URL (guessed `yana-ai.pages.dev`, wrong)
- Real GitHub App marketplace slug (README said `github.com/apps/yamtam`, 404)
- GitHub Marketplace listing status (likely still pending review, not a broken link)
- crates.io `yana-rt` package status (404, not published or yanked)
- Cloudflare Worker for GitHub App: `wrangler.toml` renamed locally to `yana-ai-github-app` but NOT redeployed — old worker `yamtam-github-app.workers.dev` still live and serving fine, so this is low urgency, not broken
- Desktop Electron app showing white screen is a **local machine issue** (spawns `tools/yana-web/server.js` on 127.0.0.1:8081 and waits for `/health`) — unrelated to any of the above, not fixable from this Codespace

See also [[project-jnmt-yamtam-overview]] for the YAMTAM Engine → Yana AI rebrand history (different topic from this GitHub username rename).


### project_yana_ai_security_audit_2026-06-21.md

---
name: project-yana-ai-security-audit-2026-06-21
description: P0 identity-gate bypass fixed + core/ vs .claude/ live-hook drift pattern discovered in Yana AI repo
metadata: 
  node_type: memory
  type: project
  originSessionId: f6da638b-83ec-4303-a269-3887080ce431
---

On 2026-06-21, anh Tâm simulated being an end-user (separate Claude account/session,
pretending to install via npm rather than reading the dev repo directly) to audit
Yana AI's own safety system. That session produced `docs/UPGRADE_REPORT.md` +
`yana-ai-upgrade.zip` with 5 findings, since deleted after this session applied them
for real and verified each with executed tests (not just reading the report).

**Why anh works this way:** auditing from inside the dev repo doesn't surface
npm-packaging gaps — e.g. the worst finding (`scripts/npm-install.js` never copied
`core/scripts/`/`core/gates/` to a target project's `.claude/`) was invisible from
the repo's own `.claude/`, which already had those files via a different path.
**How to apply:** when anh hands over a report/code generated by "a different
account simulating a user," treat the simulated-environment framing as a deliberate,
valid audit technique — verify the findings independently (re-read the actual source,
not just the report's claims) rather than taking them at face value, but don't
dismiss them as low-effort either.

**The real finding (confirmed independently, not just trusted from the report):**
`core/gates/identity-gate.sh`'s `--verify` flag was never implemented — non-interactive
calls (closed stdin) hit EOF, defaulted to GUEST tier, and still `exit 0`'d. Because
`core/scripts/safe-run.sh`'s `YANA_SAFE_RUN_BYPASS=1` path only checks the exit code
of `identity-gate.sh --verify`, this meant the BYPASS path — which is supposed to
require sovereign identity — succeeded unconditionally for anyone, with zero
credentials. Fixed: `--verify [tier]` now fails closed (exit 8) unless env-var
auto-auth already granted that tier.

**Recurring footgun discovered (twice in one session) — core/ vs .claude/ drift:**
This repo dogfoods itself: `core/` is the canonical/npm-shipped source, `.claude/`
is this repo's own *installed* copy, and **they are not auto-synced**. Two different
drift shapes exist:
- Some files (`core/scripts/safe-run.sh`) are only ever referenced via their `core/`
  path — the `.claude/scripts/` copy is dead, never invoked. Safe to ignore.
- PreToolUse **hooks** are the opposite: `.claude/settings.json` wires hooks to
  `.claude/hooks/*.sh` specifically, so `.claude/hooks/` is what's actually live.
  A fix landed only in `core/hooks/guard-destructive.sh` etc. has **zero effect**
  on the running session until `.claude/hooks/` is synced too.
**How to apply:** any time a fix touches `core/hooks/*.sh`, immediately check
`diff core/hooks/X.sh .claude/hooks/X.sh` and sync if they differ — don't assume
core/ alone is enough. The same check is worth doing for `core/gates/` and
`core/scripts/` before assuming a fix is live, since which side is canonical varies
per file (verify via `grep -rl <filename>` for real call sites, don't guess).

**Push-to-main has no bypass at all, by design:** `core/hooks/guard-destructive.sh`'s
block on `git push (origin )?(main|master)` has no `YANA_*_BYPASS` env var anywhere
in the script (confirmed via grep) — unlike every other rule in Yana AI's security
stack. Direct push to main from inside Claude Code's Bash tool is unconditionally
blocked; the only path is anh pushing manually from his own terminal (`! git push
origin main`), or a feature-branch+PR. Don't go looking for a bypass flag for this
one — there isn't one, and adding one would be a real security-policy change anh
would need to explicitly approve first.

**Session shape:** anh's instructions were consistently terse and typo-heavy
("làm đi", "sửa đi", "xử lý đi em", "lm nốt 1 và 2 đi") — he expects deep independent
verification (run the actual test, diff against the actual live file, not just trust
a prior agent's report or a code review) before claiming something works, especially
on security-relevant changes. See [[user-tam-profile]] for his broader working style.


### reference_yamtam_github_app_deploy.md

---
name: reference-yamtam-github-app-deploy
description: Deploy endpoints/IDs and known gotchas for the Yana AI GitHub App (Cloudflare Worker), renamed from yamtam-github-app on 2026-06-24
metadata: 
  node_type: memory
  type: reference
  originSessionId: a0fc0105-f578-486f-8e84-af9438c03459
---

This is Yana AI's GitHub App (Cloudflare Worker). Recovered 2026-06-18 from a crashed
session — verify before relying on these IDs/URLs. **Updated 2026-06-24**: worker
renamed `yamtam-github-app` → `yana-github-app` in `github-app/wrangler.toml`
(`name`, `package.json`, `src/index.ts` health endpoint, README webhook URL all
aligned in PR #17, https://github.com/yanacuti1121/Yana-AI/pull/17). Root
`wrangler.jsonc` worker also renamed `yamtam-engine` → `yana`. The exact new live
URL (subdomain depends on Cloudflare account, not necessarily `phamlongh230`) was
**not** re-verified live this session — confirm before assuming it matches the old
`https://yamtam-github-app.phamlongh230.workers.dev/webhook` pattern.

- GitHub App ID: 3936497, Client ID: Iv23cteNyUQiV4UKENny
- Cloudflare account: phamlongh230@gmail.com, account_id `4fbd0d5366c3ae24fb7aec18ba7ddefc` (added to `github-app/wrangler.toml` 2026-06-24)

Redeploy gotchas:
1. Private key must be PKCS#8 — GitHub exports PKCS#1, needs conversion first.
2. `APP_ID` must be a plain var in wrangler.toml, not a secret.
3. In Codespace, deploy with `CLOUDFLARE_API_TOKEN=xxx npx wrangler deploy`.
4. **CRITICAL — never drop the private key `.pem` anywhere under `docs/`.**
   `docs/` is simultaneously the GitHub Pages source (`gh api repos/.../pages` →
   `source.path: /docs`) AND the root Worker's static assets directory
   (`wrangler.jsonc` → `"assets":{"directory":"docs"}`, no `.assetsignore` exists
   to exclude anything). A key dropped there is one `wrangler deploy` away from
   being served publicly on both surfaces. Found+fixed 2026-06-24: a real
   `yana-ai-bot.*.private-key.pem` was sitting untracked in `docs/`, moved to
   `~/secrets/` outside the repo. See [[feedback_repo_tooling_gotchas]] for the
   matching `core/skills/` structural gotcha discovered the same session.


### user_tam_profile.md

---
name: user-tam-profile
description: "Anh Tâm's working style (ENFP-T) — big-picture thinker, tends to expand scope mid-task"
metadata: 
  node_type: memory
  type: user
  originSessionId: a0fc0105-f578-486f-8e84-af9438c03459
---

Anh Tâm is ENFP-T. Thinks broadly, sees the big picture fast, writes clear architecture/framing but tends to skip edge cases and error contracts. Prone to expanding scope mid-session — easy to lose track of the original task.

**How to apply:** When anh starts adding a new feature/idea ("à mà còn cái này nữa") while the current task isn't committed/finished yet, don't silently follow along — flag it. See [[feedback-scope-expansion-guard]].

Recovered 2026-06-18 from a crashed Codespace session (other project: jnmt-claude-code-agenl-21 / yamtam-engine). Treat as ~2 weeks stale relative to that project's actual state — re-verify specifics before acting if that project resurfaces.


---
## RESTORE — Cách dùng trên máy mới

```
# 1. Clone repo
git clone https://github.com/yanacuti1121/Yana-AI
cd Yana-AI

# 2. Tạo lại .claude/assistant/
mkdir -p .claude/assistant
# Copy context.md và memory.md từ PHẦN 1 của file này vào .claude/assistant/

# 3. Tạo lại Claude Code auto-memory
MEMDIR=~/.claude/projects/-workspaces-Yana-AI/memory
mkdir -p $MEMDIR
# Copy MEMORY.md (PHẦN 2) và các file .md (PHẦN 3) vào $MEMDIR
```