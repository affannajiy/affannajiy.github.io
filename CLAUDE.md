# CLAUDE.md — project invariants

Rules for this repo. These are constraints, not suggestions. If a requested change
requires breaking one, say so and propose an alternative instead of breaking it quietly.

General UI/UX theory lives in `documentation/UI-UX_Rulebook.md` and security
theory in `documentation/SECURITY_Rulebook.md`. Neither is repeated here — this
file records only what is specific to this project.

---

## 1. Hard constraints

| # | Rule | Why |
| --- | --- | --- |
| 1.1 | **No frameworks.** No React, Vue, Tailwind, jQuery, or any runtime library. | The site must stay readable and editable years from now with no toolchain. |
| 1.2 | **No build step.** No npm, bundler, transpiler, preprocessor, or CI build. | GitHub Pages serves the repo verbatim. What is committed is what ships. |
| 1.3 | **No dependencies of any kind**, including CDN `<script>`/`<link>` tags and web fonts. | Every external request is a new failure mode and a new privacy leak. |
| 1.4 | **Exactly four source files**: `index.html`, `style.css`, `script.js`, and `assets/`. | Adding files is the first step toward needing a build step. `CLAUDE.md`, `README.md`, `documentation/` and `.claude/` are tooling and docs, not source — they are not served. |
| 1.5 | **No secrets in the repo.** Never add a GitHub token to `script.js`. | The file is public. A committed token is a leaked token. |
| 1.6 | **No analytics, trackers, cookies, or consent banners.** | Nothing here needs consent. Keep it that way. |
| 1.7 | **The CSP in `index.html` is load-bearing.** `default-src 'none'`, `script-src 'self'`, `style-src 'self'`, `connect-src https://api.github.com`. | It makes rules 1.1–1.3 something the browser enforces, not a convention (Security §1.1, §1.2). Never add `unsafe-inline` to silence a violation — fix the code instead. |
| 1.8 | **No inline `style` attributes and no inline `<script>`.** Widths, colours and behaviour live in `style.css` / `script.js`. | The CSP blocks them outright. A blocked inline style fails silently in layout, which is worse than a loud error. |

## 2. Content rules

| # | Rule |
| --- | --- |
| 2.1 | **The Projects list is never hardcoded.** It is fetched from the GitHub REST API at runtime, always. If the API is unreachable, show the failure in the table — do not fall back to a stale baked-in list. |
| 2.2 | The API is called **unauthenticated** (60 req/hr/IP). Acceptable for this traffic. Do not "fix" this with a token or a proxy backend. |
| 2.3 | Forks are filtered out. Everything else public is shown. Curate by changing repo visibility on GitHub, not by adding an allowlist here. |
| 2.4 | Any repo text (name, description, language) is rendered through `escapeHTML()` before insertion. It is remote data, so it is untrusted input. |
| 2.5 | Placeholder content is labelled as such with a visible `.hint` line, so it is obvious what is unfinished. Remove the hint when the real content lands. |
| 2.6 | **Repo URLs are validated, not trusted.** `safeRepoURL()` accepts only `https:` on `github.com`; anything else falls back to the profile URL. Escaping an attribute does not stop a `javascript:` scheme. |
| 2.7 | **Numeric API fields are coerced before rendering.** `safeCount()` runs star counts through `Number()`. Remote JSON does not guarantee its own types. |
| 2.8 | **No third-party personal data on the site or in `assets/`.** No referee names, phone numbers or emails — theirs or anyone's. A published PDF is permanently crawlable. |
| 2.9 | **No personal phone number** in the page or in any committed file. Email is the public contact channel. |

## 3. Design system

**Influences:** berkshirehathaway.com (text-first, radically undecorated) as the base;
mcmaster.com (dense, scannable data grids) for the tables. Palette carried over from
the `tyunnie-pa` project.

### 3.1 Colour tokens

**Light mode only, deliberately.** There is no dark theme and no theme toggle.
`color-scheme: light` is declared on `:root` so browsers do not auto-invert
controls and scrollbars on a dark OS. Do not add a `prefers-color-scheme: dark`
block back without being asked for one.

All colour lives in CSS variables in the `:root` block at the top of `style.css`.
**Never hardcode a hex value below the token block.** Change a token once; it propagates.

| Token | Value | Role |
| --- | --- | --- |
| `--bg` | `#faf8f5` | Page — warm cream |
| `--surface` | `#ffffff` | Tables |
| `--surface-2` | `#f3f0ea` | Zebra stripe |
| `--border` | `#e8e2d8` | Hairline rules |
| `--rule` | `#111010` | Structural rules (header, footer, masthead) |
| `--fg` | `#111010` | Headings, table header fill, buttons |
| `--text` | `#2d2416` | Body copy |
| `--muted` | `#75695a` | Hints, footer, nav, label column |
| `--accent` | `#f97316` | Brand orange — **non-text only** |
| `--accent-text` | `#b8490c` | Orange **words** |
| `--accent-soft` | `#fff0e6` | Row hover fill, error callout |
| `--accent-mid` | `#fed7aa` | Resting link underline, sort arrows |

### 3.2 The orange rule

**Orange is a signal, not decoration.** It is permitted only on: link underlines and
link hover, section index numbers, the table-header bottom rule, nav hover underline,
row-hover fill, and focus rings.

It is **not** permitted as: a large background fill, a gradient, a shadow, a heading
colour, or body text.

**`--accent` vs `--accent-text` is a contrast rule, not a style preference.**
`#f97316` measures 2.64:1 on the cream background — it fails WCAG AA for text.
Anything that renders orange *words* must use `--accent-text` (4.96:1).
`--accent` is for rules, borders, underlines and focus rings, where the ratio does not bind.

