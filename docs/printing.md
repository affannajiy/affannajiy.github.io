# Print, PDF export, one-page résumé

Related: [tables.md](tables.md), [state-and-data.md](state-and-data.md).
Measurement procedure lives in the `verify-print` skill.

---

## 0. The printed QR code

`assets/qrcode_affannajiy.github.io.png` (450×450), floated right in the masthead,
**18mm**. Screen never shows it (`display: none`); the screen copy lives in the QR
dialog. Print sets the size explicitly, so the intrinsic pixel count only has to
be enough for the ink — 450px across 18mm is ~635dpi.

Not in the Links section, and that is the reason it is in the masthead: Links
carries `data-resume-default="off"`, so a code living there would be missing from
the one-page résumé — the sheet someone is most likely holding.

**It is the masthead's first child because it floats.** A float only sits beside
the blocks *after* it. Placed lower it clears only the fact list, which in résumé
mode is down to two rows.

| | Record | Résumé |
| --- | --- | --- |
| Masthead height | 67.3mm | **21.6mm** |
| Code box + margin | 19mm | 19mm |
| Height the code adds | 0 | **0** |

The résumé number is the constraint. At 22mm the code overhung a 21.6mm masthead
and leaked into About. `display: flow-root` on `.masthead` stops the leak — but
containment turns an overhang into *height*, and at 20mm that was 2.5mm of page
`estimateLines()` cannot see, since it counts characters and an image has none. So
the code is sized to fit **inside** the shortest masthead the résumé can produce.
Budget after: `About 58 lines of the ~59 a page holds`, unchanged.

Keep both rules. `flow-root` alone permits a silent budget cost; the size alone
lets a future masthead trim leak the float again. **Re-measure both if the
masthead loses a row.**

## 1. Print typography

**Verified, not assumed** — flip `@media print` to `@media all`, measure, flip
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
so a table crossing a page break reprints its labels — else page two is a grid
of unlabelled columns. Rows `break-inside: avoid`, so a role never separates
from its dates. Zebra dropped (prints as grey haze). `.sort-btn` → plain text.

Screen removes outer cell edges so `.table-wrap`'s border can supply them. That
wrapper has no border on paper, so `th:last-child`, `td:last-child` and
`tbody tr:last-child > *` must each be **overridden by name** in the print block
— the screen's selectors are more specific, and a plain `th, td { border }`
loses, leaving the right and bottom edges open.

## 2. One-page résumé

Export dialog offers two formats; the choice sets `body.print-resume`.

| | Full record | One-page résumé |
| --- | --- | --- |
| Tables | Bordered grid, as on screen | Linearised, one line per row, no borders |
| Rows | All 66 | Only `tr[data-resume]`, in curated sections |
| Sections | All ticked | `data-resume-default="off"` unticks Certificates, Projects, Links |
| `@page` margin | 12.7mm + 1.3mm on `main` = 14mm | 12.7mm (0.5in, §1 floor) |

**One page is a selection problem, not a typography one.** A4 at 12.7mm leaves
271.6mm live; 10pt at 1.3 line-height ≈ 4.6mm → ~59 lines. Full record is 66
rows *before* any heading. No font size closes that — rows get dropped. **Never
shrink type to fix an overflow.** 10pt is the floor, and it is there for a reader.

**Curation is per section, not per table.** A `.section` holding any
`[data-resume]` gets `.resume-curated`; inside it, unmarked rows and unmarked
`.section-body > p` are hidden. That is what drops the one-row MBOT and PETRA
UTP tables without naming them. A section marking nothing — Skills — prints
whole. A table left with no rows, plus its `.subhead`, hide together via
`.resume-empty`, set in JS because CSS cannot ask about emptiness.

**What bought the page**, measured 381.3mm → 260.1mm: Skills to three columns
via `data-resume-columns="3"` (−48) · masthead meta collapsed to its two
`[data-resume]` items inline (−30) · curation dropping empty Experience tables
and subheads (−25) · About printing only its marked paragraph (−19).
**Margin is 11.5mm — re-measure before adding content.**

## 3. `estimateLines()` must agree with the stylesheet

`#export-budget` (`role="status"`) states lines used against lines available,
and warns past one page. If the estimate and the CSS disagree about what prints,
the readout describes a page that does not exist.

Four things it keeps in step, each found by the two disagreeing:

- **`.hint` paragraphs not counted** — `.hint{display:none}` on paper. Unnoticed
  at two hints; at eight, Skills alone was charged five lines for nothing.
- **`.evidence` cells not counted** — `.print-resume .evidence` is `display:none`.
  Most valuable column on screen, most expensive on paper.
- **Control labels and `sr-only` notes not counted.** Read through
  `readableText()`. Charging for "(opens in a new tab)" is the `.hint` mistake.
