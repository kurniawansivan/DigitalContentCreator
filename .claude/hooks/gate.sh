#!/usr/bin/env bash
# Stop hook. Runs the full gate: format check, lint, type check, tests.
# A failure blocks the turn from ending and hands the output back to Claude.
#
# In an existing codebase the gate ratchets instead of demanding perfection: see
# .claude/skills/legacy-adoption/SKILL.md and .claude/adoption.conf.

set -uo pipefail

SCRIPT_DIRECTORY="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/hook-lib.sh
source "$SCRIPT_DIRECTORY/lib/hook-lib.sh"
# shellcheck source=lib/detect-stack.sh
source "$SCRIPT_DIRECTORY/lib/detect-stack.sh"
# shellcheck source=lib/adoption.sh
source "$SCRIPT_DIRECTORY/lib/adoption.sh"

hook_read_payload

# Prevent an infinite Stop loop: if this hook already blocked once and Claude is
# stopping again, let it through so the human can intervene.
[ "$(hook_field 'stop_hook_active')" = "true" ] && exit 0
[ "$GATE_ENABLED" = "0" ] && exit 0

cd "$PROJECT_ROOT" || exit 0

FAILURES=""
RAN_ANY_CHECK=0

record_failure() {
  FAILURES="${FAILURES}"$'\n'"===== $1 ====="$'\n'"$(printf '%s' "$2" | tail -n 60)"$'\n'
}

run_gate_step() {
  local label="$1"
  shift
  RAN_ANY_CHECK=1
  local output
  if ! output="$("$@" 2>&1)"; then
    record_failure "${label} FAILED" "$output"
  fi
}

# Compare a repository-wide count against the recorded baseline. Debt may shrink, never grow.
run_ratchet_step() {
  local label="$1" baseline_count="$2" error_pattern="$3"
  shift 3
  RAN_ANY_CHECK=1

  local output current_count
  output="$("$@" 2>&1 || true)"
  current_count="$(printf '%s' "$output" | grep -cE "$error_pattern" || true)"

  if [ "$current_count" -gt "$baseline_count" ]; then
    record_failure "${label} REGRESSED" \
      "$(printf 'Baseline allowed %s problems, there are now %s.\n\n%s' \
        "$baseline_count" "$current_count" "$output")"
  fi
}

