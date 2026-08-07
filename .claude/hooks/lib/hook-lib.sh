#!/usr/bin/env bash
# Shared helpers for Claude Code hooks.
# Source this file, then call hook_read_payload once before any accessor.

set -uo pipefail

HOOK_PAYLOAD=""

hook_read_payload() {
  HOOK_PAYLOAD="$(cat)"
}

# Extract a value from the hook payload using a dotted path, e.g. tool_input.file_path
hook_field() {
  local path="$1"
  if command -v python3 >/dev/null 2>&1; then
    printf '%s' "$HOOK_PAYLOAD" | HOOK_JSON_PATH="$path" python3 -c '
import json, os, sys

try:
    data = json.load(sys.stdin)
except Exception:
    sys.exit(0)

for key in os.environ["HOOK_JSON_PATH"].split("."):
    if isinstance(data, dict):
        data = data.get(key)
    else:
        data = None
        break

if data is None:
    pass
elif isinstance(data, str):
    sys.stdout.write(data)
elif isinstance(data, bool):
    sys.stdout.write("true" if data else "false")
else:
    sys.stdout.write(json.dumps(data))
'
  elif command -v jq >/dev/null 2>&1; then
    printf '%s' "$HOOK_PAYLOAD" | jq -r --arg path "$path" '
      reduce ($path | split(".")[]) as $key (.;
        if type == "object" then .[$key] else null end)
      | if . == null then "" elif type == "string" then . else tojson end' 2>/dev/null
  fi
}

# Concatenate only the content this tool call is ADDING to the file.
# Covers Write (.content), Edit (.new_string), MultiEdit (.edits[].new_string).
hook_new_content() {
  if command -v python3 >/dev/null 2>&1; then
    printf '%s' "$HOOK_PAYLOAD" | python3 -c '
import json, sys

try:
    payload = json.load(sys.stdin)
except Exception:
    sys.exit(0)

tool_input = payload.get("tool_input") or {}
parts = []

for key in ("content", "new_string", "new_source"):
    value = tool_input.get(key)
    if isinstance(value, str):
        parts.append(value)

edits = tool_input.get("edits")
if isinstance(edits, list):
    for edit in edits:
        if isinstance(edit, dict) and isinstance(edit.get("new_string"), str):
            parts.append(edit["new_string"])

sys.stdout.write("\n".join(parts))
'
  elif command -v jq >/dev/null 2>&1; then
    printf '%s' "$HOOK_PAYLOAD" | jq -r '
      [.tool_input.content?, .tool_input.new_string?, .tool_input.new_source?,
       (.tool_input.edits[]?.new_string)]
      | map(select(type == "string")) | join("\n")' 2>/dev/null
  fi
}

# Deny the tool call and tell Claude why. Exit code 2 feeds stderr back to the model.
hook_deny() {
  printf 'BLOCKED by the repository engineering standard.\n\n%s\n' "$1" >&2
  exit 2
}

hook_file_path() { hook_field "tool_input.file_path"; }
hook_tool_name() { hook_field "tool_name"; }

# True when the path is documentation, template, or fixture material where the banned
# strings are legitimately discussed rather than used.
hook_path_is_exempt() {
  local path="$1"
  case "$path" in
    *.md | *.mdx | *.txt | *.rst) return 0 ;;
    */.claude/* | .claude/*) return 0 ;;
    */node_modules/* | */.venv/* | */dist/* | */build/* | */.next/*) return 0 ;;
    *) return 1 ;;
  esac
}

hook_path_is_test() {
  local path="$1"
  case "$path" in
    *test* | *spec* | *__tests__* | *fixture* | *mock* | *stub* | *factory*) return 0 ;;
    *) return 1 ;;
  esac
}

hook_path_extension() {
  local path="$1"
  printf '%s' "${path##*.}"
}
