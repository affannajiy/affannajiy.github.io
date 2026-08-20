# Security posture — this project

General theory: [SECURITY_Rulebook.md](../../../../rulebooks/SECURITY_Rulebook.md).
This file is what *this* site does. Re-testing procedure: the
`audit-untrusted-input` skill. Last result:
[verification-log.md](../../verify-site/reference/verification-log.md).

Public site, no accounts, no server, no database. It stores nothing about a
visitor. That removes most classic categories and leaves one question: **what
happens when data this page did not write is rendered into it.**

## 1. The CSP is the enforcement layer

```
default-src 'none';
script-src 'self'; script-src-attr 'none';
style-src 'self';  style-src-attr 'none';
img-src 'self'; font-src 'none'; object-src 'none';
frame-src 'none'; worker-src 'none'; manifest-src 'none'; media-src 'none';
connect-src https://api.github.com;
base-uri 'none'; form-action 'none';
require-trusted-types-for 'script'; trusted-types 'none'
```

It turns "no frameworks, no CDN, no dependencies" from a convention into
something the browser enforces. **Never add `unsafe-inline` to silence a
violation. Fix the code.**

**Every directive is written out, even where `default-src 'none'` covers it.**
Implied is not stated, and a reviewer should not need the fallback chain to audit
the line. Three are load-bearing on their own:

- **`script-src-attr 'none'`** blocks inline event handlers, the exact shape of
  the one injection this codebase has had (§3). So it is named, not inherited.
- **`img-src 'self'`, no `data:`.** The favicon was an inline `data:` SVG and the
  only reason the scheme was open. It is now `assets/favicon.svg`, a file. One
  icon was not worth a scheme.
- **`require-trusted-types-for 'script'` plus `trusted-types 'none'`** make §3's
  rule the browser's instead of the reader's. Every HTML-parsing sink throws on a
  plain string, so the injection shape in §3 cannot return as a quiet regression.
  It returns as a `TypeError`. `'none'` bans declaring a policy, because a policy
  is the escape hatch and nothing here needs one. **Prerequisite: three
  `innerHTML = ""` clears became `textContent = ""`.** A clear is not an
  exception, and the other 17 clears in the file already did it that way.
  Chrome and Edge honour it. Elsewhere it is ignored, which is the status quo.
  Measured: `innerHTML` assignment throws `TypeError`, `createPolicy` is blocked,
  and the page renders unchanged.

Easy to trip over:

- No inline `style`, no inline `<script>`. A blocked inline style fails
  **silently** in layout, which is worse than a loud error.
- **The CSP does not stop CSSOM writes.** A width set from JS is not blocked. It
  is an invariant broken quietly.
  [layout.md](../../site-design-and-layout/reference/layout.md) §4.
- `<link rel="prefetch">` for this origin's own files is blocked too.
  [decisions-not-built.md](../../site-feature-map/reference/decisions-not-built.md).

**What it cannot do.** `frame-ancestors` is ignored in a `<meta>` CSP, and Pages
sends no custom headers, so this site cannot forbid being framed. Accepted, not
worked around: no login, no session, no form, no state-changing control, so a
clickjack has nothing to capture. A JS frame-buster would look like protection
while it protects nothing. Revisit if the page grows an action worth hijacking.

## 2. Three untrusted inputs, not one

The API, the `localStorage` cache and the URL are all attacker-controllable in
some scenario. All are narrowed on read.

| Input | Guard |
| --- | --- |
| Every rendered field, either source | `narrow()` — shape, count, length, in one place |
| Repo URL | `safeRepoURL()` — only `https:` on `github.com`, else the profile URL. Escaping an attribute would not stop a `javascript:` scheme |
| `topics` | `safeTopics()` — `^[a-z0-9][a-z0-9-]{0,34}$`, cap 12, de-duplicated, lowercased |
| `?sort=` `?dir=` `?view=` | Known set through `hasOwnProperty`, else ignored, not assigned |
| `?topic=` | `TOPIC_RE` |
| `?focus=` | Slug pattern **and** must name a real `.section` |
| `#hash` | `ID_RE`, then `getElementById`. Never `querySelector(raw)` |

**One boundary, not two.** `narrow()` is the single function that turns either
source into a renderable row. The API is more trusted, but "more trusted" is not
a shape check. A cache validated more loosely than the API is exactly the drift
SECURITY_Rulebook §1a.1 warns about: two mechanisms where one would do is where
the flaw hides.

**Size is part of validation.** Fifty thousand rows, or one five-megabyte
description, injects nothing and still hangs the render. Bounds: 200 repos,
100-char names, 300-char descriptions, 40-char languages.

**The cache heals itself.** A failing entry is *deleted*, not skipped. Corrupt
JSON does not fix itself next visit, and a forged future `time` would pin a
poisoned cache permanently past its own expiry. So the timestamp is checked for
being a finite number and not in the future, as well as for age.

## 3. The one injection this codebase has had

Recorded because the shape matters more than the fix.

