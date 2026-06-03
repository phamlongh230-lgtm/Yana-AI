---
name: headroom
description: Context compression for YAMTAM — nén tool output, log, RAG chunk trước khi vào LLM. 60-95% ít token hơn.
triggers:
  - headroom
  - compress context
  - nén context
  - giảm token
  - context quá dài
  - tool output lớn
  - context window full
---

# headroom — Context Compression

**Package**: `headroom-ai` (PyPI + npm)
**License**: Apache 2.0
**Source**: github.com/chopratejas/headroom

## Cách dùng trong YAMTAM

### 1. Compress tool output trong Python

```python
from headroom import compress

# Nén bất kỳ messages nào trước khi gửi lên LLM
result = compress(messages)

print(f"Trước: {result.tokens_before} tokens")
print(f"Sau:   {result.tokens_after} tokens")
print(f"Tiết kiệm: {result.tokens_saved} tokens ({result.compression_ratio*100:.1f}%)")

# Dùng messages đã nén
compressed_messages = result.messages
```

### 2. Compress file/log lớn

```python
from headroom import compress

with open("large_output.log") as f:
    content = f.read()

result = compress([{"role": "user", "content": content}])
# Truyền result.messages vào LLM thay vì raw content
```

### 3. Wrap Claude Code (khi có `[all]` extras)

```bash
pip install "headroom-ai[all]"
headroom wrap claude    # wrap Claude Code — nén tự động
headroom proxy --port 8787  # drop-in proxy, zero code change
```

### 4. MCP Server

```bash
headroom mcp install   # thêm vào Claude Code MCP
# Tools: headroom_compress, headroom_retrieve, headroom_stats
```

## Tích hợp với YAMTAM hooks

Thêm vào `.claude/settings.json` SessionStart:

```json
{
  "type": "command",
  "command": "headroom init hook ensure",
  "timeout": 15
}
```

## Khi nào dùng

- Tool output > 2000 tokens (bash output dài, git log, file read lớn)
- Context window sắp đầy (> 80%)
- Session dài nhiều tool calls
- RAG chunks từ vault search

## 6 thuật toán nén

| Algo | Dùng cho |
|------|----------|
| SmartCrusher | JSON arrays, nested objects |
| CodeCompressor | Python, JS, Go, Rust (AST-aware) |
| Kompress-base | Text prose, logs |
| CacheAligner | Stabilize prefix cho KV cache hit |
| CCR | Reversible — LLM retrieve on demand |
| ContentRouter | Auto-detect type → chọn algo |

## Install

```bash
pip install headroom-ai           # base library
pip install "headroom-ai[all]"   # full: proxy + MCP + ML model
npm install headroom-ai           # TypeScript/Node
```
