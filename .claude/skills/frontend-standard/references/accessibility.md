# Accessibility

Target is WCAG 2.2 level AA. These are requirements, not improvements to add later.

## Semantics first

Use the element that means the thing. `<button>` for an action, `<a href>` for navigation,
`<nav>`, `<main>`, `<header>`, `<footer>`, `<ul>` for lists, `<table>` for tabular data.
A `<div>` with a click handler is not a button: it is missing keyboard focus, Enter and
Space handling, the button role, and the disabled state.

ARIA is the fallback, not the tool. The first rule of ARIA is not to use ARIA when a native
element exists. A wrong ARIA attribute is worse than none.

One `<h1>` per page. Heading levels never skip. Headings describe structure, and are not
chosen for their font size - that is what tokens are for.

## Keyboard

- Every interactive element is reachable and operable with the keyboard alone. Walk the
  whole flow with Tab, Shift+Tab, Enter, Space, Escape, and the arrow keys before calling it
  done.
- Focus order follows visual order. Never use a positive `tabindex`.
- `:focus-visible` is always styled and clearly visible against its background.
- A modal traps focus while open, returns focus to the trigger on close, and closes on
  Escape.
- A "skip to main content" link is the first focusable element on the page.
- Nothing is hover-only. Anything revealed on hover is also revealed on focus.
- A custom control follows its ARIA authoring-practices keyboard contract: menus, tabs,
  comboboxes, and listboxes all respond to arrow keys, Home, and End.

## Color and contrast

- Body text at least 4.5:1 against its background. Large text (24 px, or 19 px bold) at
  least 3:1.
- Interactive borders, icons that carry meaning, and focus indicators at least 3:1.
- Color is never the only signal. An error is an icon plus text plus color. A chart series
  is distinguished by shape or label, not by hue alone.
- Check both themes. A palette that passes in light often fails in dark.

## Forms

- Every input has a real `<label>` bound with `for`. A placeholder is not a label - it
  disappears on focus and usually fails contrast.
- Group related inputs with `<fieldset>` and `<legend>`.
- Errors are tied to their field with `aria-describedby` and announced with a live region.
- Mark invalid fields with `aria-invalid="true"`.
- Set `autocomplete` correctly on name, email, address, and payment fields. It is both an
  accessibility requirement and a conversion win.
- Set `inputmode` and `type` so mobile keyboards match the input: `type="email"`,
  `inputmode="numeric"`, `type="tel"`.
- Never disable paste, especially on password and one-time-code fields.
- The label of a control must contain the text a user would say aloud to activate it.

## Dynamic content

- Content that appears after an action is announced: `aria-live="polite"` for status,
  `role="alert"` for errors.
- A route change moves focus to the new page heading and updates the document title.
- A loading state is announced, not only spun.
- Never remove or move focus out from under the user without an action that caused it.

## Media and motion

- Every meaningful image has `alt` text describing its purpose. Decorative images use
  `alt=""`.
- Video has captions. Audio has a transcript.
- Nothing autoplays with sound.
- Nothing flashes more than three times per second.
- `prefers-reduced-motion: reduce` disables non-essential animation.

## Structure and zoom

- The page works at 320 px width and at 400% zoom without a horizontal scrollbar.
- Text can be resized to 200% without loss of content or function.
- `<html lang="...">` is set correctly.
- Landmarks are present and unique: one `<main>`, labelled `<nav>` elements when there is
  more than one.

## Verify, do not assume

- Run an automated pass (axe, Lighthouse) in CI - it catches roughly a third of issues.
- Manually walk the flow with the keyboard only.
- Test with a screen reader once per feature: VoiceOver on macOS or iOS, NVDA on Windows.
- Zoom to 200% and check the layout.
