# Print, PDF export and the one-page résumé

Related: [tables.md](tables.md), [state-and-data.md](state-and-data.md).
The measurement procedure lives in the `verify-print` skill.

---

## 1. Print typography

Sizes follow résumé convention and are **verified, not assumed** — flip
`@media print` to `@media all`, measure, flip back:

| Element | Size | Rule |
| --- | --- | --- |
| Body and prose | 11pt | body 10–12pt |
| Tables | 10pt | never below 10pt |
| Section headings | 14pt | headings 14–16pt |
| Name | 20pt | letterhead, outside the body rule |
| Sub-headings, notes, meta values | 10–11pt | |
| Printed link URLs | 8.5pt | supplementary, still legible |
| Page margin | 14mm (0.55in) | at least 0.5in |

**Tables stay tables on paper, with a visible grid.** Print mirrors the screen:
same columns, same order, a `.5pt` hairline on every cell edge and a `1pt` rule
under the header row. `thead` is `display: table-header-group` so a table
crossing a page break reprints its column labels — otherwise page two is a grid
of unlabelled columns. Rows carry `break-inside: avoid`, so a role can never be
separated from its dates. Zebra striping is dropped (it prints as grey haze and
the grid already separates rows) and `.sort-btn` collapses to plain inline text.

The screen removes the outer cell edges so `.table-wrap`'s own border can supply
them. That wrapper has no border on paper, so `th:last-child`, `td:last-child`
and `tbody tr:last-child > *` must each be **overridden by name** in the print
block — the screen's selectors are more specific, and a plain `th, td { border }`
loses to them, leaving the right and bottom edges of the grid open.

## 2. One-page résumé mode

The export dialog offers two formats, and the choice sets `body.print-resume`:

| | Full record | One-page résumé |
| --- | --- | --- |
| Tables | Bordered grid, as on screen | Linearised, one line per row, no borders |
| Rows | All 66 | Only `tr[data-resume]`, in curated sections |
| Sections | All ticked | `data-resume-default="off"` unticks Certificates, Projects, Links |
| `@page` margin | 12.7mm + 1.3mm on `main` = 14mm | 12.7mm (0.5in, the §1 floor) |

**One page is a selection problem, not a typography one.** A4 at 12.7mm margins
leaves 271.6mm of live height; 10pt at 1.3 line-height is ~4.6mm, so the page
holds ~59 lines. The full record is 66 table rows *before* any heading. No font
size or margin closes that gap — rows are dropped instead. Do not try to solve
an overflow by shrinking type; 10pt is the floor and it is there for a reader.

**Curation is per section, not per table.** A `.section` containing any
`[data-resume]` gets `.resume-curated` in JS, and inside it unmarked rows and
unmarked `.section-body > p` are hidden. This is what removes the one-row MBOT
and PETRA UTP tables from the résumé without naming them anywhere. A section
that marks nothing — Skills — prints whole. A table left with no rows, and the
`.subhead` above it, are hidden together via `.resume-empty`, set in JS because
emptiness is not something CSS can ask.

**The four things that actually bought the page**, measured — 381.3mm → 260.1mm:
Skills to three columns via `data-resume-columns="3"` (−48), the masthead meta
collapsing to the two `[data-resume]` items inline (−30), curation dropping the
empty Experience tables and their subheads (−25), and About printing only its
marked paragraph (−19). Re-measure before adding content: the margin is 11.5mm.

## 3. `estimateLines()` must agree with the stylesheet

**The dialog states the estimate** (`#export-budget`, `role="status"`): lines
used against lines available, and a stated warning past one page. It is an
estimate, labelled as one, and it must pick rows the same way the stylesheet
does — if `estimateLines()` and the CSS ever disagree about what prints, the
readout describes a page that does not exist.

Three things it must keep in step, each found by the two disagreeing:

- **`.hint` paragraphs are not counted.** The print block is
  `.hint{display:none}`, so counting one bills the budget for a line that never
  reaches paper. This went unnoticed at two hints on the page; at eight, Skills
  alone was being charged five lines for nothing.
- **`.evidence` cells are not counted**, because `.print-resume .evidence` is
  `display:none`. The Skills "Used in" column is the most valuable column on
  screen and the most expensive on paper.
- **Control labels and `sr-only` notes are not counted.** The estimate reads
  rows through `readableText()`, which strips them. Charging the budget for a
  "(opens in a new tab)" note or a "Copy" button — both `display:none` on
  paper — is the same mistake `.hint` was.
- **`.resume-omit` blocks are not counted** and never were — they are neither a
  `<p>` nor a table row, so the two curation rules cannot reach them. The class
  is what removes the ASCII diagram from the one-page résumé.

## 4. Filters are reversed on paper; view modes are not

`.filtered-out` becomes `display:table-row` in the print block: the filter
control does not print, so a PDF showing three of seven certificates would give
no reason for the missing four and would read as three being all there are. A
view mode is different — the toggle is visible, named, and sits next to what it
changed, so printing it is printing what the reader chose to look at.

## 5. Export to PDF

- **No PDF library, ever.** The export sets what is visible and calls
  `window.print()`; the browser's own "Save as PDF" does the typesetting. The
  output keeps selectable text and live links because it is not a screenshot.
- The dialog is a native `<dialog>` with `showModal()` — focus trap, page
  inertness and Escape-to-close come from the browser. If `showModal` is missing
  the button removes itself rather than opening nothing.
- Section checkboxes are **built from the DOM** at open time, so a new section
  appears in the dialog automatically and cannot be forgotten.
- A section may carry `data-print-default="off"` to start **unticked**. §08
  Résumé does: a paragraph explaining how to obtain the PDF, printed inside that
  PDF, is noise. Unticking hides the whole section — heading included — because
  `.print-hidden` is `display:none`, not a collapse.
- The fold marker is a **chevron drawn from borders**, not a `+`/`−` glyph:
  down = collapsed, up = expanded, per accordion convention (Jakob's Law). Its
  rotation is transitioned, so in the preview pane — which never paints — the
  computed `transform` stays frozen at its old value. **Verify the cascade
  through `margin-top`**, which is not transitioned, or read the declared
  `transform` out of the CSSOM. A frozen transform there is not a bug.
- **Every change made for printing must be recorded and undone**: hidden
  sections, force-opened folds and the Projects filter are all captured in a
  `restore` object and reverted on `afterprint`, plus a timed fallback because
  not every browser fires that event. A page left mangled after a cancelled
  print is worse than no export.
- The print stylesheet drops the header, nav, footer, filter, status line and
  all buttons; repeats `<thead>` per page; and forbids a row splitting across a
  page break. Link URLs are printed only in the masthead, Links and
  Certificates — never for the 22-row Projects table.

## 6. History, so the linearisation is not "fixed" again

Linearisation was once applied to *every* print, because applicant tracking
systems parse multi-column tables badly. That was the wrong default — the full
record is read by a person — but the right résumé, so it now lives in
`body.print-resume` rather than being deleted. It is also why the résumé mode is
the ATS-safe one of the two, and `assets/resume.pdf` remains the fixed plain
copy to hand a job portal.
