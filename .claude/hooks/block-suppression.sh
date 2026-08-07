#!/usr/bin/env bash
# PreToolUse hook for Edit / Write / MultiEdit.
# Rejects any edit that suppresses a quality gate, skips a test, weakens typing,
# hardcodes a secret, or breaks the mobile-first / design-token rules.

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
NEW_CONTENT="$(hook_new_content)"

[ -z "$NEW_CONTENT" ] && exit 0
hook_path_is_exempt "$FILE_PATH" && exit 0

EXTENSION="$(hook_path_extension "$FILE_PATH")"

# A full-file rewrite of a file that predates the standard. Its whole content arrives as
# "new", so holding it to the strict rule would demand a rewrite of code this change is not
# about. Such a file is held to "no worse than it already was" for the soft categories.
IS_LEGACY_REWRITE=0
if [ "$(hook_tool_name)" = "Write" ] && [ -f "$FILE_PATH" ] && adoption_is_ratchet &&
  adoption_file_is_legacy "$(adoption_relative_path "$FILE_PATH")"; then
  IS_LEGACY_REWRITE=1
fi

# Hard block, always, in every mode. These are never grandfathered: a suppression, a
# skipped test, or a secret is wrong the moment it is written, in any codebase.
check() {
  local pattern="$1"
  local explanation="$2"
  if printf '%s' "$NEW_CONTENT" | grep -Eqi -- "$pattern"; then
    hook_deny "$explanation"
  fi
}

# Blocked in new code; in a legacy rewrite, blocked only if the count goes up.
check_ratchet() {
  local pattern="$1"
  local explanation="$2"
  local new_count old_count

  new_count="$(printf '%s' "$NEW_CONTENT" | grep -Eci -- "$pattern" || true)"
  [ "$new_count" -eq 0 ] && return 0

  if [ "$IS_LEGACY_REWRITE" = "1" ]; then
    old_count="$(grep -Eci -- "$pattern" "$FILE_PATH" || true)"
    [ "$new_count" -le "$old_count" ] && return 0
    hook_deny "$explanation"$'\n\n'"This file predates the standard, so what was already there may stay for now. It had ${old_count} occurrences of this pattern; your version has ${new_count}. Do not add more."
  fi

  hook_deny "$explanation"
}

# --- 1. Linter, formatter, and type checker suppression -----------------------------
check 'eslint-disable' \
  'This edit contains an eslint-disable comment. Suppressing a lint rule is not allowed. Fix the code the rule is pointing at.'
check '@ts-(ignore|nocheck|expect-error)' \
  'This edit contains a TypeScript suppression comment. Resolve the type error properly: narrow the type, fix the signature, or model the data correctly.'
check '(^|[^A-Za-z])#[[:space:]]*(noqa|type:[[:space:]]*ignore)' \
  'This edit contains a Python checker suppression (# noqa or # type: ignore). Fix the reported problem instead.'
check '#[[:space:]]*(pylint|flake8|ruff|mypy):[[:space:]]*(disable|noqa|ignore)' \
  'This edit disables a Python linter rule inline. Fix the reported problem instead.'
check '(prettier|biome)-ignore' \
  'This edit disables the formatter. Formatting is not optional. Let the formatter own the layout.'
check '(istanbul|c8|v8)[[:space:]]+ignore' \
  'This edit excludes code from coverage measurement. Write a test for the branch instead.'
check '@SuppressWarnings|//[[:space:]]*nolint|//[[:space:]]*deadcode' \
  'This edit suppresses a compiler or linter warning. Fix the underlying issue.'

# --- 2. Disabled tests ---------------------------------------------------------------
check '\b(it|test|describe|context|suite|bench)\.(skip|only|todo|failing)\b' \
  'This edit skips, isolates, or marks a test as todo. Every test in the suite must run and pass. If the test is wrong, fix it or delete it with a reason.'
check '\b(xit|xtest|xdescribe|fit|fdescribe|xcontext)[[:space:]]*\(' \
  'This edit uses a disabled or focused test form (xit / fit / xdescribe / fdescribe). Every test must run.'
check '@pytest\.mark\.(skip|skipif|xfail)' \
  'This edit skips a pytest test. Every test must run and pass.'
check 'test\.describe\.(skip|only)|test\.(skip|only|fixme)[[:space:]]*\(' \
  'This edit skips or focuses a Playwright test. Every E2E test must run.'