- **`.resume-omit` blocks not counted**, and never were — neither a `<p>` nor a
  row, so the curation rules cannot reach them. It is what drops the ASCII
  diagram from the résumé.

## 4. Filters and focus reverse on paper; view modes do not

`.filtered-out` → `display:table-row` in the print block. The filter control
does not print, so a PDF showing three of seven certificates gives no reason for
the missing four and reads as three being all there are. A view mode is
different: the toggle is visible, named, and next to what it changed, so
printing it prints what the reader chose.

**`.block-empty` reverses with it, one level up.** A filter that empties a table
also collapses its sub-heading (`syncEmptyBlocks()`). Surviving into print, a
PDF taken with the year bar on 2023 would be missing two affiliations entirely,
with no year bar to explain the gap.

**Focus mode reverses too.** Exit lives in the header, the header does not
print, so a focused PDF would be one section with nothing saying the other seven
were set aside. Focus is a reading posture, not a decision about content.

Two things make the reversals behave:

- **`.block-empty` takes no `!important`.** It matches the screen rule for
  specificity and sits later in the file, so it wins on order — leaving
  `.print-resume .resume-empty` (two classes) still able to beat it. Curation
  *is* a decision about what prints; a filter is not. `!important` here would
  print the tables the résumé deliberately dropped.
- **Focus mode needs an explicit `.print-hidden` guard:**

  ```css
  body.focus-mode .section:not(.focus-target) { display: revert; }
  body.focus-mode .section.print-hidden       { display: none !important; }
  ```

  The first carries three classes and an element, so it out-ranks a bare
  `.print-hidden` and would print sections the reader unticked. Re-stating it
  keeps the dialog the only thing deciding what prints.

**`estimateLines()` does not skip `.block-empty`.** The block returns on paper,
so counting it is what makes the budget describe the page you get.

**Measured:** 58 lines with no filter, 58 on 2023, 58 on 2026, 58 focused.
Focused on screen 1 section → as printed 8 → with two unticked **6** → back to 1,
nothing leaked. `.hit-flash` is dropped too; a leftover highlight is a colour
that means nothing on paper.

## 5. Export to PDF

- **No PDF library, ever.** Export sets what is visible and calls
  `window.print()`; the browser's "Save as PDF" typesets. Output keeps selectable
  text and live links because it is not a screenshot.
- Native `<dialog>` + `showModal()` — focus trap, inertness and Escape come from
  the browser. No `showModal` → the button removes itself rather than opening
  nothing.
- Section checkboxes **built from the DOM** at open, so a new section cannot be
  forgotten.
- `data-print-default="off"` starts a section unticked. §08 Résumé does: a
  paragraph explaining how to get the PDF, printed inside that PDF, is noise.
  Unticking hides the heading too — `.print-hidden` is `display:none`, not a
  collapse.
- Fold marker is a **chevron drawn from borders**, not `+`/`−`: down =
  collapsed, up = expanded (Jakob's Law). Rotation is transitioned, so in the
  preview pane — which never paints — computed `transform` stays frozen.
  **Verify through `margin-top`**, which is not transitioned, or read the
  declared `transform` from the CSSOM. A frozen transform there is not a bug.
- **Every print-time change is recorded and undone.** Hidden sections, forced
  folds and the Projects filter go into a `restore` object, reverted on
  `afterprint` plus a timed fallback — not every browser fires that event. A page
  left mangled after a cancelled print is worse than no export.
- **`.cert-verify` does not print.** URLs are emitted only for
  `#certificates a[href^="assets"]`, so a verification link would print as the
  bare word "Verify" — and a 100-character accomplishment hash is not a URL
  anybody types. The ` · ` separator lives **inside** the span, so both go
  together rather than leaving the cell ending in a dot.
- Print block drops header, nav, footer, filter, status line and all buttons;
  repeats `<thead>` per page; forbids a row splitting across a break. Link URLs
  print only in the masthead, Links and Certificates — never for Projects.

## 6. History, so linearisation is not "fixed" again

Linearisation once applied to *every* print, because ATS parse multi-column
tables badly. Wrong default — the full record is read by a person — but the
right résumé, so it lives in `body.print-resume` rather than being deleted. That
is also why the résumé mode is the ATS-safe one, and why `assets/resume.pdf`
stays as the fixed plain copy for a job portal.

## 7. Page breaks

- `orphans: 3` / `widows: 3` on `p`, `li`, `dd`; `break-after: avoid-page` on
  `.section-title`, `.subhead`, `thead`; `break-inside: avoid-page` on `tr`.
  Both the modern and `page-break-*` names, since engines differ.
- **Never `break-inside: avoid` on a whole table.** Several are longer than a
  page; forbidding an internal break pushes the entire table to a fresh sheet and
  leaves half a page of white above it.
- Budget re-measured after: **58 of ~59**, unmoved.
