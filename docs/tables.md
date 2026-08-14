# Tables, folds and sorting

Related: [state-and-data.md](state-and-data.md) for filtering,
[printing.md](printing.md) for what happens to a table on paper.

---

## 1. Collapsible sections

- Every `.section` wraps its body in `<details class="section-fold" open>`, with
  the `<h2 class="section-title">` inside the `<summary>`. **Native `<details>`,
  never a JS accordion** — the keyboard behaviour, the expanded/collapsed
  announcement and find-in-page auto-expansion are the browser's job.
- **All folds are open on load.** A reader who never clicks must still see
  everything; collapsing is an affordance, not a gate. Do not ship a
  closed-by-default section.
- The `+` / `−` marker is drawn from `[open]` in CSS, so the visible and
  announced states cannot drift — the same rule the sort arrows follow.
- **The footer colophon is the one exception, and it is not a section.** It sits
  below the footer rule, holds notes *about* the site rather than the record
  itself, and is closed by default. The invariant above is about the record.
- **No persisted fold state** — see "Remembered and not remembered" in
  [state-and-data.md](state-and-data.md).

## 2. Sorting the static tables

- Any `table.grid-table[data-sortable]` gets clickable headers, built by JS from
  the existing `<th>` text. **Tables under three rows are skipped even if
  marked** — a sort control over two rows cannot demonstrate it did anything.
  Five tables qualify: Education, Coursework, UTP experience, Certificates,
  Skills.
- `aria-sort` stays the single source of truth; the CSS arrow is drawn from it,
  exactly as the Projects table has always done. Do not set the arrow
  separately.
- **Period columns sort by their start date, not as text.** `sortValue()` reads
  a leading `Mon YYYY` and compares `year * 12 + month`; sorting
  "May 2024 – Aug 2027" as a string orders by month *name*, which is nonsense.
  Falls back to a leading number, then to `localeCompare`. Mixed columns fall
  back to text rather than comparing a number against `NaN`.

## 3. The Projects table shape

Four columns: **Name, Description, Language, Updated.**

**No Stars column.** All 22 repositories have zero stars, so the column was
zeros pretending to be data and it cost sideways scroll at 375px to say nothing.
Do not add it back without checking the counts are non-zero first. Removing it
took `safeCount()` with it.
