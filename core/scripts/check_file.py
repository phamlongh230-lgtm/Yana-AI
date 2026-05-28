#!/usr/bin/env python3
"""yamtam check <file> — scan a single file against all matching rules."""

import argparse
import glob
import json
import os
import re
import sys
import yaml

REPO_ROOT   = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SCANNER_DIR = os.path.join(REPO_ROOT, "scanner")

BOLD  = "\033[1m"; RED   = "\033[31m"; YELLOW = "\033[33m"
GREEN = "\033[32m"; CYAN  = "\033[36m"; DIM   = "\033[2m"; RESET = "\033[0m"
SEV_COLOR = {"CRITICAL": RED, "HIGH": RED, "MED": YELLOW, "MEDIUM": YELLOW, "LOW": ""}

def no_color():
    return os.environ.get("YAMTAM_NO_COLOR") or not sys.stdout.isatty()

def c(code, text):
    return text if no_color() else f"{code}{text}{RESET}"


def load_rules() -> list[dict]:
    rules = []
    for path in sorted(glob.glob(os.path.join(SCANNER_DIR, "*.yml"))):
        try:
            with open(path) as f:
                data = yaml.safe_load(f)
            rules.extend(data.get("checks", []))
        except Exception:
            pass
    return rules


def file_matches_target(filepath: str, target_pattern: str) -> bool:
    basename = os.path.basename(filepath)
    if target_pattern.startswith("*"):
        return basename.endswith(target_pattern[1:]) or \
               re.search(re.escape(target_pattern[1:]), filepath)
    if target_pattern.startswith("."):
        return filepath == target_pattern or filepath.endswith("/" + target_pattern) or \
               basename == target_pattern
    return target_pattern in filepath or basename == os.path.basename(target_pattern)


def check_regex(content: str, pattern: str) -> list[int]:
    lines = []
    for i, line in enumerate(content.splitlines(), 1):
        if re.search(pattern, line, re.IGNORECASE):
            lines.append(i)
    return lines


def run_check(filepath: str, rule: dict) -> list[dict]:
    target  = rule.get("target", "")
    if not file_matches_target(filepath, target):
        return []

    try:
        with open(filepath) as f:
            content = f.read()
    except Exception:
        return []

    match   = rule.get("match", {})
    mtype   = match.get("type", "regex")
    pattern = match.get("pattern", "")
    findings = []

    if mtype == "exists":
        if os.path.exists(filepath):
            findings.append({"line": None})
    elif mtype == "not_exists":
        if not os.path.exists(filepath):
            findings.append({"line": None})
    elif mtype == "regex" and pattern:
        for line_no in check_regex(content, pattern):
            findings.append({"line": line_no})
    elif mtype == "json":
        try:
            data = json.loads(content)
            jpath = match.get("path", "")
            val   = match.get("value")
            pat   = match.get("pattern", "")
            # Simple JSON path: $.key[*] or $.key.subkey
            parts = [p for p in re.split(r'[\.\[\]]', jpath) if p and p != "*" and p != "$"]
            node  = data
            for part in parts:
                if isinstance(node, dict):
                    node = node.get(part, {})
                elif isinstance(node, list):
                    node = [item.get(part) for item in node if isinstance(item, dict)]
            items = node if isinstance(node, list) else [node]
            for item in items:
                if val is not None and item == val:
                    findings.append({"line": None})
                elif pat and isinstance(item, str) and re.search(pat, item):
                    findings.append({"line": None})
        except Exception:
            pass

    return [
        {
            "id":          rule.get("id","?"),
            "severity":    rule.get("severity","LOW"),
            "file":        filepath,
            "line":        f.get("line"),
            "description": rule.get("description",""),
            "fix":         rule.get("fix",""),
        }
        for f in findings
    ]


def main():
    parser = argparse.ArgumentParser(
        prog="yamtam check",
        description="Scan a single file against all matching rules",
    )
    parser.add_argument("file",   help="File to scan")
    parser.add_argument("--json", action="store_true")
    parser.add_argument("--severity", default=None,
                        choices=["critical","high","med","medium","low"],
                        help="Show only findings at this severity+")
    args = parser.parse_args()

    if not os.path.exists(args.file):
        print(c(RED, f"  ✗ File not found: {args.file}")); sys.exit(1)

    rules    = load_rules()
    findings = []
    for rule in rules:
        findings.extend(run_check(args.file, rule))

    # Severity filter
    if args.severity:
        order = {"critical":0,"high":1,"med":2,"medium":2,"low":3}
        thr   = order.get(args.severity.lower(), 3)
        findings = [f for f in findings
                    if order.get(f["severity"].lower(), 3) <= thr]

    if args.json:
        print(json.dumps({"file": args.file, "findings": findings}, indent=2))
        return

    print()
    print(c(BOLD, f"  yamtam check") + c(DIM, f" — {args.file}"))
    print()

    if not findings:
        print(c(GREEN, f"  ✓ No findings in {os.path.basename(args.file)}"))
    else:
        for f in findings:
            sev = f["severity"].upper()
            sc  = SEV_COLOR.get(sev, "")
            loc = f":{f['line']}" if f["line"] else ""
            print(f"  {c(sc, sev):<18} {f['id']}  {os.path.basename(args.file)}{loc}")
            print(c(DIM, f"    {f['description']}"))
            if f["fix"]:
                print(c(DIM, f"    → {f['fix']}"))
            print()

    print(c(DIM, f"  {len(findings)} findings  ·  {len(rules)} rules checked"))
    print()

    if findings:
        sys.exit(1)


if __name__ == "__main__":
    main()
