---
name: edit-site-content
description: Add or edit a section, table, or piece of copy on the portfolio site without breaking the numbering, the nav, the sticky-header offset, or the CSP. Use when asked to add a section, add rows, change wording, add a link, or restructure the page.
---

# Edit site content

All copy lives in `index.html`. There is no CMS, no data file and no templating —
what is in the file is what ships.

Read first: `docs/content-rules.md` for what may be written into the page and
whose details may not, and `docs/layout.md` for the sticky-header offset trap.

## The three rules that bite

1. **No inline `style` attributes, ever.** The CSP blocks them and they fail
   *silently* in layout. Widths, colours, spacing → `style.css`.
2. **No inline `<script>`.** Same reason. Behaviour → `script.js`.
3. **The Projects table is never hardcoded.** It is fetched live. Adding a
   `<tr>` there by hand is always wrong — change repo visibility on GitHub instead.

## Adding a section

Sections are numbered and the numbers are visible, so adding one in the middle
means renumbering everything after it. Four things must change together:

**1. The section markup** — copy this shape exactly:

```html
<section id="awards" class="section" aria-labelledby="awards-title">
  <h2 class="section-title" id="awards-title"><span class="num">05</span> — Awards</h2>
  <div class="section-body">
    ...
  </div>
</section>
```

- `id` must match the nav `href`.
- `aria-labelledby` must point at the `<h2>`'s own `id`.
- The number goes in `<span class="num">` — that span is the only orange text
  in the heading, and it is the one place orange carries meaning.

**2. The nav link**, in page order:

```html
<a href="#awards">Awards</a>
```

**3. Renumber** every `<span class="num">` after the insertion point.

**4. Re-measure the header.** Each nav item risks wrapping the nav to another
row on mobile, which silently breaks anchor links — they land *under* the sticky
header. At 375px, seven items already make the header ~124px, so
`scroll-margin-top` is `9rem`. After adding one, run:

```js
var hdr = document.querySelector('.site-header').getBoundingClientRect().height;
var sm  = parseFloat(getComputedStyle(document.querySelector('.section')).scrollMarginTop);
[hdr, sm, sm >= hdr]     // third value must be true
```

If false, raise `scroll-margin-top` in the `max-width: 640px` block.

## Adding a table

Every table follows the same shape. The wrapper is not optional — it is what
keeps wide tables from pushing the page sideways at 375px:

```html
<div class="table-wrap">
  <table class="grid-table">
    <caption class="sr-only">What this table lists</caption>
    <thead>
      <tr><th scope="col">Column</th><th scope="col">Column</th></tr>
    </thead>
    <tbody>
      <tr><th scope="row">Label</th><td>Value</td></tr>
    </tbody>
  </table>
</div>
```

- `<caption class="sr-only">` is required — screen readers use it to announce
  what the table is. It is invisible on screen.
- The **first cell of each body row is `<th scope="row">`**, not `<td>`. It is a
  label, and it is styled as one (muted, no wrap).
- `scope` on every header cell, both directions.
- Columns cost nothing on a phone: below 640px every row stacks into a card and
  each cell draws its column name from `<thead>` (`docs/layout.md` §1b). **Check
  375px anyway** — `scrollWidth === innerWidth`, and no `.scroll-hint` on a
  table, since no table scrolls sideways there any more.
- **Building rows from JS? Call `labelCells(table)` after the render**, or the
  cards ship with nothing saying which column each value came from.

## Editing copy

- Body prose is capped at `65ch` by `.section-body p`. Do not override it —
  that measure is what keeps the text readable.
- Use `.note` for a stated fact that is not a table row (it gets an orange left rule).
- Use `.hint` **only** to mark something unfinished or to explain an edit point.
  When the real content lands, delete the hint — a stale hint is a lie about
  the state of the page.
- Use `.subhead` for a heading inside a section.

## Adding a link

External links need both attributes:

```html
<a class="text-link" href="https://example.com" target="_blank" rel="noopener noreferrer">example.com</a>
```

`rel="noopener noreferrer"` is not optional: `noopener` stops the opened page
reaching back through `window.opener`, `noreferrer` stops leaking the URL.

Never ship an `href="#"` placeholder — it looks live and does nothing. Either
put the real URL in, or leave the row out and mark it with a `.hint`.

## What must never appear

- Phone numbers — yours or anyone's.
- Third-party personal data: referee names, their emails, their mobiles. A page
  on GitHub Pages is permanently crawlable, and that data is not yours to publish.
- API tokens. The repo is public.
- Anything in `assets/` that carries the above — check PDFs before committing them.

## After any edit

Run the `verify-site` skill. Contrast, overflow and tap targets are measured,
not eyeballed.
