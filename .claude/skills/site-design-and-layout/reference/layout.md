# Layout, sticky header, things that want a width

Related: [accessibility.md](../../check-accessibility/reference/accessibility.md) tap targets ·
[design-system.md](design-system.md) typography, with the monospace ban this page
carves an exception out of.

## 1. The grid

- Content column `max-width: 1000px`, centred, `1.25rem` gutters (`1rem` mobile).
- **One breakpoint, 640px.** Add none without a reason that `flex-wrap` or a
  fluid unit cannot solve.
- Tested at **320px**, **375px** and **1280px**. All three pass before any style
  change ships. 320 is the WCAG 1.4.10 reflow floor, first checked 2026-08-20,
  and it passes with 0 overflow.
- **The column is the measure. Prose gets no second cap.** `.section-body p` is
  `max-width: 100%` and reflows with the viewport. A 65ch cap was added and
  reverted on 2026-08-20: the paragraphs here are short, so the cap crunched them
  into a narrow strip against a wide empty gutter, which reads worse than a long
  line. Measured line lengths at 1280px without it: bare prose 108ch, `.note`
  120ch, `.hint` 144ch. That is above the 80ch readable ceiling (UI-UX §6.10) and
  accepted on purpose. **If a cap is ever tried again**, two facts from that
  attempt still apply. A bare `.hint` is specificity (0,1,0) and loses to
  `.section-body p` at (0,1,1), so every selector needs the `.section-body`
  prefix. And `:not([class])` is needed to spare `.resume-actions` and
  `.fold-controls`, which are `<p>` button rows and squash at 65ch.
- **Prose is justified above 640px, ragged below, and always hyphenated.**
  `.section-body > p:not([class])`, `.section-body p.note` and `.colophon-note`,
  inside `@media screen and (min-width: 641px)`. Affan's call, 2026-08-20.
  UI-UX §6.12 rules against justify, and the two conditions on this rule are what
  answer it — **neither is optional**:
  - **`hyphens: auto`.** Justify stretches word spaces on every line but the last.
    Unhyphenated at these measures it opens rivers. With hyphenation at 1280px the
    widest space is 5.98px against a 4.17px natural space, so 1.43x. It needs
    `lang="en"` on `<html>`, which is already there.
  - **`min-width: 641px`.** A narrow column has fewer spaces per line to absorb
    the slack, so justify hurts it far more. Measured at 320px without this gate:
    widest space **27.75px** against the same 4.17px natural, **6.6x** — holes
    wide enough to read as a layout bug. This nearly shipped. **Never justify
    below the breakpoint.**
  `.hint` is excluded: annotations, not body copy. `:not([class])` spares
  `.resume-actions` and `.fold-controls`. Screen only — hyphenation moves line
  breaks, and lines are what the one-page résumé budget counts.
- **Safe-area insets.** `main` and `.site-header` use
  `padding: 0 max(1.25rem, env(safe-area-inset-right)) 0 max(1.25rem, env(safe-area-inset-left))`,
  with `viewport-fit=cover` on the meta viewport. Without that second half iOS
  letterboxes the page and `env()` reports 0. `max()`, not addition, so a device
  with no cutout keeps the normal gutter.
- **Below 640px nothing scrolls sideways at all.** See §1b. Above it, wide tables
  scroll inside `.table-wrap`, never past the page edge. Hidden overflow is
  hidden data.

## 1a. `documentElement.scrollWidth` lies

`clientWidth - documentElement.scrollWidth` was the overflow check for three
rounds. It reports **−35px at 375px** on a page that cannot scroll sideways at
all. Every table is wider than the phone and sits in a `.table-wrap` with
`overflow-x: auto`, which contains it correctly, and the wrap's right edge is
inside the viewport. `documentElement.scrollWidth` reports the union of
descendants **unclipped** by that intermediate scroller.

**Use ground truth instead:** `window.scrollTo(500, 0)`, then read
`window.scrollX`. Or read `document.body.scrollWidth`. Both say 0 and 375 here.
The `−15 (scrollbar)` recorded at 1280px in earlier rounds is the same artifact,
not a scrollbar.

## 1b. One scroll direction below 640px

**A phone reader scrolls down, never sideways.** Nine of twenty `.table-wrap`s
overflowed at 375px, so nine tables needed a second gesture to be read at all.
Below 640px every `.grid-table` stacks instead: one card per row, each cell on its
own line under its column name. Measured at **320px and 375px: zero offenders,
`scrollWidth === innerWidth`, zero scrolling wraps.**

- **Labels are derived, never typed.** `labelCells()` reads the table's own
  `<thead>` and writes `data-label`, and CSS draws it with `attr()`. Same bargain
  `syncScrollableTables()` makes with `<caption>`. An attribute is invisible to
  `readableText()`, so the search index, the JSON view and the résumé budget are
  untouched. Budget re-measured **58 of ~59**, unmoved. Re-run it after any
  render. `renderRows()` and `buildStats()` both do.
- **`<thead>` survives only where it is a control.** With `.sort-btn`s it becomes
  a wrapped "Sort by" bar above the cards. Without them it goes, because every
  cell now names its own column. `:has(.sort-btn)` decides, so a table that gains
  or loses a sort follows automatically. Hiding it unconditionally would have
  taken sorting off every phone, the trap the header Search control closes.
- **`screen and (max-width: 640px)`.** Print has its own linearisation, driven by
  what the reader ticked instead of by a width. These rules must not reach it.
- **Two things still scroll in their own box, on purpose.** `.ascii-wrap` is
  fixed-width art that cannot reflow. `#compare-table` is repositories against
  attributes: stacked, each card holds one attribute across every repository and
  the comparison is gone. It is excluded by name and keeps its dialog's scroll.
