#!/usr/bin/env bash
# Stack detection shared by format-lint.sh and gate.sh.
# Every function is safe to call from any directory; they operate on PROJECT_ROOT.

set -uo pipefail

# Exported so the python3 helpers below can read it from the environment.
export PROJECT_ROOT="${CLAUDE_PROJECT_DIR:-$(pwd)}"

# Optional per-repository overrides. Create .claude/gate.config.sh to set:
#   LINT_COMMAND, FORMAT_COMMAND, TYPECHECK_COMMAND, TEST_COMMAND, GATE_ENABLED
GATE_ENABLED="${GATE_ENABLED:-1}"
LINT_COMMAND="${LINT_COMMAND:-}"
FORMAT_COMMAND="${FORMAT_COMMAND:-}"
TYPECHECK_COMMAND="${TYPECHECK_COMMAND:-}"
TEST_COMMAND="${TEST_COMMAND:-}"

if [ -f "$PROJECT_ROOT/.claude/gate.config.sh" ]; then
  # shellcheck disable=SC1091
  source "$PROJECT_ROOT/.claude/gate.config.sh"
fi

detect_node_package_manager() {
  if [ -f "$PROJECT_ROOT/pnpm-lock.yaml" ]; then printf 'pnpm'
  elif [ -f "$PROJECT_ROOT/yarn.lock" ]; then printf 'yarn'
  elif [ -f "$PROJECT_ROOT/bun.lockb" ] || [ -f "$PROJECT_ROOT/bun.lock" ]; then printf 'bun'
  elif [ -f "$PROJECT_ROOT/package-lock.json" ]; then printf 'npm'
  elif [ -f "$PROJECT_ROOT/package.json" ]; then printf 'npm'
  fi
}

has_node_script() {
  local script_name="$1"
  [ -f "$PROJECT_ROOT/package.json" ] || return 1
  if command -v python3 >/dev/null 2>&1; then
    SCRIPT_NAME="$script_name" python3 -c '
import json, os, sys
try:
    with open(os.path.join(os.environ["PROJECT_ROOT"], "package.json")) as handle:
        scripts = (json.load(handle) or {}).get("scripts") or {}
except Exception:
    sys.exit(1)
sys.exit(0 if os.environ["SCRIPT_NAME"] in scripts else 1)
' 2>/dev/null
  else
    grep -Eq "\"$script_name\"[[:space:]]*:" "$PROJECT_ROOT/package.json"
  fi
}

is_python_project() {
  [ -f "$PROJECT_ROOT/pyproject.toml" ] || [ -f "$PROJECT_ROOT/requirements.txt" ] ||
    [ -f "$PROJECT_ROOT/setup.cfg" ] || [ -f "$PROJECT_ROOT/Pipfile" ]
}

python_runner() {
  if [ -x "$PROJECT_ROOT/.venv/bin/python" ]; then printf '%s/.venv/bin/' "$PROJECT_ROOT"
  elif command -v uv >/dev/null 2>&1 && [ -f "$PROJECT_ROOT/uv.lock" ]; then printf 'uv run '
  elif command -v poetry >/dev/null 2>&1 && grep -q 'tool.poetry' "$PROJECT_ROOT/pyproject.toml" 2>/dev/null; then printf 'poetry run '
  fi
}
