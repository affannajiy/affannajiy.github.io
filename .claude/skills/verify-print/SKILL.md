---
name: verify-print
description: Verify the portfolio's print output — measure the print stylesheet by flipping @media print to @media all, and confirm the page prints what the reader sees. Use after changing the print block or adding content to a printed section. Note: the export dialog and its line budget were removed 2026-08-27; the sections below that describe them are history, not the current build.
---

# Verify the print output

Print is the second rendering of this site, and it has no visual regression
safety net. The rules are in [reference/printing.md](reference/printing.md). This
is how to check them.

**The résumé must fit one page, and it fits by dropping rows, not by shrinking
type.** 10pt is the floor.

## 1. Measure the print block

You cannot measure `@media print` styles while the screen media query is active.
Flip it, measure, flip it back:

1. In `style.css`, change `@media print` to `@media all`.
2. Reload and read computed values.
3. **Change it back.** Never commit with it flipped.

**Measure at a viewport wider than 640px.** Flipping print to `all` adds the print
rules. It does not switch the *screen* ones off. Below 640px
`@media screen and (max-width: 640px)` stacks every table into cards, so the
reading comes back `display: block` with cell labels and looks like the stacked
layout leaking into print. It is not. `screen` never matches when printing.

**Non-invasive alternative.** No file edit, and nothing to forget to revert:

```js
var s = document.styleSheets[0], r = null, i;
for (i = 0; i < s.cssRules.length; i++)
  if (s.cssRules[i].conditionText === 'print') r = s.cssRules[i];
r.media.mediaText = 'all';
// ... measure ...
r.media.mediaText = 'print';
```

Sizes to confirm against the table in
[reference/printing.md](reference/printing.md): body 11pt, tables 10pt, section
headings 14pt, name 20pt, printed URLs 8.5pt.

## 2. Check the grid survives

The screen removes the outer cell edges so `.table-wrap`'s border can supply them.
The wrapper has no border on paper, so confirm the right and bottom edges of every
table are drawn:

```js
var t = document.querySelector('.grid-table');
JSON.stringify({
  lastTh: getComputedStyle(t.querySelector('th:last-child')).borderRightWidth,
  lastTd: getComputedStyle(t.querySelector('td:last-child')).borderRightWidth,
  lastRow: getComputedStyle(t.querySelector('tbody tr:last-child > *')).borderBottomWidth
})
```

Any `0px` means the print block's plain `th, td { border }` lost to a more
specific screen selector. **Override that edge by name.**

## 3. The résumé budget — gone

**Removed 2026-08-27 with the export dialog.** There is no `#export-budget` and
no `estimateLines()`. There is no one-page target any more: Ctrl+P prints the
page as the reader has it, however long that runs.

Kept because the reasoning still bites if a budget ever comes back: the three
known divergences — `.hint`, `.evidence` and `.resume-omit` — each counted a line
that `display:none` removes. Any estimate that does not skip what the print block
hides will be wrong in exactly that way.

## 4. Confirm print reverts

The worst print bug is a page left mangled after a cancelled print. Capture the
state, print, cancel, compare:

```js
var before = {
  bodyClass: document.body.className,
  hidden: document.querySelectorAll('.print-hidden').length,
  empty: document.querySelectorAll('.resume-empty').length,
  openFolds: document.querySelectorAll('.section-fold[open]').length,
  filter: document.getElementById('projects-filter').value
};
// run the export, cancel the print dialog, then re-evaluate the same object
```

Every field must match. `afterprint` does the work, with a timed fallback because
not every browser fires it.

## 5. Confirm what does and does not print

- `.filtered-out` rows **do** print. A filtered PDF misrepresents the record, and
  the filter control is not on the page to explain the gap.
- `data-hide-in` view modes **do not** print. The toggle is visible and named, so
  printing the chosen view prints what the reader chose.
- All buttons, the header, nav, footer, filter and status line are dropped.
  Confirm through the CSSOM, not by eye:

```js
getComputedStyle(document.querySelector('.copy-btn')).display   // none
```

## Done means

- Print sizes match `.claude/skills/verify-print/reference/printing.md`, and `@media print` is back
- Every table's right and bottom edges are drawn on paper
- The résumé budget is at or under ~59 lines, or says so in words
- `estimateLines()` counts exactly what the stylesheet prints
- Print applies and fully reverts on cancel
- The result is written into `verify-site/reference/verification-log.md`