`escapeHTML()` was `div.textContent = value; return div.innerHTML`. It looks
airtight and is not. The serialiser escapes `&`, `<` and `>` in a text node and
**leaves quotes alone**, because a text node has no attribute context to break out
of. Every call site dropped the result straight into one.

A repo name of `x" onmouseover="…` closed the attribute and opened a new one.
Confirmed against a poisoned cache: a real `onmouseover` on a real button.
`script-src 'self'` stopped the handler running, which is defence in depth doing
its job (SECURITY_Rulebook §1b.4). But a first layer that holds only because the
second caught it is not holding.

**The fix was not a better escaper.** That would have left the trap set for the
next person who concatenates a string. Every remote value now goes through
`textContent` and `setAttribute` on hand-built nodes: no parser in the path, and
nothing to escape correctly (SECURITY_Rulebook §2b.3). `escapeHTML()` was
**deleted, not repaired**, because an unused escaper reads as permission to build
strings again.

> **Never assemble HTML from remote data in `script.js`. Build nodes. Reaching
> for an escaper means you are on the wrong path.**

## 4. No secrets, no tracking, no third parties

- **No secrets in the repo.** Never add a GitHub token to `script.js`. The file is
  public, so a committed token is a leaked token. This is also why the API stays
  unauthenticated instead of "fixed" with a token or a proxy.
- **No analytics, trackers, cookies or consent banners.** Nothing here needs
  consent.
- **One outbound host, named in the CSP.** `api.github.com`, nothing else.
- **Every outbound link** carries `rel="noopener noreferrer"`, from one helper, so
  nobody can remember it in one place and forget it in another.
- **The fetch discloses nothing.** `credentials: "omit"` — already the default,
  written down so it is a decision instead of an inheritance — and
  `referrerPolicy: "no-referrer"`, which *is* new. The page-level
  `strict-origin-when-cross-origin` was still handing GitHub this origin, and an
  API that needs no referrer gets none. The call still succeeds, verified. A
  `credentials` value of `include` would have broken CORS instead.
- **The shared budget is bounded.** 60 unauthenticated requests per hour per
  address, and Retry sits next to the message that most invites repeated
  clicking. So it rate-limits itself and says why (SECURITY_Rulebook §6.3). The
  fetch also has a 10s deadline, so a hang fails as a failure instead of a
  permanent "loading".

## 6. Bounds and dictionaries

- **Every URL parameter is bounded.** `sort` and `view` against known sets,
  `topic` against `TOPIC_RE`, `focus` must name a real `.section`, and `q` is
  clamped to `MAX_NAME`. `q` was the one taken at any length. It is echoed into
  the status line and filtered on every keystroke. The clamped value is written
  back to the URL, so the address bar cannot disagree with the filter.
- **A dictionary keyed by remote text uses `Object.create(null)`.** `language` is
  clamped but not charset-checked, so `"__proto__"` can arrive. On a plain object
  `counts["__proto__"] = 1` writes the prototype slot, the count is dropped
  quietly, and that language vanishes from the statistics. Silent wrong data, not
  a crash, which is why it survived this long.
- Note the server bound too. A 300,000-character query string never reaches the
  page, because `http.server` and GitHub Pages both answer **414**. The clamp is
  defence in depth, not the only limit.

## 7. Against the OWASP Secure Coding Practices checklist

Audited 2026-08-17 against the OWASP Secure Coding Practices checklist, all 213
items. That checklist **was** §2a of
[SECURITY_Rulebook.md](../../../../rulebooks/SECURITY_Rulebook.md) until
2026-08-20. The rulebook carries OWASP ASVS 5.0 there now, so the SCP item numbers
below no longer resolve in it. They are kept because the audit used them.

The rulebook's rule still applies: **not applicable is not the same claim as
satisfied.** Stated here so a future reader does not read 150 blank rows as 150
passes.

| Category | Standing |
| --- | --- |
| Input Validation, Output Encoding | **In force.** §2 above is the whole answer. Validation is client-side only, which SCP-1 forbids, but there is no server to move it to and nothing behind it to protect. The site is the far side of the trust boundary. |
| Data Protection, Communication Security | **In force.** §4. TLS and `nosniff` come from Pages, and `github.io` is HSTS-preloaded. |
| General Coding (204, 210–213) | **In force.** No dynamic execution, no third-party code, nothing for a reader to alter. |
| System Configuration | **Mostly not ours.** Pages serves the repo: no directory listing, no configurable headers, no dev environment. 157 (remove test code) *is* ours and is enforced by hand. See the harness note in [verification-log.md](../../verify-site/reference/verification-log.md). |
| Authn, Session, Access Control, Crypto, Error Logging, Database, File Management, Memory | **Not applicable.** No accounts, no sessions, no roles, no keys, no server log, no database, no upload, no manual allocation. Nothing was assessed and passed. There is nothing there. |

Three checklist items were considered and **rejected**, with reasons in
[decisions-not-built.md](../../site-feature-map/reference/decisions-not-built.md):
SRI on the site's own two files, `redirect: "error"` on the fetch, and a
`robots.txt`.
