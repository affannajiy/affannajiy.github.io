# Security posture

What this site actually does about the principles in
[`rulebooks/SECURITY_Rulebook.md`](rulebooks/SECURITY_Rulebook.md). The rulebook
says what the principles *are*. This file says how this project stands against
them, and where it falls short on purpose.

The rulebook was renumbered on 2026-08-20. The section numbers below were
re-mapped to match it on that date. A citation to this file written earlier may
name the old numbers.

This is a static personal site with no accounts, no server, no database and no user
input that is ever stored. That shapes everything below: most of the classic
web-application risk surface does not exist here, and the remaining risk is
concentrated in two places — **remote data rendered into the page**, and **files
published in `assets/`**.

---

## 1. Threat model

| Asset | Threat | Control |
| --- | --- | --- |
| The page a visitor sees | Injected script via the GitHub API response | CSP `default-src 'none'`, plus a render path that builds DOM nodes instead of parsing HTML, plus URL scheme and host validation |
| The page a visitor sees | Injected script via a tampered `localStorage` cache | Same render path, plus shape, count and length validation on read, and deletion of any entry that fails |
| The reader's browser | A poisoned cache with unbounded rows or fields hanging the render | Hard caps: 200 repositories, 100/300/40-character name, description and language |
| Visitor privacy | Third-party tracking, fingerprinting, cookies | None exist. No analytics, no fonts, no CDN, no cookies, nothing to consent to |
| Third parties named in published files | Their contact details becoming crawlable forever | Rule 2.8/2.10 in `CLAUDE.md`: PDFs are read with `pdftotext` before they are committed |
| The repository | A leaked credential | No credential exists. The API is called unauthenticated (rule 1.5) |
| The repository | A workflow with more rights than it needs | `pages.yml` declares `contents: read`, `pages: write`, `id-token: write`. A job-level block overrides the repo default, so the repo-wide Workflow permissions setting stays **read-only**. CodeQL scans the workflow itself |

**Not in the model:** authentication, authorization, session handling, payment data,
multi-tenancy. None are present, so none are defended. If any is ever added, this
file is wrong and must be rewritten before that change ships.

## 2. Controls in place

| Rulebook | Principle | How this project satisfies it |
| --- | --- | --- |
| §1a.1 | Economy of mechanism | No framework and no build step means the entire attack surface is three files a person can read in one sitting |
| §1a.2 | Fail-safe defaults | An API failure renders a stated error, never a stale hardcoded list. A malformed response shape throws a named error instead of a `TypeError`. A rejected repo URL falls back to the profile URL rather than being rendered as given |
| §1a.4 | Open design | The repository is public. Nothing here relies on any of it being secret |
| §1a.6 | Least privilege | The API call is unauthenticated and read-only. There is no token that could be stolen because there is no token |
| §1b.2 | Secure by default | The CSP is `default-src 'none'` — everything is denied unless named. Adding a CDN script or a web font fails loudly rather than silently working |
| §1b.4 | Defense in depth | The CSP is the outer layer; the node-building render path, `safeRepoURL`, `safeTopics` and `narrow` are the inner one. This is not theoretical here — see §2a |
| §1b.5 | Minimize the attack surface | Four source files, zero dependencies, zero build step, no server-side code, no form that submits anywhere (`form-action 'none'`) |
| §1b.10 | Reuse vetted components | Native `<details>`, native `<dialog>`, native `window.print()`, the browser's own URL parser for validation — rather than hand-rolled equivalents |
| §2a | Input validation and injection | One function, `narrow()`, is the only path either source takes to become a rendered row: shape, count, length, topic slug and URL scheme are all checked there. The API is the more trusted source, but "more trusted" is not a shape check, so it goes through the same gate |
| §2g | Secrets | No secrets in the repo, and no place a secret would be needed. **Secret scanning and push protection are enabled**, so a token in a diff is rejected at push rather than caught in review — rule 1.5 enforced instead of remembered |
| §2h.5 | PII-safe logging | Nothing is logged anywhere. There is no server to log to |
| §5c.2 | Static analysis in the pipeline | CodeQL default setup, JavaScript/TypeScript **and** GitHub Actions, default query suite, **remote and local** threat model. Local is the non-default that matters: this site's untrusted inputs — the URL query string and the `localStorage` repo cache — are local sources by CodeQL's classification, so the default model would find almost no taint here. Runs on push and weekly, so old code is re-checked against new queries |
| §6.3 | Rate limiting and quotas | The unauthenticated API allows 60 requests/hour/IP. The 6-hour `localStorage` cache reduces calls; the Retry button rate-limits itself to one request per 3 seconds and says so; the fetch carries a 10-second deadline; exhaustion degrades to a stated error, not a broken page |

## 2a. The one vulnerability this site has had

Fixed 2026-08-14. Recorded because the shape of it is more useful than the fix.

`escapeHTML()` was `div.textContent = value; return div.innerHTML`. That escapes
`&`, `<` and `>` — and **not quotes**, because a text node has no attribute
context to escape them for. Every call site put the result inside one.

