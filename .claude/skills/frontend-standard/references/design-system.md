# Design System

Every visual value is a token. Components consume tokens. Nothing else.

## Token layers

Three layers, each referring only to the one above it.

1. **Primitive** - the raw palette and scales. `--blue-600`, `--space-4`. Never used directly
   in a component.
2. **Semantic** - the role a value plays. `--color-surface`, `--color-text-muted`,
   `--color-border-strong`. This is what components use.
3. **Component** - only when a component genuinely needs its own knob.
   `--button-height-medium`.

Theming works because only the semantic layer is remapped. A component never knows which
theme is active.

```css
:root {
  /* 1. primitives */
  --neutral-0: #ffffff;
  --neutral-50: #fafafa;
  --neutral-200: #e5e5e5;
  --neutral-500: #737373;
  --neutral-900: #171717;
  --accent-500: #2563eb;
  --accent-600: #1d4ed8;
  --danger-500: #dc2626;
  --success-500: #16a34a;
  --warning-500: #d97706;

  /* 2. semantic - the only layer components may use */
  --color-background: var(--neutral-0);
  --color-surface: var(--neutral-0);
  --color-surface-raised: var(--neutral-50);
  --color-border: var(--neutral-200);
  --color-text: var(--neutral-900);
  --color-text-muted: var(--neutral-500);
  --color-accent: var(--accent-500);
  --color-accent-hover: var(--accent-600);
  --color-danger: var(--danger-500);
  --color-success: var(--success-500);
  --color-warning: var(--warning-500);
  --color-focus-ring: var(--accent-500);
}

:root[data-theme="dark"] {
  --color-background: #0a0a0a;
  --color-surface: #171717;
  --color-surface-raised: #262626;
  --color-border: #333333;
  --color-text: #fafafa;
  --color-text-muted: #a3a3a3;
}
```

Dark mode is a token remap, never a second stylesheet and never per-component overrides.
Support both the system preference and an explicit override:
`@media (prefers-color-scheme: dark)` for the default, and a `data-theme` attribute that
wins over it in both directions.

## Spacing

One scale, based on 4 px. Nothing off-scale.

```css
--space-1: 0.25rem;  /*  4px */
--space-2: 0.5rem;   /*  8px */
--space-3: 0.75rem;  /* 12px */
--space-4: 1rem;     /* 16px */
--space-6: 1.5rem;   /* 24px */
--space-8: 2rem;     /* 32px */
--space-12: 3rem;    /* 48px */
--space-16: 4rem;    /* 64px */
--space-24: 6rem;    /* 96px */
```

Spacing is applied by the parent through `gap`, not by children through margins. A component
does not decide the space around itself; that is the layout's job. This one rule removes
most margin-collapse and double-gap bugs.

## Type scale

Two families at most: one for the interface, optionally one for display. Body text is 16 px
minimum on mobile - smaller triggers input zoom on iOS and is hard to read.

```css
--font-size-xs: 0.75rem;    /* 12px - metadata only, never body */
--font-size-sm: 0.875rem;   /* 14px */
--font-size-base: 1rem;     /* 16px - body */
--font-size-lg: 1.125rem;   /* 18px */
--font-size-xl: 1.5rem;     /* 24px */
--font-size-2xl: 2rem;      /* 32px */
--font-size-3xl: 2.5rem;    /* 40px */

--line-height-tight: 1.2;   /* headings */
--line-height-normal: 1.5;  /* body */
--font-weight-regular: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
```

Use two or three weights, not six. Line length for body copy stays between 45 and 75
characters: `max-inline-size: 65ch`. Headings use `text-wrap: balance`; body uses
`text-wrap: pretty`.

Fluid type for display sizes only, so headings do not jump at breakpoints:

```css
--font-size-display: clamp(2rem, 1.5rem + 2.5vw, 3.5rem);
```

## Radius, elevation, motion

```css
--radius-sm: 0.25rem;
--radius-md: 0.5rem;
--radius-lg: 0.75rem;
--radius-full: 9999px;

/* Shadows are low-opacity and layered. One big blurry drop shadow reads as cheap. */
--shadow-sm: 0 1px 2px rgb(0 0 0 / 0.05);
--shadow-md: 0 1px 3px rgb(0 0 0 / 0.08), 0 4px 12px rgb(0 0 0 / 0.05);
--shadow-lg: 0 2px 6px rgb(0 0 0 / 0.08), 0 12px 32px rgb(0 0 0 / 0.08);

--duration-fast: 120ms;
--duration-normal: 200ms;
--easing-standard: cubic-bezier(0.2, 0, 0, 1);
```

Motion rules: animate `transform` and `opacity` only. Duration between 120 ms and 300 ms;
longer feels broken. Motion communicates a state change or a spatial relationship - never
decoration. Always honour the user's preference:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Breakpoints

```css
/* min-width only */
--breakpoint-sm: 30rem;   /* 480px  large phone */
--breakpoint-md: 48rem;   /* 768px  tablet */
--breakpoint-lg: 64rem;   /* 1024px laptop */
--breakpoint-xl: 80rem;   /* 1280px desktop */
```

Prefer intrinsic layout over breakpoints wherever it works - it adapts at every width, not
at four widths:

```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(18rem, 100%), 1fr));
  gap: var(--space-4);
}
```

Container queries for components that appear in more than one column width:

```css
.card-container { container-type: inline-size; }

@container (min-width: 24rem) {
  .card { display: grid; grid-template-columns: auto 1fr; }
}
```

## Every interactive element defines all of its states

A component is not done until `default`, `hover`, `active`, `focus-visible`, `disabled`,
`loading`, and where relevant `selected` and `error` are all defined. Hover alone is a
desktop assumption; touch devices never see it.

```css
.button {
  min-block-size: 2.75rem;              /* 44px touch target */
  padding-inline: var(--space-4);
  border-radius: var(--radius-md);
  background: var(--color-accent);
  color: var(--color-on-accent);
  font-weight: var(--font-weight-medium);
  transition: background var(--duration-fast) var(--easing-standard);
}

.button:hover { background: var(--color-accent-hover); }
.button:active { transform: translateY(1px); }
.button:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
}
.button:disabled { opacity: 0.5; cursor: not-allowed; }
.button[data-loading="true"] { pointer-events: none; }
```

Never remove the focus outline without replacing it with something at least as visible.

## Icons and imagery

- One icon set for the whole product. Consistent stroke width and size.
- Icons are sized in `em` so they scale with the text beside them.
- A decorative icon gets `aria-hidden="true"`. A meaningful icon gets an accessible label.
- An icon-only button always has an accessible name.
- Every image has explicit `width` and `height` (or `aspect-ratio`) so the layout does not
  shift while it loads.
