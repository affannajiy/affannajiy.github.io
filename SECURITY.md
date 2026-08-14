# Security posture

What this site actually does about the principles in `rulebook/SECURITY_Rulebook.md`.
The rulebook says what the principles *are*; this file says how this project stands
against them, including where it deliberately falls short.

This is a static personal site with no accounts, no server, no database and no user
input that is ever stored. That shapes everything below: most of the classic
web-application risk surface does not exist here, and the remaining risk is
concentrated in two places — **remote data rendered into the page**, and **files
published in `assets/`**.

---

## 1. Threat model

| Asset | Threat | Control |
| --- | --- | --- |
| The page a visitor sees | Injected script via the GitHub API response | CSP `default-src 'none'`, plus escaping and URL validation at the render boundary |
| The page a visitor sees | Injected script via a tampered `localStorage` cache | Same render boundary, plus shape validation on cache read |
| Visitor privacy | Third-party tracking, fingerprinting, cookies | None exist. No analytics, no fonts, no CDN, no cookies, nothing to consent to |
| Third parties named in published files | Their contact details becoming crawlable forever | Rule 2.8/2.10 in `CLAUDE.md`: PDFs are read with `pdftotext` before they are committed |
| The repository | A leaked credential | No credential exists. The API is called unauthenticated (rule 2.2) |

**Not in the model:** authentication, authorization, session handling, payment data,
multi-tenancy. None are present, so none are defended. If any is ever added, this
file is wrong and must be rewritten before that change ships.

## 2. Controls in place

| Rulebook | Principle | How this project satisfies it |
| --- | --- | --- |
| §1.2 | Secure defaults | The CSP is `default-src 'none'` — everything is denied unless named. Adding a CDN script or a web font fails loudly rather than silently working |
| §1.3 | Least privilege | The API call is unauthenticated and read-only. There is no token that could be stolen because there is no token |
| §1.5 | Minimize attack surface | Four source files, zero dependencies, zero build step, no server-side code, no form that submits anywhere (`form-action 'none'`) |
| §1.7 | Fail securely | An API failure renders a stated error, never a stale hardcoded list. A malformed response shape throws a named error instead of a `TypeError`. A rejected repo URL falls back to the profile URL rather than being rendered as given |
| §2.4 | Defense in depth | The CSP is the outer layer; `escapeHTML`, `safeRepoURL`, `safeCount` and field coercion are the inner one. Either alone would stop most of this; both are kept |
| §2.9 | Economy of mechanism | No framework and no build step means the entire attack surface is three files a person can read in one sitting |
| §2.11 | Open design | The repository is public. Nothing here relies on any of it being secret |
| §2.16 | Leveraging existing components | Native `<details>`, native `<dialog>`, native `window.print()`, the browser's own URL parser for validation — rather than hand-rolled equivalents |
| §3.3 | Secrets management | No secrets in the repo, and no place a secret would be needed |
| §3.5 | Rate limiting | The unauthenticated API allows 60 requests/hour/IP. The 6-hour `localStorage` cache reduces calls; exhaustion degrades to a stated error with a Retry control, not a broken page |
| §3.6 | Input validation at the boundary | Every remote field is escaped, coerced or scheme-checked before it reaches `innerHTML` — from both the API and the cache |
| §3.7 | PII-safe logging | Nothing is logged anywhere. There is no server to log to |

## 3. Known gaps, accepted deliberately

These are real, and listed rather than quietly ignored (§2.3: no security guarantee).

1. **No HTTP security headers.** GitHub Pages does not allow custom response headers,
   so `X-Content-Type-Options`, `Referrer-Policy` as a header, and above all
   `frame-ancestors` cannot be set. `frame-ancestors` is *ignored* in a `<meta>` CSP,
   so **this site can be framed by anyone.** For a static portfolio with no
   authenticated action, clickjacking has nothing to steal — there is no button whose
   click does anything on the visitor's behalf. Accepted. It would not be acceptable
   the moment any state-changing control is added.
2. **No CI scanning (§3.1) and no dependency scanning (§3.2).** There are no
   dependencies to scan, and no pipeline — push is the deploy. The mitigation is that
   there is nothing in the supply chain to compromise.
3. **No phased rollout or tested rollback (§3.9, §3.10).** The rollback is
   `git revert` plus a push. It is not exercised on a schedule.
4. **The API is called unauthenticated**, so a shared IP can exhaust the 60/hour limit
   and see the error state. This is a deliberate trade (rule 2.2) — a token in a public
   repo would be a far worse failure than a rate-limit message.
5. **Published PDFs are permanent.** Once crawled, a file cannot be recalled by
   deleting it. The control is procedural, not technical: read a PDF's extracted text
   before committing it.

## 4. If you find something

**Do not open a public issue for anything exploitable.** An issue is as public
as the site is, and a working payload sitting in a public thread is worse than
a slow fix.

Report it privately, either way round:

- **GitHub's private vulnerability reporting** — the *Report a vulnerability*
  button under the repository's Security tab. This is the preferred route: it
  is a private thread, and it does not need my email.
- **Email** — najiyaffan@gmail.com.

Tell me what you found and how to reproduce it. You do not need a proof of
concept, and you do not need to argue that it is serious enough.

There is no bounty, no SLA and no security team — this is one person and a
static site. I will read it and reply.

For anything **not** a vulnerability — a broken link, a layout bug, a wrong
date — a public issue is exactly right. Use the templates.

## 5. Scope

In scope: this repository's `index.html`, `style.css`, `script.js`, and the
files in `assets/`, as served from `affannajiy.github.io`.

Out of scope, and please do not report them:

- **Missing HTTP security headers.** GitHub Pages does not allow custom
  response headers. Known, listed in §3, accepted.
- **Clickjacking / missing `frame-ancestors`.** Same cause, same section. There
  is no state-changing control on the page for a framed click to steal.
- **The GitHub API being called unauthenticated**, and the rate limit that
  follows. A deliberate trade — a token in a public repo is the worse failure.
- **Anything on `api.github.com` itself.** That is GitHub's, not mine.
