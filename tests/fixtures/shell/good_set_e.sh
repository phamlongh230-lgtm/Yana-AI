#!/bin/bash
# FIXTURE: good — set -e present, SH008 should NOT fire
set -euo pipefail

echo "This script has proper error handling"
some_command || true
