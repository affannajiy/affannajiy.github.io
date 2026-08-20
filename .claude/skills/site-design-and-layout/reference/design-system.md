# Design system — colour, orange, typography

**Influences:** berkshirehathaway.com (text-first, undecorated) as the base.
mcmaster.com (dense scannable grids) for tables. Palette from `tyunnie-pa`.

Related: [accessibility.md](../../check-accessibility/reference/accessibility.md) contrast floor ·
[layout.md](layout.md) the grid.

## 1. Colour tokens

**Light only, deliberately.** No dark theme, no toggle. `color-scheme: light` on
`:root`, so browsers do not auto-invert controls on a dark OS. **Do not add a
`prefers-color-scheme: dark` block back unless asked.**

All colour lives in `:root` at the top of `style.css`. **Never hardcode a hex
below the token block.** Change a token once, it propagates.

| Token | Value | Role |
| --- | --- | --- |
| `--bg` | `#faf8f5` | Page — warm cream |
| `--surface` | `#ffffff` | Tables |
| `--surface-2` | `#f3f0ea` | Zebra stripe |
| `--border` | `#e8e2d8` | Hairline rules |
| `--rule` | `#111010` | Structural rules (header, footer, masthead) |
| `--fg` | `#111010` | Headings, table header fill, buttons |
| `--text` | `#2d2416` | Body copy |
| `--muted` | `#75695a` | Hints, footer, nav, label column |
| `--accent` | `#f97316` | Brand orange — **non-text only** |
| `--accent-text` | `#b8490c` | Orange **words** |
| `--accent-soft` | `#fff0e6` | Row hover, error callout, search highlight |
| `--accent-mid` | `#fed7aa` | Resting link underline, sort arrows |

## 2. The orange rule

**Orange is a signal, not decoration.** Allowed on link underlines and hover,
section index numbers, the table-header bottom rule, nav hover underline,
row-hover fill and focus rings.

**Not** allowed as a large background fill, a gradient, a shadow, a heading
colour or body text.

**`--accent` against `--accent-text` is a contrast rule, not taste.** `#f97316`
measures 2.64:1 on cream, so it fails AA for text. Orange *words* use
`--accent-text` (4.96:1). `--accent` is for rules, borders, underlines and focus
rings, where the ratio does not bind.

## 3. Typography

- **One family, screen and print: `--sans` = Arial / Helvetica / Liberation
  Sans.** The old Georgia-prose and mono-data split is gone. This page *is* the
  résumé, and résumé convention (and ATS parsers) want one or two standard
  families, not a typographic device. Hierarchy comes from **weight, size,
  letter-spacing and case**, never from typeface.
- **Do not add a second family.** Not Calibri, Aptos or Garamond: they ship with
  Office or not at all, so macOS and Linux fall back to something unchosen. Arial
  and Helvetica are the only pair installed everywhere.
- System fonts only (constraint 1.3). No webfonts.
- Tables set `font-variant-numeric: tabular-nums`. Monospace aligned date columns
  for free. A proportional face must be asked.

**One monospace exception,** in [layout.md](layout.md) §4: text bars, the ASCII
diagram and the JSON view need equal character widths to be correct at all.

## 4. Symbols are text, not emoji

**No icon library, ever.** A webfont or SVG icon set breaks constraints 1.2, 1.3
and 1.4 at once. Symbols are Unicode characters drawn as generated content.

**Every symbol carries `\FE0E` (VARIATION SELECTOR-15).** Arial and Helvetica on
iOS carry no glyph for the arrows or the check mark, so iOS falls back to Apple
Color Emoji and a blue emoji arrow lands mid-sentence. `\FE0E` says *render as
text*. Reported from an iPad, 2026-08-19. The five that carry it:

| Glyph | Where |
| --- | --- |
| `\2197` new-tab arrow | `a[target="_blank"]::after` |
| `\2195 \2191 \2193` sort arrows | `.sort-btn::after` and the `aria-sort` states |
| `\2713` topic check | `script.js`, the topic matrix cell |

Box-drawing characters (`\2500` and friends) in the ASCII diagram and the text
bars need no selector. They have no emoji presentation, and they sit in the one
monospace exception in [layout.md](layout.md) §4.
