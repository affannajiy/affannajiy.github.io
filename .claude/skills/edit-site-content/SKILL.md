---
name: edit-site-content
description: Add or edit a section, table, or piece of copy on the portfolio site without breaking the numbering, the nav, the sticky-header offset, or the CSP. Use when asked to add a section, add rows, change wording, add a link, or restructure the page.
---

# Edit site content

All copy lives in `index.html`. There is no CMS, no data file and no templating.
What is in the file is what ships.

Read first: [reference/content-rules.md](reference/content-rules.md) for what may
go in the page and whose details may not, and
`site-design-and-layout/reference/layout.md` for the sticky-header offset trap.

## The three rules that bite

1. **No inline `style` attributes, ever.** The CSP blocks them and they fail
   *silently* in layout. Widths, colours and spacing go in `style.css`.
2. **No inline `<script>`.** Same reason. Behaviour goes in `script.js`.
3. **Never hardcode the Projects table.** It is fetched live. Adding a `<tr>` by
   hand is always wrong. Change repo visibility on GitHub instead.

## Adding a section

Section numbers are visible, so an insertion in the middle renumbers everything
after it. Four things change together.

**1. The section markup.** Copy this shape exactly:

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
- The number goes in `<span class="num">`. That span is the only orange text in
  the heading, and it is the one place orange carries meaning.

**2. The nav link**, in page order:

```html
<a href="#awards">Awards</a>
```

**3. Renumber** every `<span class="num">` after the insertion point.

**4. Re-measure the header.** Each nav item risks wrapping the nav to another row
on mobile, which breaks anchor links quietly — they land *under* the sticky
header. At 375px, eight items already make the header ~124px, so
`scroll-margin-top` is `11.5rem` in the 640px block. After adding one, run:

```js
var hdr = document.querySelector('.site-header').getBoundingClientRect().height;
var sm  = parseFloat(getComputedStyle(document.querySelector('.section')).scrollMarginTop);
[hdr, sm, sm >= hdr]     // third value must be true
```

If it is false, raise `scroll-margin-top` in the `max-width: 640px` block.

## Adding a table

Every table follows one shape. The wrapper is not optional. It is what keeps wide
tables from pushing the page sideways at 375px:

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

- `<caption class="sr-only">` is required. Screen readers use it to announce what
  the table is. It is invisible on screen.
- The **first cell of each body row is `<th scope="row">`**, not `<td>`. It is a
  label and it is styled as one: muted, no wrap.
- `scope` on every header cell, both directions.
- Columns cost nothing on a phone. Below 640px every row stacks into a card and
  each cell draws its column name from `<thead>`
  (`site-design-and-layout/reference/layout.md` §1b). **Check 375px anyway:**
  `scrollWidth === innerWidth`, and no `.scroll-hint` on a table, because no table
  scrolls sideways there any more.
- **Building rows from JS? Call `labelCells(table)` after the render**, or the
  cards ship with nothing to say which column each value came from.

## Editing copy

- Body prose runs the full content column. `.section-body p` is `max-width: 100%`
  and the 1000px column is the only bound. A 65ch cap was tried and reverted on
  2026-08-20 (layout.md §1). Do not add one back without reading that entry.
- **Prose is justified above 640px and ragged below**, always with
  `hyphens: auto` (layout.md §1). Do not justify anything below the breakpoint —
  measured 6.6x word-space stretch at 320px.
- Use `.note` for a stated fact that is not a table row. It gets an orange left
  rule.
- Use `.hint` **only** to mark something unfinished or to explain an edit point.
  Delete the hint when the real content lands. A stale hint is a lie about the
  state of the page.
- Use `.subhead` for a heading inside a section.

## Adding a link

External links need both attributes:

```html
<a class="text-link" href="https://example.com" target="_blank" rel="noopener noreferrer">example.com</a>
```

`rel="noopener noreferrer"` is not optional. `noopener` stops the opened page
reaching back through `window.opener`. `noreferrer` stops the URL leaking.

Never ship an `href="#"` placeholder. It looks live and does nothing. Put the real
URL in, or leave the row out and mark it with a `.hint`.

## What must never appear

- Phone numbers, yours or anyone else's.
- Third-party personal data: referee names, their emails, their mobiles. A page on
  GitHub Pages is permanently crawlable, and that data is not yours to publish.
- API tokens. The repo is public.
- Anything in `assets/` that carries the above. Check PDFs before you commit them.

## After any edit

Run `verify-site`. Contrast, overflow and tap targets are measured, not eyeballed.
