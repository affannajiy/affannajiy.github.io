---
name: preview-pane-quirks
description: Work around the Claude Code preview pane's seven failure modes when testing the portfolio site — injected inline styles that look like CSP violations, no scrolling, no painting so requestAnimationFrame never fires, a restored scroll position at load, a stale layout viewport after a resize preset, deleted images still served from cache, and a stale style.css or script.js across a reload. Use whenever a measurement in the preview pane looks wrong, a screenshot times out, a CSS edit appears to have no effect, or scroll- or animation-dependent behaviour appears broken.
---

# Preview-pane quirks

The Claude Code preview pane is not a normal browser. Seven things fail there and
are **not** site bugs. Every one of them has produced a false bug report before.

**Prefer measuring computed values over looking at pixels.** Screenshots
frequently time out here, for the same reason the pane never paints.

---

## 1. It injects its own inline styles

They trip `style-src 'self'` and appear in the console as CSP violations that
look like the site's fault.

Confirm ownership before investigating:

```js
document.querySelectorAll('[style]').length   // must be 0
```

If that is `0`, the page is clean and the violations belong to the harness.

## 2. It cannot scroll

`window.scrollTo` is a no-op and `IntersectionObserver` callbacks never fire.
Simulate scrolling by shifting layout instead — a negative `margin-top` on
`<main>` has the same effect on every `getBoundingClientRect` as scrolling does.

```js
var main = document.querySelector('main');
main.style.marginTop = '-950px';
window.dispatchEvent(new Event('scroll'));
// ... measure ...
main.style.marginTop = '';
```

## 3. It never paints, so `requestAnimationFrame` never fires

Stub it to run inline:

```js
window.requestAnimationFrame = function (fn) { fn(); return 0; };
```

**Stub it first, before the first `dispatchEvent`.** The scrollspy latches a
`queued` flag and clears it inside the callback, so one scroll event fired
against the native rAF wedges every later one for the rest of the session. This
is the single easiest way to convince yourself the scrollspy is broken when it
is not.

Anything transitioned is also frozen at its old computed value — the export
dialog's chevron `transform` is the usual victim. **Verify that cascade through
`margin-top`**, which is not transitioned, or read the declared `transform` out
of the CSSOM.

## 4. It restores a previous scroll position across reloads

So `scrollY` is not 0 at load. To measure the **un-scrolled** state, push
`<main>` down with a *positive* `margin-top`; use a negative one for the
scrolled state.

## 5. A resize preset leaves a stale layout viewport

`innerWidth` reports the new width while layout is still at the old one, so
`documentElement.scrollWidth > window.innerWidth` reads **true** and looks like
real horizontal overflow. Seen as 375 / 410.

**Reload after any resize before believing an overflow number.** Confirm by
re-measuring: a real offender is still there after the reload.

Do not diagnose it by walking elements for `right > innerWidth` either — every
`.grid-table` legitimately extends past the viewport inside its scrolling
`.table-wrap`, so that probe reports 236 false offenders.

## 6. A deleted image still loads from cache

`img.complete` and `naturalWidth` stay truthy after the file is removed from disk,
so the broken-image path cannot be tested by deleting the file and reloading. Probe
it directly:

```js
new Promise(function (res) {
  var i = new Image();
  i.onload  = function () { res('still cached'); };
  i.onerror = function () { res('404 — alt text would render'); };
  i.src = 'assets/some-image.png?bust=' + Date.now();
})
```

Same family as the stale `script.js` trap: `?v=` on the HTML does not bust a
subresource.

## 7. `location.reload()` can serve the old `style.css`

A CSS edit measures as if it never happened — and the giveaway is that the rule is
missing from the CSSOM, not merely losing the cascade. **Check before
diagnosing specificity:**

```js
[].filter.call(document.styleSheets[0].cssRules, function (r) {
  return r.selectorText && r.selectorText.indexOf('your-class') > -1;
}).map(function (r) { return r.cssText; })
```

Absent means stale. Swap in a cache-busted copy — same origin, so `style-src
'self'` allows it:

```js
var l = document.querySelector('link[rel=stylesheet]');
var n = l.cloneNode(); n.href = 'style.css?bust=' + Date.now();
n.onload = function () { l.remove(); /* measure */ };
document.head.appendChild(n);
```

---

## When something still looks wrong

Open a **fresh tab** before concluding a console error is real — errors from an
earlier test run (a stubbed `fetch`, a poisoned cache, a 404 API URL) persist in
the pane's console and will be read back as current failures.

### 7a. `script.js` goes stale the same way — and hides it better

The `<link>` cache-bust above only fixes CSS. A stale `script.js` survives
`location.reload()` **and** a forced navigation, and it is harder to spot: the old
and new files usually share most of their behaviour, so a probe that both versions
satisfy proves nothing. On 2026-08-18 the old `syncScrollableTables()` still set
`tabindex`, which looked like the new code running.

You cannot fetch the file to compare — `connect-src` allows only `api.github.com`,
so `fetch("/script.js")` throws in the page.

**Check from outside the page:**

```
curl -s "http://localhost:8123/script.js?b=$(date +%s)" | grep -c "<a string only the new version has>"
```

If the server has the new code and the page does not, the pane is caching.

**Fix: serve from a different port.** A different origin is a different cache key,
and nothing else reliably clears it. `.claude/launch.json` carries `portfolio-alt`
for this; bump its port again if that one goes stale too.

**Always probe on something only the new version does.** A value both versions
produce cannot tell you which one is running.

