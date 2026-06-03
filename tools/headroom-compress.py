#!/usr/bin/env python3
"""
headroom-compress — nén stdin hoặc file trước khi vào LLM context.

Usage:
  cat large_output.txt | python3 tools/headroom-compress.py
  python3 tools/headroom-compress.py file.txt
  python3 tools/headroom-compress.py --stats file.txt
"""
import sys
import json

def main():
    try:
        from headroom import compress
    except ImportError:
        print("[headroom] Not installed. Run: pip install headroom-ai", file=sys.stderr)
        sys.exit(1)

    show_stats = "--stats" in sys.argv
    args = [a for a in sys.argv[1:] if not a.startswith("--")]

    if args:
        with open(args[0]) as f:
            content = f.read()
    else:
        content = sys.stdin.read()

    if not content.strip():
        print("[headroom] Empty input", file=sys.stderr)
        sys.exit(0)

    messages = [{"role": "user", "content": content}]
    result = compress(messages)

    if show_stats:
        print(f"[headroom] {result.tokens_before} → {result.tokens_after} tokens "
              f"({result.tokens_saved} saved, {result.compression_ratio*100:.1f}%)",
              file=sys.stderr)

    compressed = result.messages[0].get("content", content) if result.messages else content
    print(compressed)

if __name__ == "__main__":
    main()
