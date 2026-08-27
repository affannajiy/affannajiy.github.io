# Print, PDF export, one-page résumé

Related: [tables.md](../../site-state-and-tables/reference/tables.md) ·
[state-and-data.md](../../site-state-and-tables/reference/state-and-data.md).
Measurement procedure: the `verify-print` skill.

## 0. The printed QR code

`assets/qrcode_affannajiy.github.io.png` (450×450), floated right in the masthead,
**18mm**. The screen never shows it (`display: none`), and the screen copy lives
in the QR dialog. Print sets the size explicitly, so the intrinsic pixel count
only has to carry the ink. 450px across 18mm is ~635dpi.

It is in the masthead and not in Links for one reason: Links carries
`data-resume-default="off"`, so a code there would be missing from the one-page
résumé, the sheet someone is most likely holding.

**It is the masthead's first child because it floats.** A float only sits beside
the blocks *after* it. Placed lower it clears only the fact list, which in résumé
mode is down to two rows.

| | Record | Résumé |
| --- | --- | --- |
| Masthead height | 67.3mm | **21.6mm** |
| Code box + margin | 19mm | 19mm |
| Height the code adds | 0 | **0** |

The résumé number is the constraint. At 22mm the code overhung a 21.6mm masthead
and leaked into About. `display: flow-root` on `.masthead` stops the leak, but
containment turns an overhang into *height*, and at 20mm that was 2.5mm of page
`estimateLines()` cannot see, because it counts characters and an image has none.
So the code is sized to fit **inside** the shortest masthead the résumé can
produce. Budget after: `About 58 lines of the ~59 a page holds`, unchanged.

Keep both rules. `flow-root` alone allows a silent budget cost. The size alone
lets a future masthead trim leak the float again. **Re-measure both if the
masthead loses a row.**

## 1. Print typography

**Verified, not assumed.** Flip `@media print` to `@media all`, measure, flip
back.

| Element | Size | Rule |
| --- | --- | --- |
| Body and prose | 11pt | body 10–12pt |
| Tables | 10pt | never below 10pt |
| Section headings | 14pt | headings 14–16pt |
| Name | 20pt | letterhead, outside the body rule |
| Sub-headings, notes, meta values | 10–11pt | |
| Printed link URLs | 8.5pt | supplementary, still legible |
| Page margin | 14mm (0.55in) | at least 0.5in |

**Tables stay tables on paper.** Same columns, same order, `.5pt` hairline per
cell edge, `1pt` under the header row. `thead` is `display: table-header-group`,
so a table that crosses a page break reprints its labels. Otherwise page two is a
grid of unlabelled columns. Rows carry `break-inside: avoid`, so a role never
separates from its dates. Zebra is dropped, because it prints as grey haze.
`.sort-btn` becomes plain text.

The screen removes outer cell edges so `.table-wrap`'s border can supply them.
That wrapper has no border on paper, so `th:last-child`, `td:last-child` and
`tbody tr:last-child > *` must each be **overridden by name** in the print block.
The screen's selectors are more specific, so a plain `th, td { border }` loses and
leaves the right and bottom edges open.

## 2. One-page résumé

**Removed 2026-08-27, kept here as history.** The export dialog offered two formats and set `body.print-resume`. The dialog and `estimateLines()` are gone; the `body.print-resume` CSS remains in `style.css` and is now inert — nothing sets the class, so the base print block is the only path. Ctrl+P is the whole print story now. Its own removal pass has not been done.

| | Full record | One-page résumé |
| --- | --- | --- |
| Tables | Bordered grid, as on screen | Linearised, one line per row, no borders |
| Rows | All 66 | Only `tr[data-resume]`, in curated sections |
| Sections | All ticked | `data-resume-default="off"` unticks Certificates, Projects, Links |
| `@page` margin | 12.7mm + 1.3mm on `main` = 14mm | 12.7mm (0.5in, §1 floor) |

**One page is a selection problem, not a typography one.** A4 at 12.7mm leaves
271.6mm live. 10pt at 1.3 line-height is about 4.6mm, so ~59 lines. The full
record is 66 rows *before* any heading. No font size closes that, so rows get
dropped. **Never shrink type to fix an overflow.** 10pt is the floor, and it is
there for a reader.

**Curation is per section, not per table.** A `.section` that holds any
`[data-resume]` gets `.resume-curated`. Inside it, unmarked rows and unmarked
`.section-body > p` are hidden. That drops the one-row MBOT and PETRA UTP tables
without naming them. A section that marks nothing, such as Skills, prints whole. A
table left with no rows hides together with its `.subhead` through
`.resume-empty`, set in JS because CSS cannot ask about emptiness.

**What bought the page**, measured 381.3mm → 260.1mm: Skills to three columns
via `data-resume-columns="3"` (−48) · masthead meta collapsed to its two
`[data-resume]` items inline (−30) · curation dropping empty Experience tables
and subheads (−25) · About printing only its marked paragraph (−19).
**Margin is 11.5mm — re-measure before adding content.**

## 3. `estimateLines()` must agree with the stylesheet

`#export-budget` (`role="status"`) states lines used against lines available, and
warns past one page. If the estimate and the CSS disagree about what prints, the
readout describes a page that does not exist.

Four things it keeps in step. The two disagreeing found each one:

- **`.hint` paragraphs are not counted.** `.hint{display:none}` on paper. Nobody
  noticed at two hints. At eight, Skills alone was charged five lines for nothing.
- **`.evidence` cells are not counted.** `.print-resume .evidence` is
  `display:none`. Most valuable column on screen, most expensive on paper.
- **Control labels and `sr-only` notes are not counted.** They are read through
  `readableText()`. Charging for "(opens in a new tab)" is the `.hint` mistake.
- **`.resume-omit` blocks are not counted**, and never were. They are neither a
  `<p>` nor a row, so the curation rules cannot reach them. That is what drops the
  ASCII diagram from the résumé.

## 4. Filters and focus reverse on paper; view modes do not

`.filtered-out` becomes `display:table-row` in the print block. The filter control
does not print, so a PDF that shows three of seven certificates gives no reason
for the missing four and reads as three being all there are. A view mode is
different: the toggle is visible, named, and next to what it changed, so printing
it prints what the reader chose.

**`.block-empty` reverses with it, one level up.** A filter that empties a table
also collapses its sub-heading (`syncEmptyBlocks()`). If that survived into print,
a PDF taken with the year bar on 2023 would be missing two affiliations entirely,
with no year bar to explain the gap.

**Focus mode reverses too.** Exit lives in the header, and the header does not
print, so a focused PDF would be one section with nothing to say the other seven
were set aside. Focus is a reading posture, not a decision about content.

Two things make the reversals behave:

- **`.block-empty` takes no `!important`.** It matches the screen rule for
  specificity and sits later in the file, so it wins on order, and
  `.print-resume .resume-empty` (two classes) can still beat it. Curation *is* a
  decision about what prints. A filter is not. `!important` here would print the
  tables the résumé deliberately dropped.
- **Focus mode needs an explicit `.print-hidden` guard:**

  ```css
  body.focus-mode .section:not(.focus-target) { display: revert; }
  body.focus-mode .section.print-hidden       { display: none !important; }
  ```

  The first carries three classes and an element, so it out-ranks a bare
  `.print-hidden` and would print sections the reader unticked. Re-stating it
  keeps the dialog the only thing that decides what prints.

**`estimateLines()` does not skip `.block-empty`.** The block returns on paper,
so counting it is what makes the budget describe the page you get.

**Measured:** 58 lines with no filter, 58 on 2023, 58 on 2026, 58 focused.
Focused on screen 1 section → as printed 8 → with two unticked **6** → back to 1,
nothing leaked. `.hit-flash` is dropped too. A leftover highlight is a colour that
means nothing on paper.

## 5. Export to PDF

- **No PDF library, ever.** Export sets what is visible and calls
  `window.print()`. The browser's "Save as PDF" typesets it. The output keeps
  selectable text and live links, because it is not a screenshot.
- Native `<dialog>` with `showModal()`. The focus trap, inertness and Escape come
  from the browser. With no `showModal`, the button removes itself instead of
  opening nothing.
- Section checkboxes are **built from the DOM** at open, so nobody can forget a
  new section.
- `data-print-default="off"` starts a section unticked. §08 Résumé does, because
  a paragraph explaining how to get the PDF, printed inside that PDF, is noise.
  Unticking hides the heading too. `.print-hidden` is `display:none`, not a
  collapse.
- The fold marker is a **chevron drawn from borders**, not `+`/`−`. Down is
  collapsed, up is expanded (Jakob's Law). The rotation is transitioned, so in the
  preview pane, which never paints, the computed `transform` stays frozen. **Check
  it through `margin-top`**, which is not transitioned, or read the declared
  `transform` from the CSSOM. A frozen transform there is not a bug.
- **Every print-time change is recorded and undone.** Hidden sections, forced
  folds and the Projects filter go into a `restore` object, reverted on
  `afterprint` plus a timed fallback, because not every browser fires that event.
  A page left mangled after a cancelled print is worse than no export.
- **`.cert-verify` does not print.** URLs are emitted only for
  `#certificates a[href^="assets"]`, so a verification link would print as the
  bare word "Verify", and a 100-character accomplishment hash is not a URL anybody
  types. The ` · ` separator lives **inside** the span, so both go together
  instead of leaving the cell ending in a dot.
- The print block drops the header, nav, footer, filter, status line and all
  buttons. It repeats `<thead>` per page and forbids a row splitting across a
  break. Link URLs print only in the masthead, Links and Certificates, never for
  Projects.

## 6. History, so linearisation is not "fixed" again

Linearisation once applied to *every* print, because an ATS parses multi-column
tables badly. That was the wrong default, since a person reads the full record,
but it is the right résumé. So it lives in `body.print-resume` instead of being
deleted. That is also why the résumé mode is the ATS-safe one, and why
`assets/resume.pdf` stays as the fixed plain copy for a job portal.

## 7. Page breaks

- `orphans: 3` and `widows: 3` on `p`, `li` and `dd`. `break-after: avoid-page` on
  `.section-title`, `.subhead` and `thead`. `break-inside: avoid-page` on `tr`.
  Both the modern and the `page-break-*` names, because engines differ.
- **Never `break-inside: avoid` on a whole table.** Several are longer than a
  page. Forbidding an internal break pushes the whole table to a fresh sheet and
  leaves half a page of white above it.
- Budget re-measured after: **58 of ~59**, unmoved.
