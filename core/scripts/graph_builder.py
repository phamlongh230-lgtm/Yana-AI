#!/usr/bin/env python3
"""
graph_builder.py — knowledge graph pipeline for yana-ai graph build

Adapted from Lum1104/Understand-Anything (MIT) — pipeline architecture,
node/edge schema, layer heuristics.

Stages:
  1. project_scan   — file discovery, language/framework detection, import map
  2. file_analyze   — extract nodes (files, functions, classes) + edges, batched
  3. arch_analyze   — assign architectural layers by directory heuristics
  4. tour_build     — dependency-ordered guided tour
  5. assemble       — write .yana-ai/graph/knowledge-graph.json
"""

import ast
import hashlib
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

# ── Constants ─────────────────────────────────────────────────────────────────

SCHEMA_VERSION = "1.0"
BATCH_SIZE = 20
GRAPH_DIR = ".yana-ai/graph"
GRAPH_FILE = "knowledge-graph.json"

IGNORE_DIRS = {
    "node_modules", ".git", ".yana-ai", "dist", "build", "__pycache__",
    ".cache", "coverage", ".next", "target", "venv", ".venv", ".tox",
    "vendor", "tmp", ".tmp", "releases", ".claude-plugin",
}

IGNORE_EXTS = {".pyc", ".pyo", ".class", ".o", ".so", ".dylib", ".dll",
               ".exe", ".bin", ".zip", ".tar", ".gz", ".lock",
               ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico",
               ".woff", ".woff2", ".ttf", ".eot", ".pdf",
               ".min.js", ".min.css"}

LANG_MAP = {
    ".py": "Python", ".ts": "TypeScript", ".tsx": "TypeScript",
    ".js": "JavaScript", ".jsx": "JavaScript", ".mjs": "JavaScript",
    ".rs": "Rust", ".go": "Go", ".java": "Java", ".kt": "Kotlin",
    ".cs": "C#", ".rb": "Ruby", ".php": "PHP", ".swift": "Swift",
    ".c": "C", ".cpp": "C++", ".h": "C/C++", ".hpp": "C++",
    ".sh": "Shell", ".bash": "Shell", ".zsh": "Shell",
    ".yml": "YAML", ".yaml": "YAML", ".json": "JSON",
    ".toml": "TOML", ".md": "Markdown", ".mdx": "Markdown",
    ".html": "HTML", ".css": "CSS", ".scss": "CSS",
    ".sql": "SQL", ".graphql": "GraphQL",
}

FRAMEWORK_SIGNALS = {
    "package.json":     lambda d: _detect_npm_frameworks(d),
    "requirements.txt": lambda _: ["Python"],
    "pyproject.toml":   lambda d: _detect_python_frameworks(d),
    "Cargo.toml":       lambda _: ["Rust/Cargo"],
    "go.mod":           lambda _: ["Go modules"],
    "pom.xml":          lambda _: ["Maven/Java"],
    "build.gradle":     lambda _: ["Gradle/Java"],
    "Gemfile":          lambda _: ["Ruby/Rails"],
    "composer.json":    lambda _: ["PHP/Composer"],
}

LAYER_PATTERNS: list[tuple[str, list[str]]] = [
    ("api",   ["routes", "route", "api", "controllers", "controller", "endpoints", "endpoint", "handlers", "handler", "rest", "graphql"]),
    ("service", ["services", "service", "core", "domain", "usecases", "use_cases", "business", "logic"]),
    ("data",  ["models", "model", "schemas", "schema", "migrations", "migration", "db", "database", "repositories", "repository", "entities", "entity"]),
    ("ui",    ["components", "component", "views", "view", "pages", "page", "ui", "frontend", "widgets", "widget"]),
    ("config",["config", "configs", "settings", "setting", "env", "constants", "constant"]),
    ("test",  ["tests", "test", "spec", "specs", "__tests__", "e2e"]),
    ("docs",  ["docs", "doc", "documentation", "wiki"]),
    ("util",  ["utils", "util", "helpers", "helper", "lib", "libs", "shared", "common", "tools", "tool", "scripts", "script"]),
]

