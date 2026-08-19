---
name: site-design-and-layout
description: The portfolio's colour tokens, the orange rule, typography, the grid, the sticky-header offset, the condensed mobile header, and everything that wants a width. Use before changing a colour, a token, a typeface, the grid, the header, spacing, or before drawing any bar, meter or diagram.
---

# Design system and layout

Two reference files. **Read the one you are about to touch before touching it** —
each holds the reason a rule exists, and the rules here have all been broken
before.

| Changing… | Read |
| --- | --- |
| A colour, a token, a typeface, the use of orange | [reference/design-system.md](reference/design-system.md) |
| The grid, the sticky header, spacing, anything wanting a width | [reference/layout.md](reference/layout.md) |

## The traps that bite hardest

- **Never hardcode a hex below the `:root` token block** in `style.css`.
- **Orange is a signal, not decoration.** `--accent` (`#f97316`) is 2.64:1 on
  cream — rules, borders, underlines, focus rings only. Orange *words* use
  `--accent-text`.
- **Light only.** No `prefers-color-scheme: dark` block unless Affan asks.
- **One family, screen and print** (`--sans`). Hierarchy from weight, size,
  letter-spacing, case — never typeface.
- **The CSP does not block CSSOM writes.** A width set from JS is not blocked; it
  is an invariant broken quietly. Data bars use block characters
  (`reference/layout.md` §4).
- **A rule setting `display` overrides the `hidden` attribute.** Anything styled
  `display: flex/grid/block` needs its own `[hidden] { display: none }`
  (`reference/layout.md` §3a).
- **Sticky-header offset**: new anchors must clear it — see
  `reference/layout.md`, and the `edit-site-content` skill.

After any change here run `verify-site`, plus `check-accessibility` if a colour,
a control or an animation moved.
