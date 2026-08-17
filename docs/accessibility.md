# Accessibility floor

Non-negotiable minimums, **measured, never eyeballed**. Snippets in the
`check-accessibility` skill.

Related: [design-system.md](design-system.md) tokens ·
[verification-log.md](verification-log.md) last round.

---

## The floor

- **All text ≥ 4.5:1.** Verified: body 14.4, muted/nav/hints/footer 5.05,
  section numbers and masthead role 4.96, row labels 5.35, table header 17.9.
- **Never colour alone.** Links carry a resting underline; the current nav
  section is marked by weight *and* a rule *and* `aria-current`; load and error
  states are words.
- `:focus-visible` rings on every interactive element. **Never bare
  `outline:none`.**
- Skip link to `#main` is the first focusable element. Keep it first.
- `prefers-reduced-motion: reduce` collapses transitions, disables smooth
  scroll, flattens the skeleton shimmer. Any new animation must respect it.
- **Tap target ≥ 40px.** Verified: nav 40, wordmark 40, sort 40, résumé 44.
- Tables use `<th scope>` and an `.sr-only` `<caption>`.

## Saying what the page is doing

- **A status line must never claim something that is not happening.** With JS
  off, Projects status used to read "Loading repositories from GitHub…" forever.
  `.no-js` on `<html>` — removed by the first line of `script.js` — hides every
  `.js-only` control, and `<noscript>` names what is missing and links the same
  data on GitHub. A dead control inviting a click is worse than no control
  (Nielsen §1.5).
- **`aria-busy="true"` while skeletons show.** They are shaped like data on
  purpose, which is exactly why a screen reader must be told they are not.
  Cleared on every settle path.
- **Every link leaving the page says so.** `target="_blank"` alone warns nobody:
  assistive tech gets nothing, a sighted reader finds out afterwards. Each
  carries `sr-only` "(opens in a new tab)" plus a CSS `↗`. Marker uses
  `--accent-text` (4.96:1) — it is a glyph made of text — and drops in print.
- **Anything reading the page back skips those notes.** `readableText()` strips
  `.sr-only`, `.anchor-btn`, `.copy-btn`, `.detail-btn`. **One exclusion list**:
  the same bug has appeared three times — `"About#"` section names, and
  `"linkedin.com/in/affannajiy (opens in a new tab)Copy"` in both search results
  and exported JSON.

## Tap targets smaller than they look

`.detail-btn` and `.copy-btn` are 16–17px boxes with a **40px invisible hit
overlay** — spending the target as height rather than box size, so a control
inside a table row does not set the row's height.

**`.anchor-btn` is now 40×40 and out of the `<summary>`.** Interactive content
inside a `<summary>` is disallowed — the browser owns that element's activation,
so a nested button is not consistently reachable by keyboard or AT. Chrome
reported it for all eight sections. It is now the `.section`'s **first** child,
so a keyboard pass meets it before the heading it belongs to, positioned back
into the heading band by CSS. Out of flow, the 40px box costs nothing: sized to
40 inside the summary it would have set the height of every section heading,
which is why it used to spend an invisible `::before` overlay that only ever
bought the height (the box stayed ~19px wide). The `stopPropagation` in its click
handler is gone with the nesting — the fold is no longer an ancestor.

Inline `.text-link`s stay below 40px — words in a sentence, not controls. Same
for `.ev-link` (15px): evidence phrases read as prose. `.related-btn` is a
control, so it carries `min-height: 40px` — measured 40. `.qr-btn` is drawn as a
`.copy-btn` and inherits its 40px `::after` overlay — box measured 22, hit area
40. The download link inside the dialog is a `.button` — measured 44.

**A QR code is information nobody can read.** Not by a screen reader, not by
someone already holding the device. So the address is printed as selectable text
in the Links row *and* in the dialog, the image carries
`alt="QR code linking to affannajiy.github.io"`, and the code is the convenience
rather than the content. With the file missing it degrades to exactly that: alt
text, and an address still readable.

**Two fixed:** skip link 37px, footer "Back to top" 17px. Both are navigation,
so the floor applies; both got `min-height: 40px` rather than an overlay, having
no neighbour to collide with. The skip link was worse — first control a keyboard
reader reaches.

## ARIA state is the single source of truth

`aria-sort` on the `<th>` and `aria-pressed` on chips are what the CSS indicator
is drawn **from**. Never set the arrow or pressed style independently; visible
and announced state must not be able to drift.