- **Two of the three `.scroll-hint`s are deleted.** They said "table scrolls
  sideways", which is no longer true, and a hint that describes a gesture the page
  does not ask for is a status line claiming something that is not happening. The
  class survives for the ASCII diagram, which does still scroll. **Never put it
  back on a table without checking that one still scrolls.**

**Every dialog is centred on both axes.** Verified on all seven. The search dialog
was the exception at `6vh` from the top, and centring it needed a **fixed** height
(`min(82vh, 34rem)`) instead of a maximum. Centred plus auto height means the box
grows symmetrically as results arrive and slides the input out from under the
finger typing into it. The list scrolls inside instead, which is what
`.search-results` was already for.

## 2. The sticky-header offset trap

`scroll-margin-top` on `.section` must **exceed the header's real height**, or
anchor links land under the nav. Eight nav items wrap to two rows at 375px, so the
header is ~124px. `scroll-margin-top` is `11.5rem` (172px) on mobile, deliberately
generous, so a ninth item wrapping to three rows (~160px) does not break anchor
landing quietly. **Re-measure anyway when you add one.**

## 3. The condensed header (mobile only)

124px sticky is 15% of a 667px screen, held for the whole read. Once the
masthead's `bottom` goes negative, `html` gains `.nav-condensed` and the header
drops to one row — **123.8px → 41.6px, 82px back**. Above 640px the class is set
but styles nothing, because desktop is one row already.

Four load-bearing details:

- **No destination is removed.** All eight links stay and the row scrolls
  sideways. The right-edge `mask-image` fade is what says so, because a hard
  clipped edge reads as the end of the list (Gestalt §2.4). `padding-right:
  2.25rem` is scroll slack, or Résumé can never clear its own fade.
- **The class goes on `<html>`, not the header**, because `scroll-margin-top`
  depends on it. 11.5rem against a 41.6px header strands every heading 130px down.
  `.nav-condensed .section` is `4.5rem`.
- **`condense()` runs before `update()`** in the scrollspy's rAF callback. It
  decides whether the nav is a scrolling box at all, which `update()` asks when it
  scrolls the marked item into view. Reversed, the first condensing frame measures
  the old layout and never re-measures, because `update()` short-circuits once the
  marked section stops changing.
- `keepNavItemVisible()` uses `getBoundingClientRect`, **not `offsetLeft`**. The
  nav is statically positioned, so `offsetLeft` is measured from the page and
  differs from the scroll box by the header's padding.

## 3a. Header tools, and the row they must not add

Third header child: `.header-tools`, the position readout plus the Search control
that is the only way into the palette on touch
([state-and-data.md](../../site-state-and-tables/reference/state-and-data.md) §4).

**It must not cost a row.** The mobile header was `flex-direction: column`, so a
third child took it to **164px**. Header height comes off every section's
`scroll-margin-top`, so an extra 40px band is paid on every jump as well as every
screenful. Fixed by ordering, not by a new media query: `flex-flow: row wrap`,
tools `order: 1` beside the wordmark, nav `order: 2` with `flex-basis: 100%`
taking row two. **Back to 124px.**

**Condensed, the readout goes entirely.** One 40px row holds the wordmark, the
scrolling nav and Search. The readout restates what the nav marks with
`aria-current`, and taking 55px off a scrolling strip to repeat that is the wrong
trade. **42px**, and the nav keeps a 116px scroll box.

**A control that sets `display` needs its own `[hidden]` rule.**
`.header-search` and `.focus-exit` are `display: flex`, which out-ranks the UA
rule `hidden` depends on. Both rendered while they claimed to be hidden, and the
Search button would have shown for a reader with no JS, pointing at a dialog that
could never open. Same pattern as `.topic-chips[hidden]` and
`.featured-band[hidden]`.

## 3b. A margin on a centred flex item is a misalignment

`align-items: center` centres the item's **margin** box, so a top margin drops the
visible box by **half** of it. No error, no overflow, just a control sitting lower
than its neighbours. `.retry-btn` carries `margin-top: .6rem` for the standalone
case, the Retry under a failed status line after a `<br>`, and the Certificates
**Reset** inherited it: measured **4.8px** below three selects whose tops were
identical, exactly half of 9.6px.

Zeroed per container — `.compare-bar .retry-btn, .filter-row .retry-btn` — instead
of dropped from the base rule, because standalone is the common case. Below 640px
the row becomes a grid and Reset takes its own line, so the margin is put back
there deliberately. **Before you add a margin to a row item, check the row's
`align-items`.**

## 4. Bars, diagrams, things that want a width

- **Never set a width to draw data.** A percentage width can only arrive as an
  inline `style` attribute, which constraint 1.8 forbids. The CSP does *not* stop
  CSSOM writes, so it fails as a silent layout bug instead of a loud error.
  Language distribution is drawn with block characters (`"█".repeat(...)`). Text
  bars also copy, print and survive zoom. The bar is `aria-hidden`, because
  twenty-four identical glyphs read aloud is noise and the percentage beside it is
  the value.
- **Monospace is allowed for the bars, the ASCII diagram and the JSON view,
  nowhere else.** The typography rule bans a second family for *hierarchy*. These
  three need equal character widths to be correct at all. Body, headings and
  tables stay `--sans`.
- **Anything preformatted scrolls in its own box.** `.ascii-wrap` is
  `overflow-x: auto`, `tabindex="0"`, `role="group"`. §1 forbids page overflow at
  375px, and ASCII art is wider than a phone. It is the one thing §1b does not
  un-scroll, because fixed-width art cannot reflow.