BOLD = "\033[1m"; GREEN = "\033[32m"; RED = "\033[31m"
CYAN = "\033[36m"; DIM = "\033[2m"; YELLOW = "\033[33m"; RESET = "\033[0m"


def no_color():
    return os.environ.get("YANA_NO_COLOR") or not sys.stdout.isatty()

def c(code, text):
    return text if no_color() else f"{code}{text}{RESET}"

def log(msg):
    print(f"  {msg}")

# ── Framework detection helpers ───────────────────────────────────────────────

def _detect_npm_frameworks(content: str) -> list[str]:
    try:
        data = json.loads(content)
    except Exception:
        return []
    deps = {**data.get("dependencies", {}), **data.get("devDependencies", {})}
    fw = []
    checks = [("react", "React"), ("next", "Next.js"), ("vue", "Vue"),
               ("angular", "@angular/core"), ("svelte", "Svelte"),
               ("express", "Express"), ("fastify", "Fastify"),
               ("nestjs", "@nestjs/core"), ("vite", "Vite"),
               ("typescript", "TypeScript")]
    for key, name in checks:
        if any(key in d.lower() for d in deps):
            fw.append(name)
    return fw


def _detect_python_frameworks(content: str) -> list[str]:
    fw = []
    for name, pat in [("FastAPI", "fastapi"), ("Django", "django"),
                       ("Flask", "flask"), ("Pydantic", "pydantic"),
                       ("SQLAlchemy", "sqlalchemy")]:
        if pat in content.lower():
            fw.append(name)
    return fw

# ── Stage 1: Project scan ─────────────────────────────────────────────────────

def project_scan(target: str) -> dict:
    target = os.path.abspath(target)
    files = []
    lang_count: dict[str, int] = {}
    frameworks: list[str] = []
    manifest_content = {}

    for root, dirs, fnames in os.walk(target):
        dirs[:] = sorted(d for d in dirs if d not in IGNORE_DIRS and not d.startswith("."))
        for fname in fnames:
            ext = "." + fname.rsplit(".", 1)[-1] if "." in fname else ""
            if ext in IGNORE_EXTS or fname.startswith("."):
                continue
            full_path = os.path.join(root, fname)
            rel_path = os.path.relpath(full_path, target)
            lang = LANG_MAP.get(ext.lower(), "Other")
            try:
                size = os.path.getsize(full_path)
                lines = 0
                with open(full_path, errors="replace") as f:
                    content = f.read()
                lines = content.count("\n") + 1
            except OSError:
                continue

            # Collect manifest content for framework detection
            if fname in FRAMEWORK_SIGNALS:
                try:
                    manifest_content[fname] = content
                    fw = FRAMEWORK_SIGNALS[fname](content)
                    frameworks.extend(fw)
                except Exception:
                    pass

            files.append({
                "path": rel_path,
                "language": lang,
                "size_bytes": size,
                "size_lines": lines,
                "category": _file_category(fname, rel_path),
            })
            lang_count[lang] = lang_count.get(lang, 0) + 1

    # Sort languages by file count
    languages = [l for l, _ in sorted(lang_count.items(), key=lambda x: -x[1])
                 if l not in ("Other", "YAML", "JSON", "TOML", "Markdown")]

    # Build import map (regex-based)
    import_map = _build_import_map(target, files)

    # Project name from directory or package.json
    name = os.path.basename(target)
    description = ""
    if "package.json" in manifest_content:
        try:
            pkg = json.loads(manifest_content["package.json"])
            name = pkg.get("name", name)
            description = pkg.get("description", "")
        except Exception:
            pass

    return {
        "name": name,
        "description": description,
        "languages": languages[:5],
        "frameworks": list(dict.fromkeys(frameworks))[:6],
        "files": files,
        "total_files": len(files),
        "import_map": import_map,
    }


