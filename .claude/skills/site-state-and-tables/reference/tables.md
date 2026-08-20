# Tables, folds, sorting

Related: [state-and-data.md](state-and-data.md) filtering ·
[printing.md](../../verify-print/reference/printing.md) tables on paper.

## 1. Collapsible sections

- Every `.section` wraps its body in `<details class="section-fold" open>`, with
  `<h2 class="section-title">` inside the `<summary>`. **Native `<details>`, never
  a JS accordion.** Keyboard behaviour, expanded/collapsed announcement and
  find-in-page auto-expansion are the browser's job.
- **All folds open on load.** A reader who never clicks must still see
  everything. Collapsing is an affordance, not a gate. **Never ship a
  closed-by-default section.**
- The `+` / `−` marker is drawn from `[open]` in CSS, so the visible and announced
  states cannot drift. Same rule as the sort arrows.
- **The footer colophon is the one exception, and it is not a section.** It sits
  below the footer rule, holds notes *about* the site rather than the record, and
  is closed by default. The invariant is about the record.
- **No persisted fold state.** See [state-and-data.md](state-and-data.md) §6.

## 1a. Below 640px a row is a card

Full rules in [layout.md](../../site-design-and-layout/reference/layout.md) §1b.
What matters when you touch a table:

- **Add a column and nothing needs doing.** The label comes from `<thead>` through
  `labelCells()`. **Build rows from JS and you must call it.** `renderRows()` and
  `buildStats()` do. A third render path that forgets will ship cards whose cells
  say nothing.
- **A cell that spans columns stays unlabelled.** The empty-state row is one
  `td[colSpan=4]`, and no single column it came from exists.
- **`<thead>` is kept only where it holds a `.sort-btn`.** Add `data-sortable` to
  a table under three rows and `initStaticSort()` skips it, so its header
  correctly disappears on a phone instead of standing there as a dead label.
- **`#compare-table` is excluded by name.** A matrix does not stack.

## 1b. The one table that still scrolls keeps its affordance

`#compare-table` is the exception to §1a, because a comparison matrix cannot stack
into cards without destroying the comparison. Below 640px it keeps
`overflow-x: auto` inside its dialog. It is the only table on the site that still
asks for a sideways gesture, and it must say so.

Two gates, deliberately different:

- **CSS gates on width.** `.scroll-hint` is `display: none` until 640px.
- **`syncScrollableTables()` gates on truth.** It sets `hidden` unless the wrap
  really overflows. An empty `#compare-table` fits, and a hint that asks for a
  gesture the page is not asking for is worse than no hint.

The hint must be the wrap's **immediate previous sibling**. A parent-wide lookup
was tried first and hid the ASCII diagram's hint, because that hint shares a
parent with the Skills table. When the Skills table stopped overflowing, the
diagram lost its affordance while it was still scrolling. A hint belongs to the
box it sits against, not to its parent.

`.scroll-hint[hidden] { display: none }` is required. The 640px rule sets
`display: block`, and a display rule beats the `hidden` attribute (layout.md §3a).

Hidden overflow is hidden data — `UI-UX_Rulebook.md` §2.4, and §8 rules closure
over tidiness.

## 2. Sorting the static tables

- Any `table.grid-table[data-sortable]` gets clickable headers, built by JS from
  the existing `<th>` text. **Tables under three rows are skipped even if
  marked**, because a sort control over two rows cannot show it did anything.
  Five qualify: Education, Coursework, UTP experience, Certificates, Skills.
- `aria-sort` is the single source of truth, and the CSS arrow is drawn from it.
  Never set the arrow separately.
- **Period columns sort by start date, not as text.** `sortValue()` reads a
  leading `Mon YYYY` and compares `year * 12 + month`. Sorting "May 2024 – Aug
  2027" as a string orders by month *name*, which is nonsense. It falls back to a
  leading number, then to `localeCompare`. Mixed columns fall back to text rather
  than compare a number against `NaN`.

## 3. Projects table shape

Four columns: **Name, Description, Language, Updated.**

**No Stars column.** Every repository has zero stars, so the column was zeros
pretending to be data, and it cost sideways scroll at 375px to say nothing. Do
not add it back without checking the counts are non-zero. Removing it took
`safeCount()` with it.

## 4. The Record column stacks

"View PDF" and "Verify" are two destinations, not one phrase. Side by side in a
95px column they wrapped mid-phrase, so `.cert-verify` is `display: block` and
Verify sits on its own line. The old " · " separator went with the change,
because it existed only to join them on one line. `.cert-verify` still does not
print, because a 100-character hash is not a URL anybody types, and the `display`
rule carries its own `[hidden]` guard. Measured 2026-08-19: 375px and 1280px, two
lines, no page overflow.
