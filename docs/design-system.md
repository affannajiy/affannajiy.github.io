# Design system — colour, orange, typography

**Influences:** berkshirehathaway.com (text-first, radically undecorated) as the
base; mcmaster.com (dense, scannable data grids) for the tables. Palette carried
over from the `tyunnie-pa` project.

Related: [accessibility.md](accessibility.md) for the contrast floor these
tokens are measured against, [layout.md](layout.md) for the grid they sit in.

---

## 1. Colour tokens

**Light mode only, deliberately.** There is no dark theme and no theme toggle.
`color-scheme: light` is declared on `:root` so browsers do not auto-invert
controls and scrollbars on a dark OS. Do not add a `prefers-color-scheme: dark`
block back without being asked for one.

All colour lives in CSS variables in the `:root` block at the top of `style.css`.
**Never hardcode a hex value below the token block.** Change a token once; it
propagates.

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
| `--accent-soft` | `#fff0e6` | Row hover fill, error callout |
| `--accent-mid` | `#fed7aa` | Resting link underline, sort arrows |

## 2. The orange rule

**Orange is a signal, not decoration.** It is permitted only on: link underlines
and link hover, section index numbers, the table-header bottom rule, nav hover
underline, row-hover fill, and focus rings.

It is **not** permitted as: a large background fill, a gradient, a shadow, a
heading colour, or body text.

**`--accent` vs `--accent-text` is a contrast rule, not a style preference.**
`#f97316` measures 2.64:1 on the cream background — it fails WCAG AA for text.
Anything that renders orange *words* must use `--accent-text` (4.96:1).
`--accent` is for rules, borders, underlines and focus rings, where the ratio
does not bind.

## 3. Typography

- **One family, screen and print: `--sans` = Arial / Helvetica / Liberation
  Sans.** The former Georgia-prose / mono-data split was removed deliberately —
  this page is the résumé, and résumé convention (and ATS parsers) want one or
  two standard families, not a typographic device. Hierarchy is carried by
  **weight, size, letter-spacing and case**, never by typeface.
- **Do not reintroduce a second family**, and do not switch to Calibri, Aptos or
  Garamond: they ship with Microsoft Office or not at all, so on macOS or Linux
  they fall back to something unchosen. Arial and Helvetica are the only pair
  installed everywhere.
- System fonts only (hard constraint 1.3). No webfont downloads.
- Tables set `font-variant-numeric: tabular-nums`. Monospace used to align the
  star and date columns for free; with a proportional face that alignment must
  be asked for.

**The one monospace exception** is documented in [layout.md](layout.md) — the
text bars, the ASCII diagram and the JSON view need equal character widths to be
correct at all, which is a different argument from hierarchy.