def _file_category(fname: str, rel_path: str) -> str:
    ext = ("." + fname.rsplit(".", 1)[-1]).lower() if "." in fname else ""
    if ext in (".md", ".mdx", ".rst", ".txt"):
        return "document"
    if ext in (".json", ".yml", ".yaml", ".toml", ".ini", ".env"):
        return "config"
    if ext in (".css", ".scss", ".sass", ".less"):
        return "style"
    if "test" in rel_path.lower() or "spec" in rel_path.lower():
        return "test"
    if ext in (".sh", ".bash", ".ps1"):
        return "script"
    return "source"


def _build_import_map(target: str, files: list[dict]) -> dict[str, list[str]]:
    import_map: dict[str, list[str]] = {}
    source_files = {f["path"] for f in files if f["category"] == "source"}

    IMPORT_RES: list[tuple[str, re.Pattern]] = [
        ("Python",     re.compile(r'^\s*(?:from|import)\s+([\w.]+)', re.MULTILINE)),
        ("TypeScript", re.compile(r'''(?:import|from)\s+['"]([^'"]+)['"]''', re.MULTILINE)),
        ("JavaScript", re.compile(r'''(?:import|require)\s*\(?['"]([^'"]+)['"]''', re.MULTILINE)),
        ("Rust",       re.compile(r'^\s*use\s+([\w:]+)', re.MULTILINE)),
        ("Go",         re.compile(r'"([\w./]+)"', re.MULTILINE)),
    ]

    for finfo in files:
        if finfo["category"] != "source":
            continue
        path = finfo["path"]
        full = os.path.join(target, path)
        try:
            with open(full, errors="replace") as f:
                content = f.read(8192)
        except OSError:
            continue

        lang = finfo["language"]
        pattern = next((p for l, p in IMPORT_RES if l == lang), None)
        if not pattern:
            continue

        raw_imports = pattern.findall(content)
        resolved = []
        for imp in raw_imports:
            # Only keep internal (relative) imports
            if imp.startswith(".") or "/" in imp:
                # Attempt to resolve to actual file path
                base_dir = os.path.dirname(path)
                candidate = os.path.normpath(os.path.join(base_dir, imp))
                # Try with common extensions
                for ext in ["", ".ts", ".tsx", ".js", ".py", ".rs"]:
                    trial = candidate + ext
                    if trial in source_files:
                        resolved.append(trial)
                        break
        if resolved:
            import_map[path] = list(dict.fromkeys(resolved))

    return import_map

# ── Stage 2: File analyze (batched) ──────────────────────────────────────────

def file_analyze(target: str, scan: dict) -> tuple[list[dict], list[dict]]:
    """Return (nodes, edges) for all files."""
    nodes: list[dict] = []
    edges: list[dict] = []
    files = scan["files"]

    for i in range(0, len(files), BATCH_SIZE):
        batch = files[i:i + BATCH_SIZE]
        for finfo in batch:
            _analyze_file(target, finfo, scan["import_map"], nodes, edges)

    return nodes, edges


def _analyze_file(target: str, finfo: dict, import_map: dict,
                  nodes: list, edges: list) -> None:
    path = finfo["path"]
    full = os.path.join(target, path)
    lang = finfo["language"]
    node_id = f"file:{path}"

    complexity = _estimate_complexity(finfo["size_lines"])

    file_node = {
        "id": node_id,
        "type": "file",
        "name": os.path.basename(path),
        "file_path": path,
        "language": lang,
        "summary": "",
        "complexity": complexity,
        "tags": _tags_for_file(path, lang, finfo["category"]),
        "line_range": None,
        "category": finfo["category"],
    }
    nodes.append(file_node)

    # Import edges
    for dep in import_map.get(path, []):
        edges.append({
            "source": node_id,
            "target": f"file:{dep}",
            "type": "imports",
            "weight": 0.7,
        })

    # Extract sub-nodes (functions, classes) for source files
    if finfo["category"] == "source" and finfo["size_lines"] < 2000:
        try:
            with open(full, errors="replace") as f:
                content = f.read()
        except OSError:
            return

        if lang == "Python":
            _extract_python_nodes(content, path, node_id, nodes, edges)
        elif lang in ("TypeScript", "JavaScript"):
            _extract_ts_nodes(content, path, node_id, nodes, edges)