# --- 3. Type escapes ------------------------------------------------------------------
case "$EXTENSION" in
  ts | tsx | mts | cts)
    check_ratchet '(:[[:space:]]*any\b|<any>|\bas[[:space:]]+any\b|Array<any>|Promise<any>)' \
      'This edit uses the "any" type. Use a concrete type, or "unknown" plus a narrowing check. If the shape is genuinely open, model it with a discriminated union or a generic.'
    ;;
  py)
    check_ratchet '(:[[:space:]]*Any\b|->[[:space:]]*Any\b|Dict\[str,[[:space:]]*Any\]|dict\[str,[[:space:]]*Any\])' \
      'This edit uses typing.Any. Use a concrete type, a TypedDict, a Pydantic model, or "object" plus a narrowing check.'
    ;;
esac

# --- 4. Hardcoded secrets --------------------------------------------------------------
check 'AKIA[0-9A-Z]{16}' 'This edit contains what looks like an AWS access key id. Secrets belong in environment variables, never in source.'
check 'BEGIN[[:space:]]+(RSA|EC|OPENSSH|PGP|DSA)?[[:space:]]*PRIVATE[[:space:]]+KEY' 'This edit contains a private key block. Secrets belong in environment variables or a secret manager, never in source.'
check '\b(sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{30,}|gho_[A-Za-z0-9]{30,}|xox[baprs]-[A-Za-z0-9-]{10,})' 'This edit contains what looks like a live API token. Move it to an environment variable.'

if ! hook_path_is_test "$FILE_PATH"; then
  check '(password|passwd|secret|api_?key|apiKey|access_?token|private_?key)[[:space:]]*[:=][[:space:]]*["'"'"'][^"'"'"'{$][^"'"'"']{7,}["'"'"']' \
    'This edit hardcodes a credential-looking literal. Read it from configuration (process.env / os.environ) and validate it at startup.'
fi

# --- 5. Debug output left in source ------------------------------------------------------
case "$FILE_PATH" in
  */src/* | src/* | */app/* | app/* | */lib/* | lib/*)
    if ! hook_path_is_test "$FILE_PATH"; then
      check_ratchet '\bconsole\.(log|debug|dir|trace)[[:space:]]*\(' \
        'This edit leaves a console.log in application source. Use the project logger so output is structured, levelled, and redacted.'
      check_ratchet '(^|[^A-Za-z_.])print[[:space:]]*\(' \
        'This edit leaves a bare print() in application source. Use the project logger instead.'
      check_ratchet '\b(debugger|breakpoint\(\)|pdb\.set_trace|binding\.pry)\b' \
        'This edit leaves a debugger statement in source. Remove it.'
    fi
    ;;
esac

# --- 6. Mobile-first and design tokens ------------------------------------------------------
case "$EXTENSION" in
  css | scss | sass | less | styl | vue | svelte | tsx | jsx)
    check_ratchet '@media[^{]*\(max-width' \
      'This edit uses a max-width media query. This project is mobile-first: write the base style for the smallest screen, then add min-width queries to widen it. Rewrite the breakpoint as min-width.'
    ;;
esac

case "$FILE_PATH" in
  *tokens.* | *theme.* | *tailwind.config.* | *.svg | *globals.css | *design-system*) ;;
  *)
    case "$EXTENSION" in
      css | scss | vue | svelte | tsx | jsx)
        check_ratchet '(color|background|background-color|border-color|fill|stroke)[[:space:]]*:[[:space:]]*#[0-9a-fA-F]{3,8}\b' \
          'This edit hardcodes a color value. Colors come from design tokens only (a CSS custom property or a Tailwind theme token). Add the token to the token file if it does not exist yet.'
        ;;
    esac
    ;;
esac

# --- 7. Comment and punctuation tidiness ------------------------------------------------
# An em dash reads as a hyphen wherever it appears - in a string, a comment, a commit
# message rendered later as a comment. Ban the character outright rather than trying to
# tell "fine here" from "not fine there".
check_ratchet '—' \
  'This edit contains an em dash. Do not use an em dash in code, comments, or strings. Use a hyphen, a comma, a colon, or split it into two sentences.'

# A line that is only repeated punctuation after the comment marker: a divider or banner.
# It carries no information and turns every future diff in that area into noise.
check_ratchet '^[[:space:]]*(#|//|/\*|\*)[[:space:]]*[-=*_~^#/]{3,}[[:space:]=*_~^#/-]*(\*/)?[[:space:]]*$' \
  'This edit adds a comment line made only of repeated punctuation, a divider or banner. Delete it. If the section needs a label, write one short plain comment line with no border above or below it.'

# A comment far past the project'"'"'s line-length limit is a paragraph, not a comment.
check_ratchet '^[[:space:]]*(#|//)[[:space:]]?.{100,}$' \
  'This comment line runs well past the 100-character line limit. Shorten it to one clear line, or move the explanation into documentation - a comment this long is a paragraph hiding in the code.'

exit 0
