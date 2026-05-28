#!/usr/bin/env python3
"""yamtam template list/show — list and preview policy templates."""

import argparse
import json
import os
import sys

REPO_ROOT     = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TEMPLATES_DIR = os.path.join(REPO_ROOT, "policy", "templates")

BOLD  = "\033[1m"; GREEN = "\033[32m"; CYAN  = "\033[36m"
DIM   = "\033[2m"; RED   = "\033[31m"; RESET = "\033[0m"

TEMPLATE_META = {
    "claude-settings.json": {
        "name": "claude-settings",
        "desc": "Safe Claude Code settings — scoped tools, no dangerouslyAllowAll",
        "fixes": ["AC001","AC002","AC003","AC004"],
        "output": ".claude/settings.json",
    },
    "mcp-minimal.json": {
        "name": "mcp-minimal",
        "desc": "Minimal MCP config — no full-root filesystem access",
        "fixes": ["MCP001","MCP002","MCP003"],
        "output": ".mcp.json",
    },
    "ci-safe.yml": {
        "name": "ci-safe",
        "desc": "Safe GitHub Actions workflow — permissions, approval gates",
        "fixes": ["CI001","CI003","CI007"],
        "output": ".github/workflows/yamtam-audit.yml",
    },
    "env-example.txt": {
        "name": "env-example",
        "desc": ".env.example template — shows required vars without real secrets",
        "fixes": ["SE001","SE002"],
        "output": ".env.example",
    },
    "gitignore-ai.txt": {
        "name": "gitignore-ai",
        "desc": ".gitignore additions for AI agent projects",
        "fixes": ["SE003","AU002"],
        "output": ".gitignore",
    },
}

def no_color():
    return os.environ.get("YAMTAM_NO_COLOR") or not sys.stdout.isatty()

def c(code, text):
    return text if no_color() else f"{code}{text}{RESET}"


def cmd_list(as_json: bool):
    templates = []
    for fn, meta in TEMPLATE_META.items():
        path = os.path.join(TEMPLATES_DIR, fn)
        size = os.path.getsize(path) if os.path.exists(path) else 0
        templates.append({**meta, "file": fn, "size": size})

    # Also detect any extra templates not in meta
    if os.path.exists(TEMPLATES_DIR):
        for fn in sorted(os.listdir(TEMPLATES_DIR)):
            if fn not in TEMPLATE_META:
                path = os.path.join(TEMPLATES_DIR, fn)
                templates.append({
                    "name": fn.replace(".json","").replace(".yml","").replace(".txt",""),
                    "file": fn,
                    "desc": "Custom template",
                    "fixes": [],
                    "size": os.path.getsize(path),
                })

    if as_json:
        print(json.dumps(templates, indent=2))
        return

    print()
    print(c(BOLD, "  Policy Templates"))
    print()
    print(f"  {'NAME':<20} {'FIXES':<20} {'OUTPUT':<35} DESCRIPTION")
    print(f"  {'─'*95}")
    for t in templates:
        fixes = ", ".join(t.get("fixes",[])[:3])
        print(f"  {c(CYAN, t['name']):<29} {c(DIM, fixes):<29} {c(DIM, t.get('output','')):<44} {t['desc']}")
    print()
    print(c(DIM, "  Use: yamtam init-policy <name>  or  yamtam init-policy list"))
    print()


def cmd_show(name: str):
    # Find by name or filename
    matched = None
    for fn, meta in TEMPLATE_META.items():
        if meta["name"] == name or fn == name or fn.startswith(name):
            matched = fn; break
    if not matched:
        # Try exact filename
        if os.path.exists(os.path.join(TEMPLATES_DIR, name)):
            matched = name

    if not matched:
        print(c(RED, f"  ✗ Template '{name}' not found")); sys.exit(1)

    path = os.path.join(TEMPLATES_DIR, matched)
    meta = TEMPLATE_META.get(matched, {})

    print()
    if meta:
        print(c(BOLD, f"  {meta.get('name',name)}"))
        print(c(DIM, f"  {meta.get('desc','')}"))
        print(c(DIM, f"  Fixes: {', '.join(meta.get('fixes',[]))}"))
        print(c(DIM, f"  Output: {meta.get('output','')}"))
        print()

    with open(path) as f:
        print(f.read())


def main():
    parser = argparse.ArgumentParser(prog="yamtam template",
                                     description="List and preview policy templates")
    sub = parser.add_subparsers(dest="subcmd")
    p_list = sub.add_parser("list", help="List all templates")
    p_list.add_argument("--json", action="store_true")
    p_show = sub.add_parser("show", help="Preview a template")
    p_show.add_argument("name")

    # bare: yamtam template (= list)
    parser.add_argument("--json", action="store_true", help=argparse.SUPPRESS)

    args = parser.parse_args()

    if args.subcmd == "list" or not args.subcmd:
        cmd_list(getattr(args, "json", False))
    elif args.subcmd == "show":
        cmd_show(args.name)


if __name__ == "__main__":
    main()