def _estimate_complexity(lines: int) -> str:
    if lines < 50:
        return "low"
    if lines < 200:
        return "moderate"
    return "high"


def _tags_for_file(path: str, lang: str, category: str) -> list[str]:
    tags = [lang.lower().replace("/", "-"), category]
    parts = path.replace("\\", "/").lower().split("/")
    for part in parts[:-1]:
        for layer_id, patterns in LAYER_PATTERNS:
            if part in patterns:
                tags.append(layer_id)
                break
    return list(dict.fromkeys(tags))[:5]


def _extract_python_nodes(content: str, file_path: str, file_node_id: str,
                           nodes: list, edges: list) -> None:
    try:
        tree = ast.parse(content)
    except SyntaxError:
        return

    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            # Only top-level or class-level functions
            nid = f"function:{file_path}:{node.name}"
            end_line = getattr(node, "end_lineno", node.lineno + 1)
            nodes.append({
                "id": nid,
                "type": "function",
                "name": node.name,
                "file_path": file_path,
                "language": "Python",
                "summary": ast.get_docstring(node) or "",
                "complexity": _estimate_complexity(end_line - node.lineno),
                "tags": ["python", "function"],
                "line_range": [node.lineno, end_line],
                "category": "source",
            })
            edges.append({
                "source": file_node_id,
                "target": nid,
                "type": "contains",
                "weight": 1.0,
            })
        elif isinstance(node, ast.ClassDef):
            nid = f"class:{file_path}:{node.name}"
            end_line = getattr(node, "end_lineno", node.lineno + 1)
            nodes.append({
                "id": nid,
                "type": "class",
                "name": node.name,
                "file_path": file_path,
                "language": "Python",
                "summary": ast.get_docstring(node) or "",
                "complexity": _estimate_complexity(end_line - node.lineno),
                "tags": ["python", "class"],
                "line_range": [node.lineno, end_line],
                "category": "source",
            })
            edges.append({
                "source": file_node_id,
                "target": nid,
                "type": "contains",
                "weight": 1.0,
            })


_TS_FUNC_RE = re.compile(
    r'(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*[(<]|'
    r'(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s*)?\(',
    re.MULTILINE
)
_TS_CLASS_RE = re.compile(
    r'(?:export\s+)?(?:abstract\s+)?class\s+(\w+)', re.MULTILINE
)


def _extract_ts_nodes(content: str, file_path: str, file_node_id: str,
                       nodes: list, edges: list) -> None:
    for m in _TS_FUNC_RE.finditer(content):
        name = m.group(1) or m.group(2)
        if not name or name in ("if", "for", "while", "switch"):
            continue
        line = content[:m.start()].count("\n") + 1
        nid = f"function:{file_path}:{name}"
        nodes.append({
            "id": nid,
            "type": "function",
            "name": name,
            "file_path": file_path,
            "language": "TypeScript",
            "summary": "",
            "complexity": "low",
            "tags": ["typescript", "function"],
            "line_range": [line, line + 1],
            "category": "source",
        })
        edges.append({"source": file_node_id, "target": nid,
                       "type": "contains", "weight": 1.0})

    for m in _TS_CLASS_RE.finditer(content):
        name = m.group(1)
        line = content[:m.start()].count("\n") + 1
        nid = f"class:{file_path}:{name}"
        nodes.append({
            "id": nid,
            "type": "class",
            "name": name,
            "file_path": file_path,
            "language": "TypeScript",
            "summary": "",
            "complexity": "low",
            "tags": ["typescript", "class"],
            "line_range": [line, line + 1],
            "category": "source",
        })
        edges.append({"source": file_node_id, "target": nid,
                       "type": "contains", "weight": 1.0})

