# Performance

Budgets are enforced, not aspirational. A change that exceeds one is a change to fix, not to
justify.

## Budgets

| Metric | Budget | Measured on |
| --- | --- | --- |
| Largest Contentful Paint | under 2.5 s | Mobile, 4G, mid-tier device |
| Interaction to Next Paint | under 200 ms | Mobile |
| Cumulative Layout Shift | under 0.1 | Mobile |
| Time to First Byte | under 800 ms | Server response |
| Initial JavaScript, compressed | under 170 KB | Route entry |
| Total page weight | under 1 MB | First view |

Measure on a throttled mid-tier Android profile, not on a laptop over office wifi.

## JavaScript

- Route-level code splitting by default. A user on the login page does not download the
  dashboard chart library.
- Import only what is used. `import { debounce } from "lodash-es"`, never the whole package.
- Check the cost before adding a dependency. A date library at 70 KB to format one timestamp
  is not worth it - `Intl.DateTimeFormat` is built in and free.
- Load heavy, non-critical widgets lazily: rich text editors, charts, maps, video players.
- Third-party scripts are the usual cause of a blown budget. Each one needs a justification,
  loads with `defer` or `async`, and is measured after it lands.
- No polyfill for a browser the project does not support.

## Images and fonts

- Modern formats: AVIF with a WebP fallback. Never a 2 MB PNG.
- Responsive `srcset` and `sizes`, so a phone never downloads a desktop-sized image.
- Explicit `width` and `height`, or `aspect-ratio`, on every image. This is the single
  biggest cause of layout shift.
- `loading="lazy"` below the fold; `fetchpriority="high"` on the hero image only.
- Two font families at most, two or three weights, `woff2`, subset to the characters used,
  `font-display: swap`, and `preload` for the one font used above the fold. Match the
  fallback metrics with `size-adjust` so the swap does not shift the layout.

## Rendering

- Server-render or statically generate anything that must be visible fast or indexed.
- Stream where the framework supports it, so the shell paints before the slow data arrives.
- Reserve space for anything that loads later: images, ads, embeds, async panels. A skeleton
  matches the final layout, otherwise it just moves the shift later.
- Never insert content above existing content after load.
- Virtualize lists longer than roughly 100 rows.
- Memoize only after measuring. `useMemo` on a cheap computation costs more than it saves.

## Data

- Fetch in parallel, not in a waterfall. A component that fetches, renders a child, and the
  child then fetches is a waterfall - hoist it.
- Cache server data with a proper client cache and sensible staleness; do not refetch on
  every mount.
- Paginate or virtualize. Never load an unbounded collection.
- Debounce search input at roughly 300 ms and cancel superseded requests.
- Prefetch the likely next route on intent (hover, focus, or viewport entry).

## Enforcement in CI

- A bundle-size check fails the build when a budget is exceeded.
- Lighthouse CI runs on the main user journeys and fails below the thresholds above.
- Track real-user metrics in production; laboratory numbers hide the slow tail.