A repository name of `x" onmouseover="..." ` therefore closed the attribute and
opened a new one. Confirmed with a poisoned cache: a real `onmouseover`
attribute appeared on a real button in the Projects table.

**It was not exploitable in practice, for two reasons stacked on each other.**
GitHub repository names cannot contain a quote, so the live API could never
carry the payload; and `script-src 'self'` blocks inline event handlers, so even
with the attribute present the handler did not run. Defence in depth did exactly
what it is for.

But a first layer that only holds because the second one caught it is not
holding. The fix was to remove the parser from the path entirely: every remote
value now goes through `textContent` and `setAttribute` on nodes built by hand,
and `escapeHTML()` was **deleted rather than repaired** — an unused escaper sat
in the file reads as permission to concatenate HTML again.

No user data was at risk at any point: there is none. Nothing needs to be
rotated, because there are no credentials.

## 3. Known gaps, accepted deliberately

These are real, and listed rather than quietly ignored (§1b.11: no security guarantee).

1. **No HTTP security headers.** GitHub Pages does not allow custom response headers,
   so `X-Content-Type-Options`, `Referrer-Policy` as a header, and above all
   `frame-ancestors` cannot be set. `frame-ancestors` is *ignored* in a `<meta>` CSP,
   so **this site can be framed by anyone.** For a static portfolio with no
   authenticated action, clickjacking has nothing to steal — there is no button whose
   click does anything on the visitor's behalf. Accepted, and deliberately not papered
   over with a JavaScript frame-buster: that would look like a control while protecting
   nothing, and would be cited later as though the risk were handled. It would not be
   acceptable the moment any state-changing control is added.
2. **Dependency scanning (§5b.6) is absent because there is nothing to scan.** No
   dependencies, so no supply chain. The only pinned third-party code is the
   actions in `.github/workflows/pages.yml`, bumped by hand when GitHub deprecates
   a runtime.
3. **No phased rollout or tested rollback (§6.7, §6.8).** The rollback is
   `git revert` plus a push. It is not exercised on a schedule.
4. **The API is called unauthenticated**, so a shared IP can exhaust the 60/hour limit
   and see the error state. This is a deliberate trade (rule 1.5) — a token in a public
   repo would be a far worse failure than a rate-limit message.
5. **Published PDFs are permanent.** Once crawled, a file cannot be recalled by
   deleting it. The control is procedural, not technical: read a PDF's extracted text
   before committing it.
6. **Comments are not stripped from shipped code (SCP-136).** `index.html`,
   `style.css` and `script.js` ship with the reasoning inline, deliberately. SCP-136
   exists because comments leak backend detail; there is no backend, and the whole
   repository is public by design (§1a.4, open design), so there is nothing for a comment to
   reveal that reading the source would not. The trade is the reverse of the usual
   one: the comments are the thing that keeps the site editable without a toolchain.
7. **Documentation and tooling are served, not stripped (SCP-137).** Pages serves
   the repository verbatim, so `CLAUDE.md`, `rulebooks/`, `.claude/` and `.github/` are
   reachable at their paths. Accepted rather than fixed: stripping them would require
   a build step, which is the constraint the whole project is built around
   (`CLAUDE.md` 1.2). Nothing links to them, no page loads them, and none of them
   contain a credential. A `robots.txt` was considered and rejected — SCP-158 notes
   it advertises the very structure it hides.
8. **Actions are pinned by tag, not commit SHA (§5b.2, §5b.7).** `pages.yml` pins
   `actions/checkout@v5`, `actions/upload-pages-artifact@v4` and
   `actions/deploy-pages@v5`. A tag is mutable, so this trusts GitHub not to
   re-point its own tags. Accepted for now: all three are first-party, the workflow
   holds no secret beyond the deploy token it is given, its permissions are
   `contents: read` / `pages: write` / `id-token: write`, and CodeQL scans the
   workflow itself. SHA pinning is the harder form and the option if a third-party
   action is ever added — at that point it stops being optional.

## 4. If you find something

**Do not open a public issue for anything exploitable.** An issue is as public
as the site is, and a working payload sitting in a public thread is worse than
a slow fix.

Report it privately, either way round:

- **GitHub's private vulnerability reporting** (enabled) — the *Report a vulnerability*
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

In scope: this repository's `index.html`, `style.css`, `script.js`, the files in
`assets/`, and `.github/workflows/pages.yml`, as served from
`affannajiy.github.io`.

Out of scope, and please do not report them:

- **Missing HTTP security headers.** GitHub Pages does not allow custom
  response headers. Known, listed in §3, accepted.
- **Clickjacking / missing `frame-ancestors`.** Same cause, same section. There
  is no state-changing control on the page for a framed click to steal.
- **The GitHub API being called unauthenticated**, and the rate limit that
  follows. A deliberate trade — a token in a public repo is the worse failure.
- **Anything on `api.github.com` itself.** That is GitHub's, not mine.
