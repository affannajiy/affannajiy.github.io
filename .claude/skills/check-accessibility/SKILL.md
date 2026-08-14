---
name: check-accessibility
description: Measure the portfolio's accessibility floor — contrast ratios for every text colour, tap-target heights at 375px, focus rings, ARIA state consistency and reduced-motion behaviour. Use after changing a colour token, adding any interactive control, or adding an animation.
---

# Check the accessibility floor

The floor is in `docs/accessibility.md`. **Measure, do not eyeball** — contrast
and tap-target regressions are invisible to the naked eye and have shipped here
before.

---

## 1. Contrast — every text colour, against its own background

```js
(function(){
function lum(c){var p=c.match(/\d+/g).map(Number).map(function(v){v/=255;
  return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)});
  return .2126*p[0]+.7152*p[1]+.0722*p[2];}
function ratio(a,b){var l1=lum(a),l2=lum(b);
  return +(((Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05)).toFixed(2));}
var out={}, bg=getComputedStyle(document.body).backgroundColor;
[['body','body'],['hint','.hint'],['nav','.site-nav a'],
 ['sectionNum','.section-title .num'],['mastheadRole','.masthead-role'],
 ['chip','.chip'],['statLabel','.stat-label'],['viewLabel','.view-label'],
 ['colophonNote','.colophon-note'],['anchorBtn','.anchor-btn'],
 ['langBar','.bar'],['ascii','.ascii-art']
].forEach(function(p){var e=document.querySelector(p[1]);
  if(e) out[p[0]]=ratio(getComputedStyle(e).color, bg);});
return JSON.stringify(out,null,1);})()
```

**Every value must be ≥ 4.5.** Baseline in
`docs/verification-log.md`. Add a line to the list above for any new text class.

For text on a non-page background (table surfaces, hover fills, the dark table
header), pass that element's own `backgroundColor` rather than `bg`.

**Orange `#f97316` is 2.64:1 on cream and must never colour text.** Words use
`--accent-text` (`#b8490c`); `--accent` is for rules, borders, underlines and
focus rings only.

## 2. Tap targets — at 375px, after resizing and reloading

```js
(function(){
var out={};
document.querySelectorAll('a,button,summary,select,input').forEach(function(e){
  var r=e.getBoundingClientRect();
  if(r.height && r.height<40 && e.offsetParent!==null){
    out[(e.className||e.tagName)+''] = Math.round(r.height);
  }});
return JSON.stringify(out,null,1);})()
```

**Expected result is close to empty.** The permitted exceptions:

- `.anchor-btn`, `.detail-btn`, `.copy-btn` — 16–17px visual boxes carrying a
  **40px invisible hit overlay**. Confirm the overlay exists rather than raising
  the box. `.anchor-btn` must use `::before`, because `::after` already carries
  its "copied" confirmation.
- Inline `.text-link`s in prose and table cells — words in a sentence, not
  controls.

Anything else under 40 is a Fitts's Law breach: raise `min-height`.

Also confirm `.filter-input` computes to **16px** font size, or iOS Safari zooms
the page on focus and never zooms back.

## 3. Focus, ARIA and colour-independence

- Every interactive element must show a `:focus-visible` ring. No bare
  `outline:none`.
- The skip link to `#main` must still be the **first** focusable element.
- `aria-sort` and `aria-pressed` are the single source of truth — the CSS
  indicator must be drawn *from* the attribute, never set alongside it.

```js
document.querySelector('.sort-btn').click();
document.querySelector('th[aria-sort]').getAttribute('aria-sort');  // follows the click
```

- Nothing may be signalled by colour alone. Links carry a resting underline; the
  current nav item carries weight *and* a rule *and* `aria-current`; every load
  and error state is stated in words.

## 4. Reduced motion

Any new animation must respect `prefers-reduced-motion: reduce`, which here
collapses transitions, disables smooth scroll, and flattens the skeleton shimmer
to a static bar.

```js
matchMedia('(prefers-reduced-motion: reduce)').matches
```

Emulate it in devtools and confirm the new animation is gone, not just faster.

## Done means

- Every measured ratio ≥ 4.5
- No unexplained tap target under 40px at 375px
- `.filter-input` at 16px
- ARIA state drives the visual indicator
- Any new animation stands down under reduced motion
- New numbers written into `docs/verification-log.md`
