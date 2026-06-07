---
name: microsoft--mxc
description: "Microsoft eXecution Container — sandboxed execution cho untrusted code (model output, plugins, tools). Policy-driven, cross-platform (Win/Linux/macOS), TypeScript SDK, Rust binary."
allowed-tools: Bash, Read, Write
user-invocable: true
---

MXC (Microsoft eXecution Container): chạy code không tin tưởng — model output, plugins, tools — trong sandbox có policy granular. Cross-platform, multiple isolation backends.

## Install

```bash
npm install @microsoft/mxc-sdk
```

## Usage (TypeScript SDK)

```typescript
import { MXCClient } from '@microsoft/mxc-sdk'

const client = new MXCClient()

const result = await client.exec({
  command: ['python', 'untrusted_script.py'],
  filesystem: {
    readOnly: ['/data/input'],
    readWrite: ['/tmp/output']
  },
  network: {
    outbound: false  // no network access
  },
  timeout: 30000
})
```

## JSON Config Schema (v0.6.0-alpha)

```json
{
  "version": "0.6.0-alpha",
  "command": ["node", "agent_generated_code.js"],
  "filesystem": {
    "readOnly": ["./context"],
    "readWrite": ["./output"]
  },
  "network": {
    "proxy": null,
    "outbound": false
  },
  "timeout": 30
}
```

## Isolation Backends

| Backend | Platform | Strength |
|---------|----------|----------|
| ProcessContainer | Windows (default) | lightweight |
| Bubblewrap | Linux (default) | namespace isolation |
| Seatbelt | macOS (default) | sandbox profiles |
| Windows Sandbox | Windows | full VM-lite |
| LXC | Linux | container |
| MicroVM (NanVix) | Linux | full VM |
| Hyperlight | Cross | micro-VM |

## Sandbox Lifecycle

```
provision → start → exec → stop → deprovision
```

Hỗ trợ long-running sessions, không chỉ one-shot.

## Dùng khi nào

- Chạy model-generated code an toàn
- Sandbox plugin/tool calls của agent
- CI/CD: test untrusted PR code
- Security research: execute malware sample

## Caveat

> "No MXC profiles should be treated as security boundaries currently"
Đang alpha — dùng cho dev/research, không dùng làm hard security boundary.

## Source

https://github.com/microsoft/mxc · MIT · +64⭐ today