### 3.3 Accessibility floor

- **All text ≥ 4.5:1** against its own background. Verified: body 14.4, muted/nav/hints/footer 5.05, section numbers and masthead role 4.96, table row labels 5.35, table header 17.9.
- **Never colour alone.** Links carry a resting underline; the current nav section is marked by weight *and* a rule *and* `aria-current`; load and error states are stated in words.
- `:focus-visible` rings are required on every interactive element. Do not add bare `outline:none`.
- A skip link to `#main` is the first focusable element. Keep it first.
- `prefers-reduced-motion: reduce` collapses transitions, disables smooth scroll, and flattens the skeleton shimmer to a static bar. Any new animation must respect it.
- **Minimum tap target 40px.** Verified: nav 40, wordmark 40, sort buttons 40, résumé button 44. Nothing interactive may ship below 40.
- Tables use `<th scope>` for row and column headers and a `.sr-only` `<caption>`.

### 3.4 Status and error handling

- The Projects table announces itself through `#projects-status` (`role="status"`), which reports loading, the repo count, the active sort, or the failure.
- Loading uses shape-matched skeleton rows, never a spinner. Do not add a progress bar — the percentage is unknown, so drawing one would be a lie.
- **Errors must state the fix, not only the fault** (Rulebook §1.9), and must offer a Retry control (§1.3). The current message names the rate limit, the wait, and the direct profile URL.
- Sort state lives in `aria-sort` on the `<th>`; the CSS arrow is drawn *from* that attribute, so the visible and announced states cannot drift apart. Do not set the arrow independently.

### 3.5 Filtering

- The Projects filter matches name, description and language, case-insensitively.
- Filtering happens **before** sorting; `repos` holds everything, `view` holds what is rendered. Keep that split — sorting a filtered list is the only correct order.
- An empty result is a stated sentence with the query echoed back and a way out ("Clear the filter…"), never a blank table.
- 21 rows filter instantly, so there is no debounce and no spinner. Do not add either without measuring first.

### 3.6 Layout

- Content column: `max-width: 1000px`, centred, `1.25rem` gutters (`1rem` on mobile).
- Single breakpoint at **640px**. Do not add more without a reason that cannot be solved by `flex-wrap` or a fluid unit.
- Tested at **375px** and **1280px**. Both must pass before any style change ships.
- **Wide tables scroll inside `.table-wrap`, never past the page edge.** `document.documentElement.scrollWidth` must equal `innerWidth` at 375px. Hidden overflow is hidden data — the sideways scroll is announced in words via `.scroll-hint` on mobile.
- Sticky header requires `scroll-margin-top` on `.section` **greater than the header's real height**, or anchor links land under the nav. Seven nav items wrap to two rows at 375px, making the header ~124px — hence `9rem` on mobile. Re-measure if a nav item is added.

### 3.7 Typography

- Body: Georgia / serif stack. Structure and data: monospace stack.
- The mono/serif split is meaningful: **serif = prose, mono = data and labels.** Keep it.
- System fonts only (rule 1.3). No webfont downloads.

---

## 4. Skills

Three skills in `.claude/skills/` carry the procedures. Use them rather than
re-deriving the steps — they hold the measurement snippets and the
environment quirks that are easy to get wrong.

| Skill | Use it when |
| --- | --- |
| `verify-site` | After **any** edit to `index.html`, `style.css` or `script.js`. The full measured round. |
| `edit-site-content` | Adding or editing a section, table, link or copy. Covers numbering, nav, and the header-offset trap. |
| `deploy-site` | Pushing, enabling Pages, or diagnosing a wrong/missing live site. |

### 4.1 Preview-environment quirks

The Claude Code preview pane is not a normal browser. Three things fail there
and are **not** site bugs:

- It **injects its own inline styles**, which trip `style-src 'self'`. Confirm
  ownership with `document.querySelectorAll('[style]').length` — must be `0`.
- It **cannot scroll**. `window.scrollTo` is a no-op and `IntersectionObserver`
  callbacks never fire. Simulate scrolling by setting a negative `margin-top`
  on `<main>` and dispatching a `scroll` event.
- It **never paints**, so `requestAnimationFrame` never fires. Stub it to run
  inline before testing anything rAF-throttled (the scrollspy).

Screenshots frequently time out for the same reason — prefer measuring computed
values over looking at pixels.

## 5. Verifying a change

Before calling any visual change done — the `verify-site` skill has the snippets:

1. Serve over HTTP (`python -m http.server 8123`) — not `file://`, which breaks the API fetch.
2. Console clean of **site-owned** errors (see §4.1 on CSP noise from the pane).
3. Check **375px** and **1280px**.
4. Exercise the sort controls, the filter and the Retry button — do not just read them.
5. Confirm no horizontal page overflow at 375px.
6. Confirm the Projects table still populates from the live API.
7. If colours changed, re-measure contrast against §3.3. Do not eyeball it.

Last full round: 22 repos live; contrast 4.96–17.9; tap targets all ≥ 40px;
header 124px vs `scroll-margin-top` 135px at 375px; zero inline style attributes.

## 6. Deployment

`master` → GitHub Pages, served at the repo root. Push is the deploy; there is no
pipeline to break.

Two preconditions, both silent failures:

- The repo must stay named **`affannajiy.github.io`** — any other name moves the
  site off the root domain onto a `/subpath/`.
- The repo must stay **public** — Pages from a private repo needs a paid plan.

Full steps and failure symptoms are in `README.md` and the `deploy-site` skill.
