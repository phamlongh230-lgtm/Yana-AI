"""
yana-rt Python entry point.

Resolution order:
  1. $YANA_RT_BIN env var
  2. yana-rt on $PATH
  3. Pre-built binary shipped with package (bin/yana-rt-<platform>-<arch>)
  4. Locally built: target/release/yana-rt (cargo build --release)
"""
import os
import sys
import platform
import subprocess
from pathlib import Path

_PKG_ROOT = Path(__file__).parent.parent.parent  # src/yana-ai_engine/rt.py → repo root


def _platform_bin() -> Path:
    plat = sys.platform  # linux, darwin, win32
    arch = platform.machine().lower()
    if arch in ("amd64", "x86_64"):
        arch = "x86_64"
    ext = ".exe" if plat == "win32" else ""
    return _PKG_ROOT / "bin" / f"yana-rt-{plat}-{arch}{ext}"


def _find_binary() -> str | None:
    # 1. Explicit override
    if override := os.environ.get("YANA_RT_BIN"):
        return override

    # 2. System PATH
    import shutil
    if shutil.which("yana-rt"):
        return "yana-rt"

    # 3. Pre-built platform binary
    pb = _platform_bin()
    if pb.exists() and os.access(pb, os.X_OK):
        return str(pb)

    # 4. Local cargo build
    local = _PKG_ROOT / "target" / "release" / "yana-rt"
    if local.exists() and os.access(local, os.X_OK):
        return str(local)

    return None


def main() -> None:
    binary = _find_binary()
    if binary is None:
        print(
            "yana-rt: binary not found.\n\n"
            "To install, run one of:\n"
            f"  cargo install --path {_PKG_ROOT}  # build from source (requires Rust)\n"
            "  export YANA_RT_BIN=/path/to/yana-rt",
            file=sys.stderr,
        )
        sys.exit(1)

    result = subprocess.run([binary] + sys.argv[1:])
    sys.exit(result.returncode)


if __name__ == "__main__":
    main()