# ── Stage 3: Architecture analyze ────────────────────────────────────────────

def arch_analyze(nodes: list[dict]) -> list[dict]:
    """Assign nodes to architectural layers based on path heuristics."""
    layer_members: dict[str, list[str]] = {lid: [] for lid, _ in LAYER_PATTERNS}
    layer_members["unknown"] = []

    for node in nodes:
        if node["type"] != "file":
            continue
        path_lower = node["file_path"].replace("\\", "/").lower()
        parts = path_lower.split("/")
        assigned = False
        for lid, patterns in LAYER_PATTERNS:
            if any(p in parts for p in patterns):
                layer_members[lid].append(node["id"])
                assigned = True
                break
        if not assigned:
            layer_members["unknown"].append(node["id"])

    layer_labels = {
        "api": "API Layer",
        "service": "Service Layer",
        "data": "Data Layer",
        "ui": "UI Layer",
        "config": "Config Layer",
        "test": "Test Layer",
        "docs": "Documentation",
        "util": "Utilities",
        "unknown": "Uncategorized",
    }

    return [
        {
            "id": lid,
            "name": layer_labels[lid],
            "description": f"Files assigned to {layer_labels[lid]} by directory convention.",
            "members": members,
        }
        for lid, members in layer_members.items()
        if members
    ]

# ── Stage 4: Tour build ───────────────────────────────────────────────────────

