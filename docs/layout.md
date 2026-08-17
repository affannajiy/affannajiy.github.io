# Layout, sticky header, things that want a width

Related: [accessibility.md](accessibility.md) tap targets ·
[design-system.md](design-system.md) typography, incl. the monospace ban this
page carves an exception out of.

---

## 1. The grid

- Content column `max-width: 1000px`, centred, `1.25rem` gutters (`1rem` mobile).
- **One breakpoint, 640px.** Add none without a reason `flex-wrap` or a fluid
  unit cannot solve.
- Tested at **375px** and **1280px**. Both pass before any style change ships.
- **Wide tables scroll inside `.table-wrap`, never past the page edge.** Hidden
  overflow is hidden data — the sideways scroll is announced by `.scroll-hint`.

## 1a. `documentElement.scrollWidth` lies

`clientWidth - documentElement.scrollWidth` was the overflow check for three
rounds. It reports **−35px at 375px** on a page that cannot scroll sideways at
all. Every table is wider than the phone and sits in a `.table-wrap` with
`overflow-x: auto`, which contains it correctly — the wrap's right edge is
inside the viewport. `documentElement.scrollWidth` reports the union of
descendants **unclipped** by that intermediate scroller.

**Ground truth instead:** `window.scrollTo(500, 0)` then read `window.scrollX`,
or read `document.body.scrollWidth`. Both say 0 and 375 here. The `−15
(scrollbar)` recorded at 1280px in earlier rounds is the same artifact, not a
scrollbar.

## 2. The sticky-header offset trap

`scroll-margin-top` on `.section` must **exceed the header's real height**, or
anchor links land under the nav. Eight nav items wrap to two rows at 375px →
~124px header. `scroll-margin-top` is `11.5rem` (172px) on mobile, deliberately
generous so a ninth item wrapping to three rows (~160px) does not silently break
anchor landing. **Re-measure anyway when adding one.**

## 3. The condensed header (mobile only)

124px sticky is 15% of a 667px screen, held for the whole read. Once the
masthead's `bottom` goes negative, `html` gains `.nav-condensed` and the header
drops to one row — **123.8px → 41.6px, 82px back**. Above 640px the class is set
but styles nothing; desktop is one row already.

Four load-bearing details:

- **No destination is removed.** All eight links stay; the row scrolls sideways.
  The right-edge `mask-image` fade is what says so — a hard clipped edge reads as
  the end of the list (Gestalt §2.4). `padding-right: 2.25rem` is scroll slack,
  or Résumé can never clear its own fade.
- **The class goes on `<html>`, not the header**, because `scroll-margin-top`
  depends on it: 11.5rem against a 41.6px header strands every heading 130px
  down. `.nav-condensed .section` is `4.5rem`.
- **`condense()` runs before `update()`** in the scrollspy's rAF callback. It
  decides whether the nav is a scrolling box at all, which `update()` asks when
  scrolling the marked item into view. Reversed, the first condensing frame
  measures the old layout and never re-measures — `update()` short-circuits once
  the marked section stops changing.
- `keepNavItemVisible()` uses `getBoundingClientRect`, **not `offsetLeft`** — the
  nav is statically positioned, so `offsetLeft` is measured from the page and
  differs from the scroll box by the header's padding.

## 3a. Header tools, and the row they must not add

Third header child: `.header-tools` — position readout plus the Search control
that is the only way into the palette on touch
([state-and-data.md](state-and-data.md) §4).

**It must not cost a row.** The mobile header was `flex-direction: column`, so a
third child took it to **164px** — and header height comes off every section's
`scroll-margin-top`, so an extra 40px band is paid on every jump as well as
every screenful. Fixed by ordering, not a new media query: `flex-flow: row
wrap`, tools `order: 1` beside the wordmark, nav `order: 2` with
`flex-basis: 100%` taking row two. **Back to 124px.**

**Condensed, the readout goes entirely.** One 40px row holds wordmark, scrolling
nav and Search. The readout restates what the nav marks with `aria-current`;
taking 55px off a scrolling strip to repeat that is the wrong trade. **42px**,
nav keeps a 116px scroll box.

**A control setting `display` needs its own `[hidden]` rule.** `.header-search`
and `.focus-exit` are `display: flex`, out-ranking the UA rule `hidden` depends
on — both rendered while claiming hidden, and the Search button would have shown
for a reader with no JS pointing at a dialog that could never open. Same pattern
as `.topic-chips[hidden]` and `.featured-band[hidden]`.

## 4. Bars, diagrams, things that want a width

- **Never set a width to draw data.** A percentage width can only arrive as an
  inline `style` attribute, which constraint 1.8 forbids — and the CSP does
  *not* stop CSSOM writes, so it fails as a silent layout bug rather than a loud
  error. Language distribution is drawn with block characters
  (`"█".repeat(...)`). Text bars also copy, print and survive zoom. The bar is
  `aria-hidden` — twenty-four identical glyphs read aloud is noise; the
  percentage beside it is the value.
- **Monospace allowed for the bars, the ASCII diagram and the JSON view, nowhere
  else.** The typography rule bans a second family for *hierarchy*; these three
  need equal character widths to be correct at all. Body, headings, tables stay
  `--sans`.
- **Anything preformatted scrolls in its own box.** `.ascii-wrap` is
  `overflow-x: auto` with a `.scroll-hint` — §1 forbids page overflow at 375px
  and ASCII art is wider than a phone.
