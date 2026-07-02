---
name: openwork-agent
description: Desktop app local-first cho AI agent workflows, thay thế mã nguồn mở cho Claude Cowork/Codex desktop. Dùng khi cần chạy OpenCode với GUI, chia sẻ workflow với team, hoặc kết nối remote OpenCode server. Triggers: "openwork", "openwork agent", "opencode desktop", "ai agent desktop app", "local agent ui", "openwork orchestrator", "chia sẻ agent workflow", "opencode gui", "different-ai openwork"
source: github.com/different-ai/openwork
license: MIT
---

# OpenWork Agent

Open source desktop app thay thế cho Claude Cowork/Codex desktop. Local-first, composable, extensible — chạy OpenCode với GUI đầy đủ.

Source: [different-ai/openwork](https://github.com/different-ai/openwork) · Download: [openworklabs.com/download](https://openworklabs.com/download)

## When to Use

- Cần GUI desktop cho OpenCode (thay vì CLI thuần)
- Muốn chia sẻ agentic workflow với team (local hoặc remote)
- Cần permission management (allow once / always / deny) cho agent actions
- Muốn skill manager để install/manage OpenCode skills
- Cần chạy OpenWork headless qua CLI (orchestrator mode)

## Core Philosophy

| Tính chất | Mô tả |
|-----------|-------|
| **Local-first** | Chạy trên máy, không cần cloud — send message ngay |
| **Composable** | Desktop app, Slack/Telegram connector, hoặc server |
| **Ejectable** | Powered by OpenCode — mọi thứ OpenCode làm được đều chạy |
| **Sharing** | Bắt đầu solo trên localhost, opt-in remote khi cần |

## Install

```bash
# Option 1: Download desktop app
# macOS / Linux: openworklabs.com/download

# Option 2: CLI orchestrator (headless)
npm install -g openwork-orchestrator
openwork start --workspace /path/to/project --approval auto

# Option 3: Build từ source
git clone https://github.com/different-ai/openwork
pnpm install
pnpm dev
```

## Modes

### Desktop App (GUI)

Chạy OpenCode cục bộ với UI đầy đủ:
- Sessions: tạo/chọn sessions, gửi prompts
- Live streaming: SSE real-time updates
- Execution plan: hiển thị todos dạng timeline
- Permissions: approve/deny agent actions
- Templates: save & re-run common workflows
- Skills manager: install `.opencode/skills`

### Client Mode

Kết nối đến OpenCode server có sẵn:

```
Settings → Add a worker → Enter URL
# hoặc connect remote OpenWork Cloud worker
```

### Orchestrator (Headless CLI)

```bash
openwork start \
  --workspace /path/to/project \
  --approval auto          # tự động approve tất cả
  # --approval manual      # hỏi từng action

# Với custom port
openwork start --workspace . --port 3456
```

## Skills Manager

OpenWork có built-in skill manager — install Claude Code / OpenCode skills:

```
UI → Skills → Import local folder
# hoặc
cp -r ./my-skill ~/.opencode/skills/my-skill/
```

Tích hợp với YAMTAM: copy YAMTAM skills vào `.opencode/skills/` để OpenWork nhận diện.

## Tích hợp với YAMTAM

OpenWork chạy OpenCode — YAMTAM có thể wrap OpenWork's orchestrator:

```bash
# Chạy OpenWork với YAMTAM safety gates
bash core/scripts/safe-run.sh "openwork start --workspace . --approval manual"
```

## Permission Model

Mỗi agent action được phân loại:
- **Allow once** — thực thi 1 lần, hỏi lại lần sau
- **Always allow** — trust vĩnh viễn cho action này
- **Deny** — block action

Tương thích với YAMTAM's human-gate-policy.

## Do NOT use for

- Non-OpenCode agents — OpenWork là wrapper cho OpenCode cụ thể
- Production server deployment — dùng orchestrator mode + proper auth
- Thay thế YAMTAM safety gates — OpenWork không có L1-L9 gate system