def tour_build(nodes: list[dict], edges: list[dict]) -> list[dict]:
    """Build dependency-ordered guided tour starting from entry points."""
    file_node_ids = {n["id"] for n in nodes if n["type"] == "file"}
    import_edges = [e for e in edges if e["type"] == "imports"
                    and e["source"] in file_node_ids]

    # Count incoming import edges per node
    in_degree: dict[str, int] = {nid: 0 for nid in file_node_ids}
    for e in import_edges:
        tgt = e["target"]
        if tgt in in_degree:
            in_degree[tgt] = in_degree.get(tgt, 0) + 1

    # Topological sort (Kahn's algorithm)
    from collections import deque
    queue = deque(sorted(
        [nid for nid, deg in in_degree.items() if deg == 0],
        key=lambda x: x
    ))
    adj: dict[str, list[str]] = {}
    for e in import_edges:
        adj.setdefault(e["source"], []).append(e["target"])

    order = []
    visited = set()
    while queue:
        nid = queue.popleft()
        if nid in visited:
            continue
        visited.add(nid)
        order.append(nid)
        for neighbor in adj.get(nid, []):
            if neighbor in in_degree:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)

    # Any nodes not visited (cycles)
    for nid in sorted(file_node_ids - visited):
        order.append(nid)

    REASONS = [
        "Entry point — no dependencies, start here",
        "Core foundation — imported by many other modules",
        "Key module — central to the architecture",
        "Supporting module",
        "Peripheral module",
    ]

    tour = []
    for step, nid in enumerate(order[:30], 1):
        node = next((n for n in nodes if n["id"] == nid), None)
        if not node:
            continue
        reason_idx = min(step - 1, len(REASONS) - 1)
        if step > 5:
            reason_idx = min(3 + (step - 5) // 5, len(REASONS) - 1)
        tour.append({
            "step": step,
            "node_id": nid,
            "file_path": node.get("file_path", ""),
            "reason": REASONS[reason_idx],
        })

    return tour

# ── Stage 5: Assemble ─────────────────────────────────────────────────────────

def assemble(target: str, scan: dict, nodes: list, edges: list,
             layers: list, tour: list) -> dict:
    graph = {
        "schema_version": SCHEMA_VERSION,
        "project": {
            "name": scan["name"],
            "description": scan["description"],
            "languages": scan["languages"],
            "frameworks": scan["frameworks"],
            "total_files": scan["total_files"],
            "analysis_timestamp": datetime.now(timezone.utc).isoformat(),
        },
        "nodes": nodes,
        "edges": edges,
        "layers": layers,
        "tour": tour,
    }

    graph_path = os.path.join(target, GRAPH_DIR, GRAPH_FILE)
    os.makedirs(os.path.dirname(graph_path), exist_ok=True)
    with open(graph_path, "w") as f:
        json.dump(graph, f, indent=2)

    return graph


def load_graph(target: str) -> dict | None:
    graph_path = os.path.join(os.path.abspath(target), GRAPH_DIR, GRAPH_FILE)
    if not os.path.exists(graph_path):
        return None
    with open(graph_path) as f:
        return json.load(f)

# ── Main pipeline ─────────────────────────────────────────────────────────────

def build_graph(target: str, quiet: bool = False) -> dict:
    target = os.path.abspath(target)

    if not quiet:
        print()
        print(c(BOLD, "  yana-ai graph build"))
        print(c(DIM, f"  {target}"))
        print()

    steps = [
        ("Scanning project", lambda: project_scan(target)),
        None,  # placeholder for file_analyze
        ("Analyzing architecture", None),
        ("Building tour", None),
        ("Assembling graph", None),
    ]

    # Stage 1
    if not quiet: print(f"  {c(CYAN, '1/4')} Scanning project…", end="", flush=True)
    scan = project_scan(target)
    if not quiet: print(c(GREEN, f" {scan['total_files']} files, {len(scan['languages'])} languages"))

    # Stage 2
    if not quiet: print(f"  {c(CYAN, '2/4')} Analyzing files ({scan['total_files']} files, batch {BATCH_SIZE})…", end="", flush=True)
    nodes, edges = file_analyze(target, scan)
    if not quiet: print(c(GREEN, f" {len(nodes)} nodes, {len(edges)} edges"))

    # Stage 3
    if not quiet: print(f"  {c(CYAN, '3/4')} Assigning architecture layers…", end="", flush=True)
    layers = arch_analyze(nodes)
    if not quiet: print(c(GREEN, f" {len(layers)} layers"))

    # Stage 4
    if not quiet: print(f"  {c(CYAN, '4/4')} Building guided tour…", end="", flush=True)
    tour = tour_build(nodes, edges)
    if not quiet: print(c(GREEN, f" {len(tour)} steps"))

    # Assemble
    graph = assemble(target, scan, nodes, edges, layers, tour)
    graph_path = os.path.join(target, GRAPH_DIR, GRAPH_FILE)

    if not quiet:
        file_nodes = sum(1 for n in nodes if n["type"] == "file")
        fn_nodes   = sum(1 for n in nodes if n["type"] == "function")
        cls_nodes  = sum(1 for n in nodes if n["type"] == "class")
        print()
        print(f"  {c(BOLD, 'Project')}      {scan['name']}")
        if scan["description"]:
            print(f"  {c(BOLD, 'Description')}  {scan['description'][:80]}")
        print(f"  {c(BOLD, 'Languages')}    {', '.join(scan['languages'][:5]) or 'n/a'}")
        if scan["frameworks"]:
            print(f"  {c(BOLD, 'Frameworks')}   {', '.join(scan['frameworks'][:5])}")
        print(f"  {c(BOLD, 'Nodes')}        {file_nodes} files, {fn_nodes} functions, {cls_nodes} classes")
        print(f"  {c(BOLD, 'Edges')}        {len(edges)}")
        print(f"  {c(BOLD, 'Layers')}       {', '.join(l['name'] for l in layers)}")
        print()
        print(c(GREEN, f"  ✓ Graph saved: {os.path.relpath(graph_path)}"))
        print()

    return graph