## Reachability, not discoverability

Shortcuts install only behind `(hover: hover)` — correct, a phone is never told
to press a key it lacks. But search had **no other way in**, so on touch the
dialog was not undiscovered, it was **unreachable**, and so was everything
behind it. *A feature gated behind a shortcut a device cannot produce is a
feature that device does not have.*

Header now carries a visible Search control, **40px**, revealed only once
`showModal` is confirmed. Its `Ctrl K` hint hides behind the same
`(hover: hover)` test the `?` panel uses.

**A rule setting `display` overrides the `hidden` attribute.** Both new controls
are `display: flex`, so both rendered while `hidden` was true — the Search
button would have shown for a reader with no JS, pointing at a dialog that could
never open. Each needs its own `[hidden] { display: none }`.

## Stacked tables keep their controls and their labels

Below 640px a row is a card ([layout.md](layout.md) §1b). Two things that would
have quietly gone missing:

- **Sorting.** The sort buttons live in `<thead>`; hiding it stacked would take
  sorting off every phone. `<thead>` is kept wherever `:has(.sort-btn)` matches,
  drawn as a "Sort by" bar. Same rule as the header Search control: *a feature
  gated behind something a device cannot produce is a feature that device does
  not have.*
- **Which column a value came from.** Each cell draws its `data-label` in a
  `::before`. Generated content, so nothing enters the DOM and `readableText()`
  cannot pick it up — but a screen reader still gets the column from the real
  `<th>`, which is what `scope` was always for.

**The sort buttons had to be redrawn as buttons.** `.sort-btn` is
`color: inherit`, and on desktop it inherits cream on the dark header row —
17.9:1, and obviously a control. Lifted into a bar sitting on cream with no
column beneath it, that inheritance turned into muted grey words that read as
decoration: *it was not clear there was anything to press.* Each is now a
bordered chip in `--fg`, and the pressed state is orange, **drawn from
`aria-sort`** like the arrow is, so filled and announced cannot drift.

Measured, all ≥ 4.5:1 — cell label on a card **5.35**, "Sort by" **5.35**, row
header **5.05**, `.anchor-btn` **5.05**, sort chip at rest **17.92**, sort chip
pressed **4.72** (`--accent-text` on `--accent-soft`). Never `--accent` itself for
the text: 2.64:1 on cream. Chips measured **71×40**.

## Marking, not removing

A nav item whose section is empty gets a **dotted underline** plus dimming —
never colour alone (WCAG 1.4.1) — and an `sr-only` "nothing to show here right
now", because `title` is unreachable by keyboard. Stays clickable. Removing it
would take the reader's map away and gate the section behind undoing a control.

## The search highlight

CSS Custom Highlight API inserts no node, so it cannot be read back out by
`readableText()` into the search index, JSON view or résumé budget. Tokens:
`--accent-text` `#b8490c` on `--accent-soft` `#fff0e6`, the pair already in use
elsewhere. Fallback row flash is **held and faded once, never pulsed**; under
`prefers-reduced-motion` it becomes a static background for the same duration —
same information, no animation.

Measured, all ≥ 4.5:1 — header search **16.70**, focus exit **17.06**, readout
**5.05**, palette group **5.05**, command marker **5.05**, command label
**14.40**.

## Keyboard, contrast and colour under duress

- **A scrollable table must be focusable — but only while it scrolls.** WCAG
  2.1.1: pointer-only scrolling is unreachable on a keyboard. 20 `.table-wrap`s
  here, so JS sets `tabindex="0"` + `role="region"` on the 9 that actually
  overflow and removes it when they stop. All 20 permanently tabbable would add
  19 dead stops — one access problem traded for a worse one.
- **The label comes from the table's `<caption>`**, never a hand-written
  `aria-label`. The caption is already required and already right.
- **Sorting announces itself.** `aria-sort` says what a header *is*; it says
  nothing about the rows that just reordered. One shared `sr-only`
  `role="status"` — per-table regions would collide. Uses the caption's **first
  sentence**: the whole caption spliced in read "Education history. Column
  headers sort the table. sorted by Qualification, ascending."
- **`forced-colors: active`** restates as borders and system keywords what was
  carried by a background fill — pressed chips, current nav item, search hit,
  focus rings. The language bars need nothing: they are the character `█`, text
  rather than a painted box, which is why they were drawn that way.
