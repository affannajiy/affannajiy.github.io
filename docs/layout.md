# Layout, the sticky header, and things that want a width

Related: [accessibility.md](accessibility.md) (tap targets),
[design-system.md](design-system.md) (typography, incl. the monospace ban this
page carves an exception out of).

---

## 1. The grid

- Content column: `max-width: 1000px`, centred, `1.25rem` gutters (`1rem` on
  mobile).
- Single breakpoint at **640px**. Do not add more without a reason that cannot
  be solved by `flex-wrap` or a fluid unit.
- Tested at **375px** and **1280px**. Both must pass before any style change
  ships.
- **Wide tables scroll inside `.table-wrap`, never past the page edge.**
  `document.documentElement.scrollWidth` must equal `innerWidth` at 375px.
  Hidden overflow is hidden data — the sideways scroll is announced in words via
  `.scroll-hint` on mobile.

## 2. The sticky-header offset trap

Sticky header requires `scroll-margin-top` on `.section` **greater than the
header's real height**, or anchor links land under the nav. Eight nav items wrap
to two rows at 375px, making the header ~124px. `scroll-margin-top` is `11.5rem`
(172px) on mobile — deliberately generous, so that a ninth item wrapping the nav
to three rows (~160px) does not silently break anchor landing. **Re-measure
anyway when adding one.**

## 3. The condensed header (mobile only)

A 124px sticky header is 15% of a 667px phone screen, held there for the whole
read. Once the masthead's measured `bottom` goes negative, `html` gains
`.nav-condensed` and the header drops to one row — **measured 123.8px → 41.6px,
82px given back**. Above 640px the class is still set but styles nothing; the
desktop header is one row already.

Four things about it are load-bearing:

- **No destination is removed.** All eight links stay; the row scrolls sideways.
  The right-edge `mask-image` fade is what says so — a hard clipped edge would
  read as the end of the list (Gestalt §2.4). The nav carries
  `padding-right: 2.25rem` purely as scroll slack, or the last item (Résumé) can
  never scroll clear of its own fade.
- **The class goes on `<html>`, not on the header**, because `scroll-margin-top`
  depends on it: 11.5rem against a 41.6px header would strand every heading
  130px down the page. `.nav-condensed .section` is `4.5rem`.
- **`condense()` runs before `update()`** in the scrollspy's rAF callback. It
  decides whether the nav is a scrolling box at all, and `update()` asks that
  question when it scrolls the marked item into view — reversed, the first
  condensing frame measures the old layout and never re-measures, because
  `update()` short-circuits once the marked section stops changing.
- `keepNavItemVisible()` uses `getBoundingClientRect`, **not `offsetLeft`** —
  the nav is statically positioned, so `offsetLeft` is measured from the page
  and differs from the scroll box by the header's padding.

## 4. Bars, diagrams and other things that want a width

- **Never set a width to draw data.** A percentage width can only arrive as an
  inline `style` attribute, which hard constraint 1.8 forbids — and the CSP does
  *not* stop CSSOM writes, so it would fail as a silent layout bug rather than
  as a loud error. The language distribution is drawn with block characters
  (`"█".repeat(...)`) in the cell. Text bars also copy, print, and survive zoom.
  The bar is `aria-hidden`, because twenty-four identical glyphs read aloud is
  noise; the percentage beside it is the real value.
- **Monospace is permitted for the bars, the ASCII diagram and the JSON view,
  and nowhere else.** The typography rule bans a second family for *hierarchy*;
  these three need equal character widths to be correct at all, which is a
  different argument. Body, headings and tables stay `--sans`.
- **Anything preformatted scrolls inside its own box.** `.ascii-wrap` is
  `overflow-x: auto` with a `.scroll-hint`, because §1 forbids page overflow at
  375px outright and ASCII art is wider than a phone.