# ---------- Node / TypeScript / JavaScript ----------
run_node_gates() {
  local package_manager="$1"
  local run_prefix=("$package_manager" run)
  [ "$package_manager" = "npm" ] && run_prefix=("npm" "run" "--silent")

  # Lint. In ratchet mode only the files this change touched are linted, and each is
  # compared against the debt it already carried. New files must be perfectly clean.
  if [ -n "$LINT_COMMAND" ]; then
    run_gate_step "lint" bash -lc "$LINT_COMMAND"
  elif adoption_is_ratchet && [ -x "./node_modules/.bin/eslint" ]; then
    local changed_files
    changed_files="$(adoption_changed_files_matching '\.(ts|tsx|js|jsx|mjs|cjs|vue|svelte)$')"
    if [ -n "$changed_files" ]; then
      RAN_ANY_CHECK=1
      local output regressions
      # shellcheck disable=SC2086
      output="$(./node_modules/.bin/eslint --format unix $changed_files 2>&1 || true)"
      regressions="$(adoption_lint_regression_report "$output")"
      if [ -n "$regressions" ]; then
        record_failure "lint REGRESSED on files this change touched" \
          "$(printf '%s\n%s' "$regressions" "$output")"
      fi
    fi
  elif has_node_script "lint"; then
    run_gate_step "lint" "${run_prefix[@]}" lint
  fi

  # Type check. tsc cannot be scoped to a file list without losing the project config, so
  # in ratchet mode the whole project is checked and only the error count is enforced.
  local typecheck_runner=()
  if [ -n "$TYPECHECK_COMMAND" ]; then
    typecheck_runner=(bash -lc "$TYPECHECK_COMMAND")
  elif has_node_script "typecheck"; then
    typecheck_runner=("${run_prefix[@]}" typecheck)
  elif has_node_script "type-check"; then
    typecheck_runner=("${run_prefix[@]}" type-check)
  elif [ -f "tsconfig.json" ] && [ -x "./node_modules/.bin/tsc" ]; then
    typecheck_runner=("./node_modules/.bin/tsc" --noEmit)
  fi

  if [ ${#typecheck_runner[@]} -gt 0 ]; then
    if adoption_is_ratchet; then
      run_ratchet_step "typecheck" "$TYPECHECK_ERROR_COUNT" 'error TS' "${typecheck_runner[@]}"
    else
      run_gate_step "typecheck" "${typecheck_runner[@]}"
    fi
  fi

  # Tests always run in full. A test that was passing must not start failing.
  local test_runner=()
  if [ -n "$TEST_COMMAND" ]; then
    test_runner=(bash -lc "$TEST_COMMAND")
  elif has_node_script "test:unit"; then
    test_runner=("${run_prefix[@]}" test:unit)
  elif has_node_script "test"; then
    test_runner=("${run_prefix[@]}" test)
  fi

  if [ ${#test_runner[@]} -gt 0 ]; then
    if adoption_is_ratchet; then
      run_test_ratchet "${test_runner[@]}"
    else
      run_gate_step "tests" "${test_runner[@]}"
    fi
  fi
}

# A suite that was already red at adoption time may stay exactly as red. One more failure
# than the baseline is a regression this change caused.
run_test_ratchet() {
  RAN_ANY_CHECK=1
  local output current_failures
  if output="$("$@" 2>&1)"; then
    return 0
  fi
  current_failures="$(adoption_extract_failure_count "$output")"
  if [ "$current_failures" -gt "$TEST_FAILURE_COUNT" ]; then
    record_failure "tests REGRESSED" \
      "$(printf 'Baseline had %s failing tests, there are now %s.\n\n%s' \
        "$TEST_FAILURE_COUNT" "$current_failures" "$output")"
  fi
}

# ---------- Python ----------
run_python_gates() {
  local python_prefix ruff mypy pytest_runner
  python_prefix="$(python_runner)"
  ruff="${python_prefix}ruff"
  mypy="${python_prefix}mypy"
  pytest_runner="${python_prefix}pytest"

  if [ -z "$LINT_COMMAND" ] && command -v "${ruff%% *}" >/dev/null 2>&1; then
    if adoption_is_ratchet; then
      local changed_files
      changed_files="$(adoption_changed_files_matching '\.py$')"
      if [ -n "$changed_files" ]; then
        RAN_ANY_CHECK=1
        local format_output lint_output regressions
        format_output="$(bash -lc "$ruff format --check $changed_files" 2>&1 || true)"
        lint_output="$(bash -lc "$ruff check --output-format concise $changed_files" 2>&1 || true)"
        regressions="$(adoption_lint_regression_report "$lint_output")"
        # Formatting is never grandfathered: the formatter rewrites a file deterministically,
        # so a touched file has no excuse to stay unformatted.
        if [ -n "$format_output" ]; then
          record_failure "ruff format FAILED on files this change touched" "$format_output"
        fi
        if [ -n "$regressions" ]; then
          record_failure "ruff lint REGRESSED on files this change touched" \
            "$(printf '%s\n%s' "$regressions" "$lint_output")"
        fi
      fi
    else
      run_gate_step "ruff format" bash -lc "$ruff format --check ."
      run_gate_step "ruff lint" bash -lc "$ruff check ."
    fi
  elif [ -n "$LINT_COMMAND" ]; then
    run_gate_step "lint" bash -lc "$LINT_COMMAND"
  fi

  if [ -z "$TYPECHECK_COMMAND" ] && command -v "${mypy%% *}" >/dev/null 2>&1; then
    if adoption_is_ratchet; then
      run_ratchet_step "mypy" "$TYPECHECK_ERROR_COUNT" 'error:' bash -lc "$mypy ."
    else
      run_gate_step "mypy" bash -lc "$mypy ."
    fi
  elif [ -n "$TYPECHECK_COMMAND" ]; then
    run_gate_step "typecheck" bash -lc "$TYPECHECK_COMMAND"
  fi

  if [ -z "$TEST_COMMAND" ] && command -v "${pytest_runner%% *}" >/dev/null 2>&1; then
    if adoption_is_ratchet; then
      run_test_ratchet bash -lc "$pytest_runner -q"
    else
      run_gate_step "pytest" bash -lc "$pytest_runner -q"
    fi
  elif [ -n "$TEST_COMMAND" ]; then
    run_gate_step "tests" bash -lc "$TEST_COMMAND"
  fi
}

PACKAGE_MANAGER="$(detect_node_package_manager)"
[ -n "$PACKAGE_MANAGER" ] && run_node_gates "$PACKAGE_MANAGER"
is_python_project && run_python_gates

# ---------- Verdict ----------
if [ "$RAN_ANY_CHECK" = "0" ]; then
  printf 'Gate skipped: no lint, typecheck, or test command was detected.\n' >&2
  printf 'Add scripts to package.json, or set them in .claude/gate.config.sh.\n' >&2
  exit 0
fi

[ -z "$FAILURES" ] && exit 0

if adoption_is_observe; then
  {
    printf 'Gate problems found. Adoption mode is "observe", so this is not blocking.\n'
    printf 'Fix what belongs to your change; the rest is recorded debt.\n'
    printf '%s\n' "$FAILURES"
  } >&2
  exit 0
fi

{
  printf 'The quality gate is failing. You cannot finish while these are red.\n'
  printf 'Fix the root cause. Do not suppress a rule, skip a test, or weaken an assertion.\n'
  if adoption_is_ratchet; then
    printf '\nAdoption mode is "ratchet": this is a problem your change introduced, not\n'
    printf 'pre-existing debt. Pre-existing problems are already recorded in the baseline\n'
    printf 'and are not reported here.\n'
  fi
  printf '%s\n' "$FAILURES"
} >&2
exit 2
