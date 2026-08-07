---
name: frontend-standard
description: The frontend engineering standard for this repository - mobile-first responsive rules, design tokens and design system, component architecture, state and data-fetching boundaries, accessibility, performance budgets, and the banned generic-AI visual patterns. Load before writing or changing any component, page, layout, style, token, hook, store, or form, in React, Next.js, Vue 3, Svelte, SvelteKit, or plain HTML and CSS.
---

# Frontend Standard

Load the reference for the area you are touching.

| Area | Reference |
| --- | --- |
| Tokens, spacing, type scale, color, component anatomy | `references/design-system.md` |
| Keyboard, screen reader, contrast, focus, forms | `references/accessibility.md` |
| Bundle budget, images, rendering, Core Web Vitals | `references/performance.md` |
| Visual patterns that are banned, and what to do instead | `references/anti-slop.md` |

For color palettes, type pairings, and product-specific layout patterns, also invoke the
`ui-ux-pro-max` skill. This standard governs *how* the code is built; that skill supplies
the design vocabulary.

## Mobile-first is a rule, not a preference

Write the base style for the smallest screen. Widen with `min-width` queries only.
`max-width` media queries are blocked by a hook and there is no exception.

```css
/* Right: base is mobile, each breakpoint only adds. */
.product-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-4);
}

@media (min-width: 48rem) {
  .product-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (min-width: 80rem) {
  .product-grid { grid-template-columns: repeat(3, 1fr); gap: var(--space-6); }
}
```

Practical consequences:

- Design the 360 px layout first. If it does not work there, the information hierarchy is
  wrong, and a wide screen only hides that.
- Touch targets are at least 44 by 44 CSS pixels with at least 8 px between them.
- Nothing horizontally scrolls the page. Wide content (tables, code, charts) scrolls inside
  its own container.
- Use `dvh`, not `vh`, for full-height layouts, or mobile browser chrome cuts the content.
- Respect the safe area: `padding-bottom: env(safe-area-inset-bottom)` on fixed bottom bars.
- Test at 360 px, 768 px, 1024 px, 1440 px. Also test at 200% browser zoom.
- Do not build a separate mobile component tree. One component that reflows.

## Design tokens are the only source of style values

No raw hex color, no raw pixel spacing, no raw font size in a component. Every value comes
from a token, and a hook blocks hardcoded colors. If the token you need does not exist, add
it to the token file with a name that describes its role, not its appearance
(`--color-surface-raised`, not `--color-light-grey-2`).

## Component architecture

Three kinds of component, and they do not blend:

1. **Primitive** - `Button`, `Input`, `Card`. No business knowledge, no data fetching, no
   routing. Styled entirely from tokens. Every variant driven by props.
2. **Composed** - `ProductCard`, `CheckoutSummary`. Assembles primitives, receives data
   through props, renders. Still no fetching.
3. **Container / route** - the page or route component. Owns fetching, owns state, passes
   data down.

Rules:

- Data fetching lives in the data layer (TanStack Query, RTK Query, a loader, a server
  component), never inline in a presentational component.
- A component that takes more than seven props is doing two jobs. Split it, or accept a
  composed object.
- Prefer composition over configuration: `<Card><Card.Header/></Card>` beats
  `<Card showHeader headerVariant="large" />`.
- No `useEffect` for anything the render can derive. Effects are for synchronizing with an
  external system, not for computing values.
- Keys come from a stable id, never the array index.
- Every list has an explicit empty state, loading state, and error state. A component that
  cannot show "nothing here yet" is unfinished.

## State

Choose the narrowest tool that works, in this order:

1. Derived from props - compute it, do not store it.
2. Local component state.
3. Lifted to the nearest common parent.
4. URL state for anything that should survive a refresh or be shareable: filters, tabs,
   pagination, search.
5. Server-cache library for server data. Server data is not application state; do not copy
   it into a global store.
6. Global store only for genuinely cross-cutting client state: theme, session, feature flags.

Never mirror server data into a global store and then keep both in sync by hand.

## Forms

- One schema validates the form and the API request. Share it with the backend contract.
- Validate on blur, revalidate on change once a field has errored, never validate on the
  first keystroke.
- Show the error next to the field, tied with `aria-describedby`, and never rely on color
  alone.
- The submit button shows a pending state and cannot double-submit.
- On failure, keep the entered values. Losing a filled form is the worst outcome.
- Map backend `errors[].field` (camelCase path) onto form fields automatically.

## Types and API access

- No `any`. Types for API payloads are generated from the OpenAPI document, never
  hand-written, so a backend change breaks the build instead of the user interface.
- One typed API client. Components never call `fetch` directly.
- The client unwraps the envelope in one place and throws a typed error carrying the backend
  `code`, so screens branch on `code` rather than on a message string.

## Definition of done for frontend work

- [ ] Renders correctly at 360 px first, then widens; no `max-width` query
- [ ] Every color, space, radius, and font size comes from a token
- [ ] Loading, empty, and error states implemented
- [ ] Fully operable by keyboard; visible focus; contrast at least 4.5:1
- [ ] No data fetching inside a presentational component
- [ ] No banned pattern from `references/anti-slop.md`
- [ ] Unit tests for logic, E2E for the user flow (see `testing-standard`)
- [ ] Lint, format, type check, and tests all green
