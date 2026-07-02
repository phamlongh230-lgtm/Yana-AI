---
name: graphify-knowledge-graph
description: Đọc files trong project, xây knowledge graph, tìm kết nối ẩn giữa concepts. Multimodal — xử lý code, PDF, markdown, screenshot, diagram. 71.5x ít token hơn khi query so với đọc file thẳng. Triggers: "graphify", "knowledge graph", "knowledge graph từ code", "build graph", "tìm kết nối", "map codebase", "visualize dependencies", "graph codebase", "graph từ files", "safishamsi graphify", "/graphify"
source: github.com/safishamsi/graphify
license: MIT
---

# Graphify — Knowledge Graph

Claude Code skill đọc files của anh, xây knowledge graph, trả về structure anh chưa biết là có.

Source: [safishamsi/graphify](https://github.com/safishamsi/graphify) · PyPI: `graphifyy` (tạm thời)

## When to Use

- Muốn hiểu codebase lớn mà không đọc từng file
- Cần tìm "god nodes" — concept trung tâm mà mọi thứ kết nối qua
- Query relationships giữa modules, classes, functions
- Build wiki từ notes/papers/code để agent navigate
- Tiết kiệm token khi cần query nhiều lần trên cùng corpus

**Benchmark:** 71.5x ít token/query so với đọc raw files (trên mixed corpus code + papers + images).

## Install

```bash
pip install graphifyy   # tên tạm — CLI vẫn là `graphify`
graphify install        # register Claude Code skill
```

**Yêu cầu:** Claude Code + Python 3.10+

```bash
# macOS externally-managed
pipx install graphifyy

# Windows — nếu không nhận sau install
# Thêm %APPDATA%\Python\Python3xx\Scripts vào PATH
```

## Quick Start

```
/graphify .                    # build graph từ current directory
/graphify ./src                # chỉ folder src
/graphify . --mode deep        # aggressive edge extraction
/graphify . --update           # chỉ re-process files đã thay đổi
```

## Output

```
graphify-out/
├── graph.html         interactive graph — click nodes, search, filter
├── obsidian/          mở như Obsidian vault
├── wiki/              Wikipedia-style articles cho agent navigate (--wiki)
├── GRAPH_REPORT.md    god nodes, surprising connections, suggested questions
├── graph.json         persistent graph — query tuần sau không cần re-read
└── cache/             SHA256 cache — re-runs chỉ process files đã thay đổi
```

## Query

```
/graphify query "what connects auth to the database layer?"
/graphify path "UserController" "Database"
/graphify explain "RouterModule"
```

## File Types

| Loại | Extensions | Cách extract |
|------|-----------|-------------|
| Code | `.py .ts .js .go .rs .java .c .cpp` | AST via tree-sitter + call-graph |
| Docs | `.md .txt .rst` | Concepts + relationships via Claude |
| Papers | `.pdf` | Citation mining + concept extraction |
| Images | `.png .jpg .webp` | Claude vision — screenshots, diagrams |

## Advanced

```bash
/graphify . --watch          # auto-sync khi files thay đổi
/graphify . --wiki           # build agent-crawlable wiki
/graphify . --svg            # export graph.svg
/graphify . --neo4j          # generate cypher.txt cho Neo4j
/graphify . --mcp            # start MCP stdio server

graphify hook install        # git hook — rebuild graph sau mỗi commit
```

## Tích hợp với YAMTAM

Graphify output (`graph.json`) có thể dùng để tăng cường YAMTAM Context layer:

```bash
# Build graph
/graphify . --update

# Query từ L1 memory
bash core/scripts/add-fact.sh "codebase-graph" \
  "graphify graph tại graphify-out/graph.json — query connections giữa modules" \
  "high"
```

Kết hợp với `/session-context` để agent có context về architecture mà không cần đọc lại toàn bộ code.

## Thêm remote content

```
/graphify add https://arxiv.org/abs/1706.03762   # paper
/graphify add https://x.com/user/status/...      # tweet
```

## Do NOT use for

- Real-time monitoring — dùng `--watch` cho near-real-time, không phải live
- Thay thế linting/static analysis — graphify về semantic relationships, không syntax errors
- Private data tangled với external APIs — graph.json lưu locally nhưng extraction dùng Claude API
