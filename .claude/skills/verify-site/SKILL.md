---
name: verify-site
description: Run the full verification round on the portfolio site before calling any change done — serve over HTTP, check 375px and 1280px, measure contrast, confirm no page overflow, confirm the live GitHub API still populates the Projects table, and check the console for CSP violations. Use after ANY edit to index.html, style.css or script.js.
---

# Verify the site

The site has no tests and no build step, so verification is manual and must run
the same way every time. **Measure, do not eyeball.** Contrast, tap targets and
header height each regressed here invisibly.

**This is the general round.** Four sibling skills go deeper where a change needs
it, and each writes its result into
[reference/verification-log.md](reference/verification-log.md):

| Skill | When |
| --- | --- |
| `check-accessibility` | A colour changed, or a control or animation was added |
| `verify-print` | The print block, a printed section, or the export dialog changed |
| `audit-untrusted-input` | The render path, the cache shape, or a sanitising helper changed |
| `preview-pane-quirks` | Something measures wrong and may be the harness, not the site |

## 1. Serve over HTTP

Never verify from `file://`. It breaks the GitHub API fetch with a CORS error and
produces a false failure.

Use `preview_start` with name `portfolio`, which reads `.claude/launch.json`.
Manual equivalent:

```bash
python -m http.server 8123
```

## 2. Check the console first

CSP violations are the most common silent failure in this repo. A blocked inline
style does not throw. The element renders unstyled.

Read the console errors. Expect **zero** violations from the site's own code.

> The preview pane injects its own inline styles, which produce `style-src 'self'`
> violations that are **not** from the site. Confirm ownership with:
>
> ```js
> document.querySelectorAll('[style]').length   // must be 0
> ```

If that returns 0, the page is clean and the violations belong to the harness.

## 3. Confirm the live data path

The Projects list is never hardcoded, so an empty table is a real failure.

```js
document.querySelectorAll('#projects-body tr').length        // > 0
document.getElementById('projects-status').textContent       // states the count
```

## 4. Measure contrast (only if colours changed)

Every text colour must be ≥ 4.5:1 against its own background:

```js
(function(){
function lum(c){var p=c.match(/\d+/g).map(Number).map(function(v){v/=255;
  return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)});
  return .2126*p[0]+.7152*p[1]+.0722*p[2];}
function ratio(a,b){var l1=lum(a),l2=lum(b);
  return +(((Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05)).toFixed(2));}
var g=function(s){return getComputedStyle(document.querySelector(s));};
var bg=g('body').backgroundColor, surf=g('.grid-table').backgroundColor;
return JSON.stringify({
  body:        ratio(g('body').color, bg),
  hint:        ratio(g('.hint').color, bg),
  nav:         ratio(g('.site-nav a').color, bg),
  sectionNum:  ratio(g('.section-title .num').color, bg),
  mastheadRole:ratio(g('.masthead-role').color, bg),
  rowLabel:    ratio(g('.grid-table tbody th[scope="row"]').color, surf),
  tableHeader: ratio(g('.grid-table thead th').color,
                     g('.grid-table thead th').backgroundColor)
}, null, 1);})()
```

Known-good baseline: body 14.4, muted tiers 5.05, section numbers and masthead
role 4.96, row labels 5.35, table header 17.9.

**Orange `#f97316` is 2.64:1 on cream and must never colour text.** Use
`--accent-text` (`#b8490c`) for words, `--accent` for rules and borders only.

## 5. Check 375px and 1280px

Resize to **375 × 812**, reload, then:

```js
(function(){
var hdr=Math.round(document.querySelector('.site-header').getBoundingClientRect().height);
var sm=parseFloat(getComputedStyle(document.querySelector('.section')).scrollMarginTop);
var taps={};
['.site-nav a','.wordmark','.button','.sort-btn','.filter-input'].forEach(function(s){
  var e=document.querySelector(s); if(e) taps[s]=Math.round(e.getBoundingClientRect().height);});
return JSON.stringify({
  pageOverflowX: document.documentElement.scrollWidth > window.innerWidth,  // must be false
  headerH: hdr,
  scrollMarginTop: sm,
  anchorsClearHeader: sm >= hdr,                                            // must be true
  tapTargets: taps,                                                         // all >= 40
  filterFontPx: getComputedStyle(document.querySelector('.filter-input')).fontSize  // must be 16px
}, null, 1);})()
```

`documentElement.scrollWidth` over-reports here. If `pageOverflowX` says true,
confirm it against ground truth before you chase it — layout.md §1a.

| Result | Cause |
| --- | --- |
| `pageOverflowX: true` | Something escaped `.table-wrap`. Wide content scrolls inside it, never past the page edge. |
| `anchorsClearHeader: false` | The nav grew a row. Raise `scroll-margin-top` in the 640px block above the header's real height. |
| a tap target < 40 | Fitts's Law floor breached. Raise `min-height`. |
| `filterFontPx` < 16px | iOS Safari zooms the page on focus and never zooms back. |

## 6. Use the controls, do not read them

```js
// sorting: aria-sort must follow the click, and the arrow is drawn from it
document.querySelector('.sort-btn[data-key="name"]').click();
// filtering: count, empty state, and interaction with sort
var f=document.getElementById('projects-filter');
f.value='python'; f.dispatchEvent(new Event('input'));
```

Confirm `#projects-status` describes what happened in words each time.

### Scroll-dependent behaviour

The preview pane **cannot scroll** and never fires `requestAnimationFrame`, so the
nav scrollspy cannot be tested by scrolling. Shift the layout instead:

```js
window.requestAnimationFrame=function(fn){fn();return 0;};   // pane never paints
var main=document.querySelector('main');
main.style.marginTop='-950px';                 // same effect on rects as scrolling
window.dispatchEvent(new Event('scroll'));
document.querySelector('.site-nav a[aria-current="true"]').textContent;
main.style.marginTop='';
```

## 7. Test the failure path when touching `script.js`

An error must state the fix, not only the fault, and must offer Retry:

```js
window.fetch=function(){return Promise.resolve({ok:false,status:403});};
// reload script.js, confirm the message names the rate limit and a Retry button appears
```

When you touch rendering, confirm untrusted input stays inert. Feed a repo object
with `html_url:'javascript:alert(1)'` and `name:'<img src=x onerror=alert(1)>'`.
The href must fall back to the profile URL, and no `<img>` element may exist.

## Done means

- Zero site-owned console errors
- Projects table populated from the live API
- No horizontal overflow at 375px
- Every measured contrast ≥ 4.5:1
- Every tap target ≥ 40px
- Sort, filter and Retry each exercised, not read
- Anything newly measured written into
  [reference/verification-log.md](reference/verification-log.md) (`record-decision`
  says where)
