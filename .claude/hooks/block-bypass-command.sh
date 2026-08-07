#!/usr/bin/env bash
# PreToolUse hook for Bash.
# Rejects shell commands that route around a quality gate or destroy history.

set -uo pipefail

SCRIPT_DIRECTORY="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/hook-lib.sh
source "$SCRIPT_DIRECTORY/lib/hook-lib.sh"

hook_read_payload

COMMAND="$(hook_field "tool_input.command")"
[ -z "$COMMAND" ] && exit 0

check() {
  local pattern="$1"
  local explanation="$2"
  if printf '%s' "$COMMAND" | grep -Eq -- "$pattern"; then
    hook_deny "$explanation"
  fi
}

check '(^|[[:space:]])--no-verify([[:space:]]|$)' \
  'This command uses --no-verify to skip git hooks. The pre-commit checks exist to keep the standard. Fix what the hook reports instead.'
check '(^|[[:space:]])(SKIP|HUSKY|HUSKY_SKIP_HOOKS|LEFTHOOK|PRE_COMMIT_ALLOW_NO_CONFIG)=' \
  'This command sets an environment variable that disables commit hooks. Fix the failing check instead.'
check '--pass-?[Ww]ith-?[Nn]o-?[Tt]ests' \
  'This command lets the test run succeed with zero tests. Write the tests instead.'
check 'git[[:space:]]+push[^|;&]*([[:space:]]--force([[:space:]]|$)|[[:space:]]-f([[:space:]]|$))' \
  'This command force-pushes. Force-push rewrites shared history. Ask the human to do it if it is genuinely needed.'
check 'git[[:space:]]+(reset[[:space:]]+--hard|clean[[:space:]]+-[a-z]*f)' \
  'This command discards uncommitted work irreversibly. Ask the human before destroying local changes.'
check '(eslint|biome|ruff|mypy|tsc)[^|;&]*(--no-error-on-unmatched-pattern|--quiet|--silent)[^|;&]*(\|\|[[:space:]]*true|;[[:space:]]*true)' \
  'This command swallows the exit code of a checker. A check that cannot fail is not a check.'
check '(npm|pnpm|yarn|bun)[[:space:]]+run[[:space:]]+[a-z:-]+[^|;&]*\|\|[[:space:]]*(true|exit[[:space:]]+0)' \
  'This command discards a failing exit code with "|| true". Let the failure surface and fix it.'
check '(pytest|vitest|jest|playwright)[^|;&]*\|\|[[:space:]]*(true|exit[[:space:]]+0)' \
  'This command hides failing tests behind "|| true". Fix the tests.'
check 'chmod[[:space:]]+[0-7]*777' \
  'This command sets world-writable permissions. Use the narrowest permission that works.'

# The adoption baseline is the record of accepted debt. Regenerating or deleting it would
# absorb newly written violations into that record, which defeats the ratchet entirely.
check '(rm|mv|git[[:space:]]+rm)[^|;&]*\.claude/(baseline|adoption\.conf)' \
  'This command removes the adoption baseline. The baseline is the record of pre-existing debt; deleting it would let new violations be absorbed into it. Re-baselining is a decision for the human to make deliberately.'
check 'generate-baseline\.sh[^|;&]*--force' \
  'The baseline generator does not take --force, and re-baselining is not a way to clear a failing gate. Fix the violation your change introduced.'
check '(sed|perl|awk|tee)[^|;&]*\.claude/(baseline|adoption\.conf|settings\.json)' \
  'This command edits a guardrail file. Those are changed by the human only.'

exit 0
