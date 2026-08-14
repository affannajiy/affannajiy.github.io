# Accessibility floor

Non-negotiable minimums. Every one of these is **measured, never eyeballed** —
the measurement snippets live in the `check-accessibility` skill.

Related: [design-system.md](design-system.md) for the tokens,
[verification-log.md](verification-log.md) for the last measured round.

---

## The floor

- **All text ≥ 4.5:1** against its own background. Verified: body 14.4,
  muted/nav/hints/footer 5.05, section numbers and masthead role 4.96, table row
  labels 5.35, table header 17.9.
- **Never colour alone.** Links carry a resting underline; the current nav
  section is marked by weight *and* a rule *and* `aria-current`; load and error
  states are stated in words.
- `:focus-visible` rings are required on every interactive element. Do not add
  bare `outline:none`.
- A skip link to `#main` is the first focusable element. Keep it first.
- `prefers-reduced-motion: reduce` collapses transitions, disables smooth
  scroll, and flattens the skeleton shimmer to a static bar. Any new animation
  must respect it.
- **Minimum tap target 40px.** Verified: nav 40, wordmark 40, sort buttons 40,
  résumé button 44. Nothing interactive may ship below 40.
- Tables use `<th scope>` for row and column headers and a `.sr-only`
  `<caption>`.

## Saying what the page is doing

- **A status line must never claim something that is not happening.** With
  JavaScript off, the Projects status used to read "Loading repositories from
  GitHub…" forever. `.no-js` on `<html>` — removed by the first line of
  `script.js` — hides every `.js-only` control, and a `<noscript>` block names
  what is missing and links the same data on GitHub. A dead control that invites
  a click and then says nothing is worse than no control (Nielsen §1.5).
- **`aria-busy="true"` on the Projects table while the skeleton rows show.**
  They are shaped like data on purpose, which is exactly why a screen reader has
  to be told they are not data yet. Cleared on every settle path — rows, empty
  result, or failure.
- **Every link that leaves the page says so.** `target="_blank"` alone warns
  nobody: assistive tech gets nothing from it, and a sighted reader finds out
  after the fact. Each carries an `sr-only` "(opens in a new tab)" and a `↗`
  marker drawn in CSS. The marker uses `--accent-text` (4.96:1), because it is a
  glyph made of text, and it is dropped in print where nothing is clickable.
- **Anything reading the page back must skip those notes.** `readableText()`
  strips `.sr-only`, `.anchor-btn`, `.copy-btn` and `.detail-btn` before
  returning text. The exclusion list lives in exactly one place: the same bug
  has appeared three times — section names reading `"About#"`, and a row reading
  `"linkedin.com/in/affannajiy (opens in a new tab)Copy"` in both the search
  results and the exported JSON.

## Tap targets that are smaller than they look

`.anchor-btn`, `.detail-btn` and `.copy-btn` are 16–17px visual boxes carrying a
**40px invisible hit overlay**. `.anchor-btn` uses `::before` specifically,
because `::after` already carries its "copied" confirmation text.

Inline `.text-link`s in prose and table cells remain below 40px, as they always
have — they are words in a sentence, not controls.

**Two that were wrong and are now fixed.** The skip link measured 37px and the
footer's "Back to top" measured 17px. Both are navigation controls rather than
words in a sentence, so the floor applies; both got `min-height: 40px` rather
than an overlay, because neither has a neighbour to collide with. The skip link
being the first control a keyboard reader reaches made it the worse of the two.

## ARIA state is the single source of truth

`aria-sort` on the `<th>` and `aria-pressed` on the chips are what the CSS
indicator is drawn **from**. Never set the arrow or the pressed style
independently — the visible and the announced state must not be able to drift
apart.
