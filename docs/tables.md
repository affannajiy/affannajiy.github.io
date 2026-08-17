# Tables, folds, sorting

Related: [state-and-data.md](state-and-data.md) filtering ·
[printing.md](printing.md) tables on paper.

---

## 1. Collapsible sections

- Every `.section` wraps its body in `<details class="section-fold" open>`, with
  `<h2 class="section-title">` inside the `<summary>`. **Native `<details>`,
  never a JS accordion** — keyboard behaviour, expanded/collapsed announcement
  and find-in-page auto-expansion are the browser's job.
- **All folds open on load.** A reader who never clicks must still see
  everything; collapsing is an affordance, not a gate. **Never ship a
  closed-by-default section.**
- The `+` / `−` marker is drawn from `[open]` in CSS, so visible and announced
  states cannot drift — same rule as the sort arrows.
- **The footer colophon is the one exception, and it is not a section.** Below
  the footer rule, holds notes *about* the site rather than the record, closed by
  default. The invariant is about the record.
- **No persisted fold state** — see §6 of [state-and-data.md](state-and-data.md).

## 1a. Below 640px a row is a card

Full rules in [layout.md](layout.md) §1b. What matters when touching a table:

- **Add a column and nothing needs doing.** The label comes from `<thead>` via
  `labelCells()`. **Build rows from JS and you must call it** — `renderRows()`
  and `buildStats()` do; a third render path that forgets will ship cards whose
  cells say nothing.
- **A cell spanning columns is left unlabelled.** The empty-state row is one
  `td[colSpan=4]`; there is no single column it came from.
- **`<thead>` is kept only where it holds a `.sort-btn`.** Add `data-sortable` to
  a table under three rows and `initStaticSort()` skips it, so its header
  correctly disappears on a phone rather than standing there as a dead label.
- **`#compare-table` is excluded by name.** A matrix does not stack.

## 2. Sorting the static tables

- Any `table.grid-table[data-sortable]` gets clickable headers, built by JS from
  existing `<th>` text. **Tables under three rows are skipped even if marked** —
  a sort control over two rows cannot demonstrate it did anything. Five qualify:
  Education, Coursework, UTP experience, Certificates, Skills.
- `aria-sort` is the single source of truth; the CSS arrow is drawn from it.
  Never set the arrow separately.
- **Period columns sort by start date, not as text.** `sortValue()` reads a
  leading `Mon YYYY` and compares `year * 12 + month`. Sorting "May 2024 – Aug
  2027" as a string orders by month *name*, which is nonsense. Falls back to a
  leading number, then `localeCompare`. Mixed columns fall back to text rather
  than comparing a number against `NaN`.

## 3. Projects table shape

Four columns: **Name, Description, Language, Updated.**

**No Stars column.** Every repository has zero stars, so the column was zeros
pretending to be data and cost sideways scroll at 375px to say nothing. Do not
add it back without checking the counts are non-zero. Removing it took
`safeCount()` with it.
