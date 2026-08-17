# Design system — colour, orange, typography

**Influences:** berkshirehathaway.com (text-first, undecorated) as the base;
mcmaster.com (dense scannable grids) for tables. Palette from `tyunnie-pa`.

Related: [accessibility.md](accessibility.md) contrast floor ·
[layout.md](layout.md) the grid.

---

## 1. Colour tokens

**Light only, deliberately.** No dark theme, no toggle. `color-scheme: light` on
`:root` so browsers do not auto-invert controls on a dark OS. **Do not add a
`prefers-color-scheme: dark` block back unless asked.**

All colour lives in `:root` at the top of `style.css`. **Never hardcode a hex
below the token block.** Change a token once; it propagates.

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

**Orange is a signal, not decoration.** Permitted on: link underlines and hover,
section index numbers, table-header bottom rule, nav hover underline, row-hover
fill, focus rings.

**Not** permitted as: large background fill, gradient, shadow, heading colour,
body text.

**`--accent` vs `--accent-text` is a contrast rule, not taste.** `#f97316`
measures 2.64:1 on cream — it fails AA for text. Orange *words* use
`--accent-text` (4.96:1). `--accent` is for rules, borders, underlines and focus
rings, where the ratio does not bind.

## 3. Typography

- **One family, screen and print: `--sans` = Arial / Helvetica / Liberation
  Sans.** The old Georgia-prose / mono-data split was removed — this page *is*
  the résumé, and résumé convention (and ATS parsers) want one or two standard
  families, not a typographic device. Hierarchy comes from **weight, size,
  letter-spacing, case** — never typeface.
- **Do not reintroduce a second family.** Not Calibri, Aptos or Garamond: they
  ship with Office or not at all, so on macOS or Linux they fall back to
  something unchosen. Arial and Helvetica are the only pair installed everywhere.
- System fonts only (constraint 1.3). No webfonts.
- Tables set `font-variant-numeric: tabular-nums`. Monospace used to align date
  columns for free; a proportional face must be asked.

**One monospace exception**, in [layout.md](layout.md) §4 — text bars, ASCII
diagram, JSON view need equal character widths to be correct at all.
