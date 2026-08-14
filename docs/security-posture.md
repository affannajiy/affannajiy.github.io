# Security posture — this project

General theory is in [SECURITY_Rulebook.md](SECURITY_Rulebook.md). This file is
what *this* site does. The re-testing procedure is the `audit-untrusted-input`
skill; the last result is in [verification-log.md](verification-log.md).

The site is public, has no accounts, no server, no database and stores nothing
about a visitor. That removes most of the classic categories outright and
concentrates what is left into one question: **what happens when data this page
did not write is rendered into it.**

---

## 1. The CSP is the enforcement layer

```
default-src 'none';
script-src 'self'; script-src-attr 'none';
style-src 'self';  style-src-attr 'none';
img-src 'self'; font-src 'none'; object-src 'none';
frame-src 'none'; worker-src 'none'; manifest-src 'none'; media-src 'none';
connect-src https://api.github.com;
base-uri 'none'; form-action 'none'
```

It is what turns "no frameworks, no CDN, no dependencies" from a convention into
something the browser enforces. **Never add `unsafe-inline` to silence a
violation — fix the code instead.**

**Every directive is written out even where `default-src 'none'` already covers
it.** Implied is not the same as stated: a reviewer should not have to know the
fallback chain to audit the line, and two of them are load-bearing on their own —

- **`script-src-attr 'none'`** blocks inline event handlers specifically. That
  is the exact shape of the one injection this codebase has actually had (§3),
  so it is named rather than inherited.
- **`img-src 'self'`**, with no `data:`. The favicon used to be an inline
  `data:` SVG and was the only reason the scheme was allowed; it is now
  `assets/favicon.svg`, a file. One icon was not worth keeping a scheme open.

Consequences that are easy to trip over:

- No inline `style` attributes, no inline `<script>`. A blocked inline style
  fails *silently* in layout, which is worse than a loud error.
- The CSP does **not** stop CSSOM writes. A width set from JS would not be
  blocked; it would just be an invariant broken quietly. See §4 of
  [layout.md](layout.md) for why data bars are drawn with text.
- `<link rel="prefetch">` for this origin's own files is blocked too — see
  [decisions-not-built.md](decisions-not-built.md).

**What the CSP cannot do here.** `frame-ancestors` is ignored in a `<meta>` CSP,
and GitHub Pages sends no custom headers, so this site cannot forbid being
framed. Accepted rather than worked around: there is no login, no session, no
form and no state-changing control on the page, so there is nothing a clickjack
could capture or trigger. A JavaScript frame-buster would be a control that
looks like protection while protecting nothing. Revisit this the day the page
grows an action worth hijacking.

## 2. Three untrusted inputs, not one

The API, the `localStorage` cache and the URL are all attacker-controllable in
some scenario, and all three are narrowed on read.

| Input | Guard |
| --- | --- |
| Every rendered field, from either source | `narrow()` — shape, count and length, in one place |
| Repo URL | `safeRepoURL()` — only `https:` on `github.com`, else falls back to the profile URL. Escaping an attribute would not stop a `javascript:` scheme. |
| `topics` | `safeTopics()` — keeps only `^[a-z0-9][a-z0-9-]{0,34}$`, caps at 12, de-duplicates, lowercases |
| `?sort=` / `?dir=` / `?view=` | Checked against a known set with `hasOwnProperty`; anything else ignored, not assigned |
| `?topic=` | Checked against `TOPIC_RE` |

**One boundary, not two.** `narrow()` is the single function that turns either
source into a row this page will render. The API is the more trusted of the two,
but "more trusted" is not a shape check, so it goes through the same gate — a
cache validated more loosely than the API is exactly the drift Security §2.12
warns about.

**Size is part of validation.** A poisoned cache holding fifty thousand rows, or
one row with a five-megabyte description, injects nothing and still hangs the
render and destroys the layout. Bounds: 200 repositories, 100-character names,
300-character descriptions, 40-character languages.

**The cache heals itself.** A cache entry that fails any check is *deleted*, not
merely skipped. Corrupt JSON does not fix itself on the next visit, and a forged
`time` far in the future would otherwise pin a poisoned cache permanently past
its own expiry — so the timestamp is checked for being a finite number that is
not in the future, as well as for age.

## 3. The one injection this codebase has had

Recorded because the shape of the mistake matters more than the fix.

`escapeHTML()` was `div.textContent = value; return div.innerHTML`. That looks
airtight and is not: the HTML serialiser escapes `&`, `<` and `>` in a text node
and **leaves quotes alone**, because a text node has no attribute context to
break out of. Every call site dropped the result straight into one.

A repository name of `x" onmouseover="…` therefore closed the attribute and
opened a new one. Confirmed against a poisoned cache: a real `onmouseover`
attribute appeared on a real button. `script-src 'self'` stopped the handler
from running — defence in depth doing exactly its job (§2.4) — but a first layer
that only holds because the second one caught it is not holding.

**The fix was not a better escaper.** Fixing it would have left the same trap
set for the next person to concatenate a string. Every remote value is now
written through `textContent` and `setAttribute` on nodes built by hand, so
there is no parser in the path and nothing to escape correctly (§2.9, economy of
mechanism). `escapeHTML()` was deleted rather than repaired, because an unused
escaper reads as permission to build strings again.

> **The rule: never assemble HTML from remote data in `script.js`. Build nodes.
> If you are reaching for an escaper, you are on the wrong path.**

## 4. No secrets, no tracking, no third parties

- **No secrets in the repo.** Never add a GitHub token to `script.js`. The file
  is public; a committed token is a leaked token. This is also why the API stays
  unauthenticated rather than being "fixed" with a token or a proxy.
- **No analytics, trackers, cookies or consent banners.** Nothing here needs
  consent. Keep it that way.
- **One outbound host, named in the CSP.** `api.github.com` and nothing else.
- **Every link that leaves the page** carries `rel="noopener noreferrer"`,
  built in one helper so it cannot be remembered in one place and forgotten in
  another.
- **Abuse of the shared budget is bounded.** The unauthenticated API allows 60
  requests an hour per address, and the Retry button sits next to the message
  that most invites repeated clicking, so it rate-limits itself and says why
  (§3.5). The fetch also carries a 10-second deadline, so a hung request fails
  as a failure instead of as a permanent "loading".
