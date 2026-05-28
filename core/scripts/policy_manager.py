#!/usr/bin/env python3
"""YAMTAM Policy Kit — safe config templates for common audit findings."""

import sys
import os
import argparse
import shutil
from pathlib import Path
from datetime import datetime

try:
    import yaml
except ImportError:
    print("Error: PyYAML required. Run: pip install pyyaml", file=sys.stderr)
    sys.exit(3)

SCRIPT_DIR = Path(__file__).parent
REPO_ROOT = SCRIPT_DIR.parent.parent
POLICY_DIR = REPO_ROOT / "policy"
INDEX_FILE = POLICY_DIR / "index.yml"

# ── colors ────────────────────────────────────────────────────────────────────

_no_color = not sys.stdout.isatty() or bool(os.environ.get("NO_COLOR"))

def _c(code, text): return text if _no_color else f"\033[{code}m{text}\033[0m"
def bold(t):   return _c("1", t)
def cyan(t):   return _c("36", t)
def green(t):  return _c("32", t)
def yellow(t): return _c("33", t)
def red(t):    return _c("31", t)
def dim(t):    return _c("2", t)

# ── helpers ───────────────────────────────────────────────────────────────────

def load_index():
    if not INDEX_FILE.exists():
        print(red(f"Error: policy index not found at {INDEX_FILE}"), file=sys.stderr)
        sys.exit(3)
    with open(INDEX_FILE) as f:
        data = yaml.safe_load(f)
    return data.get("templates", {})


def get_content(meta):
    path = POLICY_DIR / meta["file"]
    if not path.exists():
        print(red(f"Error: template file missing: {path}"), file=sys.stderr)
        sys.exit(3)
    return path.read_text()

# ── commands ──────────────────────────────────────────────────────────────────

def cmd_list(args):
    templates = load_index()
    print()
    print(bold(cyan("  YAMTAM Policy Kit")) + dim(" — available templates"))
    print()
    print(f"  {bold('NAME'):<28} {dim('TARGET'):<38} {cyan('FIXES')}")
    print(f"  {'─'*24} {'─'*34} {'─'*18}")
    for name, meta in templates.items():
        fixes = ", ".join(meta.get("fixes", []))
        target = meta.get("target", "")
        mode = " (append)" if meta.get("mode") == "append" else ""
        print(f"  {bold(name):<28} {dim(target + mode):<38} {cyan(fixes)}")
    print()
    print(dim("  yamtam policy show <name>    — print template"))
    print(dim("  yamtam policy apply <name>   — write to project"))
    print(dim("  yamtam policy fixes <id>     — find template for a check ID"))
    print()


def cmd_show(args):
    templates = load_index()
    name = args.name
    if name not in templates:
        print(red(f"Error: unknown template '{name}'"), file=sys.stderr)
        print(dim("Run 'yamtam policy list' to see available templates."), file=sys.stderr)
        sys.exit(1)

    meta = templates[name]
    content = get_content(meta)

    if not args.raw:
        print()
        print(bold(f"  {name}") + dim(f"  —  {meta.get('description', '')}"))
        print(dim(f"  Target : {meta.get('target', '')}"))
        fixes = meta.get("fixes", [])
        if fixes:
            print(dim(f"  Fixes  : {', '.join(fixes)}"))
        if meta.get("mode") == "append":
            print(dim("  Mode   : append"))
        print()
        print("  " + dim("─" * 56))
        print()
        for line in content.splitlines():
            print("  " + line)
    else:
        print(content, end="")
    print()


def cmd_apply(args):
    templates = load_index()
    name = args.name
    if name not in templates:
        print(red(f"Error: unknown template '{name}'"), file=sys.stderr)
        print(dim("Run 'yamtam policy list' to see available templates."), file=sys.stderr)
        sys.exit(1)

    meta = templates[name]
    content = get_content(meta)
    mode = meta.get("mode", "write")

    target = Path(args.target) if args.target else Path.cwd() / meta["target"]

    print()
    print(bold(f"  Applying: {name}"))
    print(dim(f"  Target:   {target}"))
    print()

    if mode == "append":
        if target.exists():
            existing = target.read_text()
            marker = f"yamtam policy apply {name}"
            if marker in existing:
                print(f"  {yellow('⚠')} Already applied — {target} unchanged.")
                print()
                return
            with open(target, "a") as f:
                f.write(content)
            print(f"  {green('✓')} Appended to {target}")
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(content.lstrip("\n"))
            print(f"  {green('✓')} Created {target}")
    else:
        if target.exists():
            ts = datetime.now().strftime("%Y%m%d%H%M%S")
            backup = target.with_name(target.name + f".bak.{ts}")
            shutil.copy2(target, backup)
            print(dim(f"  Backup:   {backup}"))
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content)
        print(f"  {green('✓')} Written to {target}")

    fixes = meta.get("fixes", [])
    if fixes:
        print(dim(f"  Fixes:    {', '.join(fixes)}"))
    print()


def cmd_fixes(args):
    templates = load_index()
    check_id = args.name.upper()

    matches = [(n, m) for n, m in templates.items()
               if check_id in [f.upper() for f in m.get("fixes", [])]]

    if not matches:
        print(f"\n  No template found for check {bold(check_id)}.\n")
        return

    print()
    for name, meta in matches:
        print(f"  {bold(name)}  {dim('—')}  {meta.get('description', '')}")
        print(dim(f"  Run: yamtam policy apply {name}"))
    print()

# ── main ──────────────────────────────────────────────────────────────────────

USAGE = """
Usage: yamtam policy <subcommand> [name] [flags]

Subcommands:
  list                 List all available templates
  show <name>          Print template content
  apply <name>         Write template to project (backs up existing file)
  fixes <check-id>     Show which template fixes a check ID (e.g. AC001)

Flags:
  --target <path>      Override the target file path (apply only)
  --raw                Print content only, no header (show only)
  --no-color           Disable color output

Examples:
  yamtam policy list
  yamtam policy show claude-settings
  yamtam policy apply claude-settings
  yamtam policy apply mcp-minimal --target /path/to/project/.mcp.json
  yamtam policy fixes AC001
  yamtam policy fixes CI006
"""


def main():
    parser = argparse.ArgumentParser(prog="yamtam policy", add_help=False)
    parser.add_argument("subcommand", nargs="?", default="list")
    parser.add_argument("name", nargs="?")
    parser.add_argument("--target")
    parser.add_argument("--raw", action="store_true")
    parser.add_argument("--no-color", action="store_true")
    parser.add_argument("-h", "--help", action="store_true")
    args = parser.parse_args()

    global _no_color
    if args.no_color:
        _no_color = True

    if args.help or args.subcommand in ("help", None):
        print(USAGE)
        return

    if args.subcommand in ("show", "apply", "fixes") and not args.name:
        print(red(f"Error: '{args.subcommand}' requires a name argument."), file=sys.stderr)
        print(dim("Run 'yamtam policy list' to see available templates."), file=sys.stderr)
        sys.exit(1)

    dispatch = {
        "list":  cmd_list,
        "show":  cmd_show,
        "apply": cmd_apply,
        "fixes": cmd_fixes,
    }

    fn = dispatch.get(args.subcommand)
    if fn is None:
        print(red(f"Error: unknown subcommand '{args.subcommand}'"), file=sys.stderr)
        sys.exit(1)

    fn(args)


if __name__ == "__main__":
    main()
