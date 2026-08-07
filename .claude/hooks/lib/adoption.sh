#!/usr/bin/env bash
# Adoption mode. Decides how hard the gates bite in an existing codebase.
#
#   strict   Greenfield. The whole repository must pass. Default when there is no baseline.
#   ratchet  Existing codebase. Files you touch must pass; repository-wide counts must not
#            grow. Pre-existing debt is recorded once and does not block you.
#   observe  Report only, never block. For the first week of adoption.
#
# Set in .claude/adoption.conf (written by scripts/generate-baseline.sh).

set -uo pipefail

BASELINE_DIRECTORY="$PROJECT_ROOT/.claude/baseline"
ADOPTION_CONFIG="$PROJECT_ROOT/.claude/adoption.conf"

ADOPTION_MODE="${ADOPTION_MODE:-strict}"
BASELINE_REF=""
LINT_ERROR_COUNT=0
TYPECHECK_ERROR_COUNT=0
TEST_FAILURE_COUNT=0

if [ -f "$ADOPTION_CONFIG" ]; then
  # shellcheck disable=SC1090
  source "$ADOPTION_CONFIG"
fi

if [ -f "$BASELINE_DIRECTORY/counts.conf" ]; then
  # shellcheck disable=SC1091
  source "$BASELINE_DIRECTORY/counts.conf"
fi

adoption_is_ratchet() { [ "$ADOPTION_MODE" = "ratchet" ]; }
adoption_is_observe() { [ "$ADOPTION_MODE" = "observe" ]; }

# Files changed since the baseline commit, plus anything uncommitted. These are the files
# the standard applies to in full - you touched them, so you own them.
adoption_changed_files() {
  git -C "$PROJECT_ROOT" rev-parse --git-dir >/dev/null 2>&1 || return 0

  {
    git -C "$PROJECT_ROOT" diff --name-only --diff-filter=ACMR HEAD 2>/dev/null
    git -C "$PROJECT_ROOT" ls-files --others --exclude-standard 2>/dev/null
    if [ -n "$BASELINE_REF" ]; then
      git -C "$PROJECT_ROOT" diff --name-only --diff-filter=ACMR \
        "$BASELINE_REF" HEAD 2>/dev/null
    fi
  } | sort -u | while read -r relative_path; do
    [ -f "$PROJECT_ROOT/$relative_path" ] && printf '%s\n' "$relative_path"
  done
}

adoption_changed_files_matching() {
  local pattern="$1"
  adoption_changed_files | grep -E -- "$pattern" || true
}

# The recorded number of lint problems in one file at baseline time. A file with 40
# pre-existing problems is allowed to keep them; it is not allowed to reach 41.
adoption_baseline_file_count() {
  local relative_path="$1"
  local record="$BASELINE_DIRECTORY/lint-by-file.txt"
  [ -f "$record" ] || { printf '0'; return; }
  local count
  count="$(awk -F'\t' -v path="$relative_path" '$2 == path { print $1; exit }' "$record")"
  printf '%s' "${count:-0}"
}

# Given linter output in "path:line:column: message" form (eslint --format unix, ruff
# --output-format concise), report only the files whose problem count rose above the
# recorded baseline.
#
# A file that did not exist at baseline time has an allowance of zero, so new code must be
# perfectly clean. A legacy file may keep the problems it already had - it may not gain one.
adoption_lint_regression_report() {
  local output="$1"
  local report=""

  local counted
  counted="$(
    printf '%s' "$output" \
      | grep -oE '^[^: ]+:[0-9]+' \
      | cut -d: -f1 \
      | sed "s|^$PROJECT_ROOT/||" \
      | sort \
      | uniq -c
  )"

  while read -r current_count relative_path; do
    [ -z "${relative_path:-}" ] && continue
    local allowed
    allowed="$(adoption_baseline_file_count "$relative_path")"
    if [ "$current_count" -gt "$allowed" ]; then
      report="${report}  ${relative_path}: ${current_count} problems, baseline allows ${allowed}"$'\n'
    fi
  done <<<"$counted"

  printf '%s' "$report"
}

# Pull the first "<number> failed" style count out of a checker's output.
adoption_extract_failure_count() {
  local output="$1"
  local count
  count="$(printf '%s' "$output" | grep -oE '[0-9]+ (failed|error)' | grep -oE '^[0-9]+' | head -n 1)"
  printf '%s' "${count:-0}"
}

# True when the file already existed when the baseline was taken. Such a file carries
# accepted debt, and - critically - must not be reformatted wholesale: running a formatter
# over a file that has never been formatted produces a diff of hundreds of unrelated lines,
# which is exactly the change nobody can review.
adoption_file_is_legacy() {
  local relative_path="$1"
  [ -n "$BASELINE_REF" ] || return 1
  [ "$BASELINE_REF" = "none" ] && return 1
  git -C "$PROJECT_ROOT" cat-file -e "$BASELINE_REF:$relative_path" 2>/dev/null
}

adoption_relative_path() {
  local absolute_path="$1"
  printf '%s' "${absolute_path#"$PROJECT_ROOT"/}"
}
