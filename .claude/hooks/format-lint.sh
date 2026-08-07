#!/usr/bin/env bash
# PostToolUse hook for Edit / Write / MultiEdit.
# Formats and lints the single file that was just written. Any remaining problem is
# returned to Claude (exit 2) so it must be fixed before the work continues.
#
# In ratchet mode a pre-existing file is never reformatted wholesale - that would bury a
# one-line change in hundreds of unrelated lines. It is only held to "no worse than before".

set -uo pipefail

SCRIPT_DIRECTORY="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/hook-lib.sh
source "$SCRIPT_DIRECTORY/lib/hook-lib.sh"
# shellcheck source=lib/detect-stack.sh
source "$SCRIPT_DIRECTORY/lib/detect-stack.sh"
# shellcheck source=lib/adoption.sh
source "$SCRIPT_DIRECTORY/lib/adoption.sh"

hook_read_payload

FILE_PATH="$(hook_file_path)"
[ -z "$FILE_PATH" ] && exit 0
[ -f "$FILE_PATH" ] || exit 0
[ "$GATE_ENABLED" = "0" ] && exit 0

case "$FILE_PATH" in
  */node_modules/* | */.venv/* | */dist/* | */build/* | */.next/* | */coverage/*) exit 0 ;;
esac

EXTENSION="$(hook_path_extension "$FILE_PATH")"
RELATIVE_PATH="$(adoption_relative_path "$FILE_PATH")"
NODE_BIN="$PROJECT_ROOT/node_modules/.bin"
PROBLEMS=""
NOTES=""

# A file that predates the baseline keeps its formatting and its recorded debt.
TREAT_AS_LEGACY=0
if adoption_is_ratchet && adoption_file_is_legacy "$RELATIVE_PATH"; then
  TREAT_AS_LEGACY=1
fi

record_problem() {
  PROBLEMS="${PROBLEMS}$1"$'\n'
}

# In ratchet mode, compare this file's problem count against what it carried at baseline.
# Otherwise the file must be completely clean.
evaluate_lint_output() {
  local label="$1" output="$2" exit_status="$3"

  if [ "$TREAT_AS_LEGACY" = "0" ]; then
    [ "$exit_status" -ne 0 ] &&
      record_problem "--- ${label} reported problems in ${RELATIVE_PATH} ---"$'\n'"$output"
    return
  fi

  local regressions
  regressions="$(adoption_lint_regression_report "$output")"
  if [ -n "$regressions" ]; then
    record_problem "--- ${label}: your change added problems to ${RELATIVE_PATH} ---"$'\n'"$regressions"$'\n'"$output"
  fi
}

case "$EXTENSION" in
  ts | tsx | mts | cts | js | jsx | mjs | cjs | vue | svelte | json | css | scss | html | astro)
    if [ "$TREAT_AS_LEGACY" = "0" ]; then
      if [ -x "$NODE_BIN/biome" ]; then
        "$NODE_BIN/biome" check --write "$FILE_PATH" >/dev/null 2>&1
      else
        [ -x "$NODE_BIN/prettier" ] &&
          "$NODE_BIN/prettier" --write --log-level error "$FILE_PATH" >/dev/null 2>&1
        [ -x "$NODE_BIN/eslint" ] && "$NODE_BIN/eslint" --fix "$FILE_PATH" >/dev/null 2>&1
      fi
    else
      NOTES="This file predates the standard, so it was not reformatted - a whole-file
reformat would bury your change in unrelated lines. Format it in its own commit
when you are ready, and add that commit to .git-blame-ignore-revs."
    fi

    if [ -x "$NODE_BIN/eslint" ]; then
      LINT_OUTPUT="$("$NODE_BIN/eslint" --format unix --max-warnings 0 "$FILE_PATH" 2>&1)"
      evaluate_lint_output "eslint" "$LINT_OUTPUT" "$?"
    fi
    ;;
  py)
    PYTHON_PREFIX="$(python_runner)"
    RUFF="${PYTHON_PREFIX}ruff"
    if command -v "${RUFF%% *}" >/dev/null 2>&1 || [ -x "$RUFF" ]; then
      if [ "$TREAT_AS_LEGACY" = "0" ]; then
        # shellcheck disable=SC2086
        $RUFF format "$FILE_PATH" >/dev/null 2>&1
        # shellcheck disable=SC2086
        $RUFF check --fix "$FILE_PATH" >/dev/null 2>&1
      else
        NOTES="This file predates the standard, so it was not reformatted. Format it in its
own commit when you are ready, and add that commit to .git-blame-ignore-revs."
      fi
      # shellcheck disable=SC2086
      LINT_OUTPUT="$($RUFF check --output-format concise "$FILE_PATH" 2>&1)"
      evaluate_lint_output "ruff" "$LINT_OUTPUT" "$?"
    fi
    ;;
  sh | bash)
    command -v shfmt >/dev/null 2>&1 && [ "$TREAT_AS_LEGACY" = "0" ] &&
      shfmt -w -i 2 "$FILE_PATH" >/dev/null 2>&1
    if command -v shellcheck >/dev/null 2>&1; then
      LINT_OUTPUT="$(shellcheck "$FILE_PATH" 2>&1)"
      [ -n "$LINT_OUTPUT" ] && [ "$TREAT_AS_LEGACY" = "0" ] &&
        record_problem "--- shellcheck reported problems in ${RELATIVE_PATH} ---"$'\n'"$LINT_OUTPUT"
    fi
    ;;
  *)
    exit 0
    ;;
esac

if [ -n "$PROBLEMS" ]; then
  {
    printf 'The file you just wrote does not pass the project checks.\n'
    printf 'Fix these now, before doing anything else. Do not suppress any rule.\n'
    [ "$TREAT_AS_LEGACY" = "1" ] && printf '\nOnly problems your change introduced are listed. Pre-existing ones are not your\nconcern right now.\n'
    printf '\n%s' "$PROBLEMS"
    [ -n "$NOTES" ] && printf '\n%s\n' "$NOTES"
  } >&2
  exit 2
fi

exit 0
