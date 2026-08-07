# Presets

Configuration that makes the standard machine-enforced. Copy the folders that match your
stack into the project root, then install the listed packages.

The rules here are not stylistic preference. Each one enforces a specific line in the
standard, so that a violation fails the build instead of relying on someone noticing it in
review.

| Your stack | Copy |
| --- | --- |
| Any project | `shared/` |
| Node or any TypeScript project | `node-typescript/` |
| Plain JavaScript, no TypeScript | `javascript/` |
| Python, FastAPI, Django, Flask, or scripts | `python/` |
| React (Vite, or any bundler) | `node-typescript/` then `react/` |
| Next.js | `node-typescript/` then `react/` then `nextjs/` |
| Vue 3 or Nuxt | `node-typescript/` then `vue/` |
| Svelte or SvelteKit | `node-typescript/` then `svelte/` |
| Any project with a user interface | `playwright/` |

The frontend presets extend the base config rather than replacing it. Merge the exported
arrays; do not overwrite `eslint.config.mjs`.

## Which rule enforces which standard

| Standard | Enforced by |
| --- | --- |
| No suppression comments | `block-suppression.sh` hook, plus `eslint-comments/no-use` |
| No `any` / `Any` | `@typescript-eslint/no-explicit-any`, `mypy --strict`, plus the hook |
| No abbreviations | `unicorn/prevent-abbreviations`, `pep8-naming` |
| One function, one job | `max-lines-per-function`, `complexity`, `max-depth`, `max-params`, ruff `C901`/`PLR` |
| No repeated if/else chains | `complexity`, `sonarjs/no-identical-functions`, `no-lonely-if` |
| DRY | `sonarjs/no-identical-functions`, `sonarjs/no-duplicate-string`, ruff `SIM` |
| Layering, dependency direction | `import/no-restricted-paths`, ruff `TID251` |
| No console / print in source | `no-console`, ruff `T20` |
| Mobile-first | `block-suppression.sh` hook rejects `max-width` queries |
| Design tokens only | `block-suppression.sh` hook rejects hardcoded colors |
| Accessibility | `jsx-a11y`, `vuejs-accessibility`, `svelte/a11y-*`, axe in end-to-end tests |
| Coverage thresholds | `vitest.config.ts`, `pyproject.toml` |
| Security patterns | `eslint-plugin-security`, ruff `S` (bandit), `pip-audit`, `npm audit` |

## After copying

1. Install the packages listed at the top of each config file.
2. Add the scripts from `node-typescript/package.scripts.json` to `package.json`, so the
   Stop hook can find `lint`, `typecheck`, and `test`.
3. Run the formatter across the whole repository once, in its own commit, so later diffs are
   readable.
4. Fix everything the linter reports. Do not start from a suppressed baseline - a baseline of
   ignored errors is how a standard dies in week two.

## In an existing codebase

Steps 3 and 4 are not achievable in one pass on a large existing codebase, and attempting
them produces an unreviewable commit. Do this instead:

1. Copy the configs, but do **not** run the formatter over the whole tree yet.
2. Record the debt once: `./.claude/scripts/generate-baseline.sh --mode ratchet`
3. Work normally. Files you touch must not get worse; new files must be clean; the totals
   may only fall.
4. Format legacy files opportunistically, each in its own formatting-only commit, added to
   `.git-blame-ignore-revs`.
5. Pay down one rule at a time in dedicated commits. When the counts reach zero, switch
   `ADOPTION_MODE` to `strict`.

Relaxations belong in the baseline, which shrinks - never in the lint config, which does
not. Adding an ignore path or lowering a threshold is blocked by the test auditor in every
mode. See `.claude/skills/legacy-adoption/references/adoption-modes.md`.
