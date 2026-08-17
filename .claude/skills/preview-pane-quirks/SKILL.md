---
name: preview-pane-quirks
description: Work around the Claude Code preview pane's four failure modes when testing the portfolio site — injected inline styles that look like CSP violations, no scrolling, no painting so requestAnimationFrame never fires, and a restored scroll position at load. Use whenever a measurement in the preview pane looks wrong, a screenshot times out, or scroll- or animation-dependent behaviour appears broken.
---

# Preview-pane quirks

The Claude Code preview pane is not a normal browser. Four things fail there and
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

---

## When something still looks wrong

Open a **fresh tab** before concluding a console error is real — errors from an
earlier test run (a stubbed `fetch`, a poisoned cache, a 404 API URL) persist in
the pane's console and will be read back as current failures.
