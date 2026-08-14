# CLAUDE.md — project invariants

Rules for this repo. These are constraints, not suggestions. If a requested change
requires breaking one, say so and propose an alternative instead of breaking it quietly.

General UI/UX theory lives in `rulebook/UI-UX_Rulebook.md` and security
theory in `rulebook/SECURITY_Rulebook.md`. Neither is repeated here — this
file records only what is specific to this project.

---

## 1. Hard constraints

| # | Rule | Why |
| --- | --- | --- |
| 1.1 | **No frameworks.** No React, Vue, Tailwind, jQuery, or any runtime library. | The site must stay readable and editable years from now with no toolchain. |
| 1.2 | **No build step.** No npm, bundler, transpiler, preprocessor, or CI build. | GitHub Pages serves the repo verbatim. What is committed is what ships. |
| 1.3 | **No dependencies of any kind**, including CDN `<script>`/`<link>` tags and web fonts. | Every external request is a new failure mode and a new privacy leak. |
| 1.4 | **Exactly four source files**: `index.html`, `style.css`, `script.js`, and `assets/`. | Adding files is the first step toward needing a build step. `CLAUDE.md`, `README.md`, `SECURITY.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `LICENSE`, `rulebook/`, `.github/` and `.claude/` are tooling and docs, not source — nothing links to them and no page loads them. Pages will still serve them at their paths; that is harmless and is not a reason to add a build step to strip them. |
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
| 2.8 | **No third-party contact details on the site or in `assets/`.** No phone numbers or email addresses belonging to anyone else — referees, signatories, committee members. A name and job title on a résumé or a certificate is acceptable: it is a matter of record and gives a stranger nothing to contact them with. A published PDF is permanently crawlable, so the test is whether the file hands someone a channel to reach a third party who never agreed to that. |
| 2.9 | **No personal phone number** in the page or in any committed file. Email is the public contact channel. |
| 2.10 | **Published PDFs live in `assets/`, named kebab-case, and are checked before committing.** A PDF is not just a link — its full text is extractable and crawlable. Run `pdftotext -layout <file> -` and read the output before adding one. Referee blocks, phone numbers and signatories' contact details are the usual finds. |

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
- **Errors must state the fix, not only the fault** (Rulebook §1.9), and must offer a Retry control (§1.3). The advice is **selected from the failure**: 403/429 names the rate limit and the wait, 5xx says GitHub is down, an unreadable reply names a captive portal or proxy, anything else says check the connection. Do not go back to one fixed message — telling someone to wait out a rate limit they never hit is a wrong fix, which is worse than none.
- **Remote data has two sources, not one.** The API and the `localStorage` cache are both untrusted input: entries are shape-checked on read, and every field is escaped, coerced or scheme-checked at render. Verified by poisoning the cache with `javascript:` URLs, `<img onerror>` names and non-numeric star counts — nothing executes, bad rows are dropped, bad hosts fall back to the profile URL.
- Sort state lives in `aria-sort` on the `<th>`; the CSS arrow is drawn *from* that attribute, so the visible and announced states cannot drift apart. Do not set the arrow independently.

### 3.5 Filtering

- The Projects filter matches name, description and language, case-insensitively.
- Filtering happens **before** sorting; `repos` holds everything, `view` holds what is rendered. Keep that split — sorting a filtered list is the only correct order.
- An empty result is a stated sentence with the query echoed back and a way out ("Clear the filter…"), never a blank table.
- 21 rows filter instantly, so there is no debounce and no spinner. Do not add either without measuring first.
- **The filter and sort live in the URL** — `?q=`, `?sort=`, `?dir=`, written with `history.replaceState` on every `refresh()`. A filtered view is shareable and survives a reload. **`replaceState`, never `pushState`**: one history entry per keystroke would make Back walk the reader letter by letter out of a word they typed.
- **A URL is untrusted input, exactly like the API and the cache.** `sort` is checked against the four known columns with `hasOwnProperty`, `dir` against the two legal values; anything else is ignored, not assigned. Only a non-default sort is written, so a plain visit keeps a plain URL.
- **`/` focuses the filter**, but only where `(hover: hover)` matches — a phone is never told to press a key it does not have, and the hint that says so is revealed by the same test. The handler stands down inside inputs and while a `<dialog>` is open, and opens the Projects fold first, because focusing a field nobody can see is a dead end.

### 3.6 Layout

- Content column: `max-width: 1000px`, centred, `1.25rem` gutters (`1rem` on mobile).
- Single breakpoint at **640px**. Do not add more without a reason that cannot be solved by `flex-wrap` or a fluid unit.
- Tested at **375px** and **1280px**. Both must pass before any style change ships.
- **Wide tables scroll inside `.table-wrap`, never past the page edge.** `document.documentElement.scrollWidth` must equal `innerWidth` at 375px. Hidden overflow is hidden data — the sideways scroll is announced in words via `.scroll-hint` on mobile.
- Sticky header requires `scroll-margin-top` on `.section` **greater than the header's real height**, or anchor links land under the nav. Eight nav items wrap to two rows at 375px, making the header ~124px. `scroll-margin-top` is `11.5rem` (172px) on mobile — deliberately generous, so that a ninth item wrapping the nav to three rows (~160px) does not silently break anchor landing. Re-measure anyway when adding one.

**The condensed header (mobile only).** A 124px sticky header is 15% of a
667px phone screen, held there for the whole read. Once the masthead's
measured `bottom` goes negative, `html` gains `.nav-condensed` and the header
drops to one row — **measured 123.8px → 41.6px, 82px given back**. Above 640px
the class is still set but styles nothing; the desktop header is one row
already.

Three things about it are load-bearing:

- **No destination is removed.** All eight links stay; the row scrolls
  sideways. The right-edge `mask-image` fade is what says so — a hard clipped
  edge would read as the end of the list (Gestalt §2.4). The nav carries
  `padding-right: 2.25rem` purely as scroll slack, or the last item (Résumé)
  can never scroll clear of its own fade.
- **The class goes on `<html>`, not on the header**, because `scroll-margin-top`
  depends on it: 11.5rem against a 41.6px header would strand every heading 130px
  down the page. `.nav-condensed .section` is `4.5rem`.
- **`condense()` runs before `update()`** in the scrollspy's rAF callback. It
  decides whether the nav is a scrolling box at all, and `update()` asks that
  question when it scrolls the marked item into view — reversed, the first
  condensing frame measures the old layout and never re-measures, because
  `update()` short-circuits once the marked section stops changing.
- `keepNavItemVisible()` uses `getBoundingClientRect`, **not `offsetLeft`** —
  the nav is statically positioned, so `offsetLeft` is measured from the page
  and differs from the scroll box by the header's padding.

### 3.6a Things deliberately not built

Recorded so they are not re-proposed as improvements.

- **No hover-prefetch of the certificate PDFs** (the mcmaster.com behaviour).
  `default-src 'none'` blocks `<link rel="prefetch">` for this origin's own
  files, and Chrome dropped `prefetch-src`, so it falls back to `default-src`.
  Buying it means `default-src 'self'` — downgrading rule 1.7 from "nothing
  loads unless named" to "anything same-origin loads" — to speed up seven PDFs
  behind seven links. McMaster prefetches because it has thousands of pages
  behind a hover. **Not a trade worth making here.**
- **No `og:image`.** The sharing card is text-only. An image would be a binary
  in `assets/` that silently goes stale the day a job title changes, and the
  card already carries the name and the role. The `og:` tags are read by the
  scraping service, not by the page, so none of them touch the CSP.
- **No back-to-top control.** The sticky header already is one — the wordmark
  links to `#top` and every section link is a jump.
- **No persisted fold state.** All folds open on load is the invariant in §3.8;
  remembering a collapsed section would gate content behind a past click.

### 3.7 Typography

- **One family, screen and print: `--sans` = Arial / Helvetica / Liberation Sans.** The former Georgia-prose / mono-data split was removed deliberately — this page is the résumé, and résumé convention (and ATS parsers) want one or two standard families, not a typographic device. Hierarchy is carried by **weight, size, letter-spacing and case**, never by typeface.
- **Do not reintroduce a second family**, and do not switch to Calibri, Aptos or Garamond: they ship with Microsoft Office or not at all, so on macOS or Linux they fall back to something unchosen. Arial and Helvetica are the only pair installed everywhere.
- System fonts only (rule 1.3). No webfont downloads.
- Tables set `font-variant-numeric: tabular-nums`. Monospace used to align the star and date columns for free; with a proportional face that alignment must be asked for.

### 3.10 Print typography

Sizes follow résumé convention and are **verified, not assumed** — flip
`@media print` to `@media all`, measure, flip back:

| Element | Size | Rule |
| --- | --- | --- |
| Body and prose | 11pt | body 10–12pt |
| Tables | 10pt | never below 10pt |
| Section headings | 14pt | headings 14–16pt |
| Name | 20pt | letterhead, outside the body rule |
| Sub-headings, notes, meta values | 10–11pt | |
| Printed link URLs | 8.5pt | supplementary, still legible |
| Page margin | 14mm (0.55in) | at least 0.5in |

**Tables stay tables on paper, with a visible grid.** Print mirrors the screen:
same columns, same order, a `.5pt` hairline on every cell edge and a `1pt` rule
under the header row. `thead` is `display: table-header-group` so a table
crossing a page break reprints its column labels — otherwise page two is a grid
of unlabelled columns. Rows carry `break-inside: avoid`, so a role can never be
separated from its dates. Zebra striping is dropped (it prints as grey haze and
the grid already separates rows) and `.sort-btn` collapses to plain inline text.

The screen removes the outer cell edges so `.table-wrap`'s own border can supply
them. That wrapper has no border on paper, so `th:last-child`, `td:last-child`
and `tbody tr:last-child > *` must each be **overridden by name** in the print
block — the screen's selectors are more specific, and a plain `th, td { border }`
loses to them, leaving the right and bottom edges of the grid open.

### One-page résumé mode

The export dialog offers two formats, and the choice sets `body.print-resume`:

| | Full record | One-page résumé |
| --- | --- | --- |
| Tables | Bordered grid, as on screen | Linearised, one line per row, no borders |
| Rows | All 66 | Only `tr[data-resume]`, in curated sections |
| Sections | All ticked | `data-resume-default="off"` unticks Certificates, Projects, Links |
| `@page` margin | 12.7mm + 1.3mm on `main` = 14mm | 12.7mm (0.5in, the §3.10 floor) |

**One page is a selection problem, not a typography one.** A4 at 12.7mm margins
leaves 271.6mm of live height; 10pt at 1.3 line-height is ~4.6mm, so the page
holds ~59 lines. The full record is 66 table rows *before* any heading. No font
size or margin closes that gap — rows are dropped instead. Do not try to solve
an overflow by shrinking type; 10pt is the floor and it is there for a reader.

**Curation is per section, not per table.** A `.section` containing any
`[data-resume]` gets `.resume-curated` in JS, and inside it unmarked rows and
unmarked `.section-body > p` are hidden. This is what removes the one-row MBOT
and PETRA UTP tables from the résumé without naming them anywhere. A section
that marks nothing — Skills — prints whole. A table left with no rows, and the
`.subhead` above it, are hidden together via `.resume-empty`, set in JS because
emptiness is not something CSS can ask.

**The four things that actually bought the page**, measured — 381.3mm → 260.1mm:
Skills to three columns via `data-resume-columns="3"` (−48), the masthead meta
collapsing to the two `[data-resume]` items inline (−30), curation dropping the
empty Experience tables and their subheads (−25), and About printing only its
marked paragraph (−19). Re-measure before adding content: the margin is 11.5mm.

**The dialog states the estimate** (`#export-budget`, `role="status"`): lines
used against lines available, and a stated warning past one page. It is an
estimate, labelled as one, and it must pick rows the same way the stylesheet
does — if `estimateLines()` and the CSS ever disagree about what prints, the
readout describes a page that does not exist.

**History, so the linearisation is not "fixed" again.** It was once applied to
*every* print, because applicant tracking systems parse multi-column tables
badly. That was the wrong default — the full record is read by a person — but
the right résumé, so it now lives in `body.print-resume` rather than being
deleted. It is also why the résumé mode is the ATS-safe one of the two, and
`assets/resume.pdf` remains the fixed plain copy to hand a job portal.

---

### 3.8 Collapsible sections

- Every `.section` wraps its body in `<details class="section-fold" open>`, with
  the `<h2 class="section-title">` inside the `<summary>`. **Native `<details>`,
  never a JS accordion** — the keyboard behaviour, the expanded/collapsed
  announcement and find-in-page auto-expansion are the browser's job.
- **All folds are open on load.** A reader who never clicks must still see
  everything; collapsing is an affordance, not a gate. Do not ship a
  closed-by-default section.
- The `+` / `−` marker is drawn from `[open]` in CSS, so the visible and
  announced states cannot drift — the same rule the sort arrows follow.

### 3.9 Export to PDF

- **No PDF library, ever.** The export sets what is visible and calls
  `window.print()`; the browser's own "Save as PDF" does the typesetting. The
  output keeps selectable text and live links because it is not a screenshot.
- The dialog is a native `<dialog>` with `showModal()` — focus trap, page
  inertness and Escape-to-close come from the browser. If `showModal` is
  missing the button removes itself rather than opening nothing.
- Section checkboxes are **built from the DOM** at open time, so a new section
  appears in the dialog automatically and cannot be forgotten.
- A section may carry `data-print-default="off"` to start **unticked**. §08
  Résumé does: a paragraph explaining how to obtain the PDF, printed inside
  that PDF, is noise. Unticking hides the whole section — heading included —
  because `.print-hidden` is `display:none`, not a collapse.
- The fold marker is a **chevron drawn from borders**, not a `+`/`−` glyph:
  down = collapsed, up = expanded, per accordion convention (Jakob's Law).
  Its rotation is transitioned, so in the preview pane — which never paints —
  the computed `transform` stays frozen at its old value. **Verify the cascade
  through `margin-top`**, which is not transitioned, or read the declared
  `transform` out of the CSSOM. A frozen transform there is not a bug.
- **Every change made for printing must be recorded and undone**: hidden
  sections, force-opened folds and the Projects filter are all captured in a
  `restore` object and reverted on `afterprint`, plus a timed fallback because
  not every browser fires that event. A page left mangled after a cancelled
  print is worse than no export.
- The print stylesheet drops the header, nav, footer, filter, status line and
  all buttons; repeats `<thead>` per page; and forbids a row splitting across
  a page break. Link URLs are printed only in the masthead, Links and
  Certificates — never for the 22-row Projects table.

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
  inline before testing anything rAF-throttled (the scrollspy). **Stub it
  first, before the first `dispatchEvent`** — the scrollspy latches a `queued`
  flag and clears it inside the callback, so one scroll event fired against the
  native rAF wedges every later one for the rest of the session.
- The pane **restores a previous scroll position** across reloads, so `scrollY`
  is not 0 at load. Push `<main>` down with a *positive* `margin-top` to
  measure the un-scrolled state; a negative one for the scrolled state.

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

Last full round: 22 repos live; zero console errors; zero inline style
attributes; no horizontal overflow at 375px or 1280px; tap targets 40–44px
(copy 40, nav 44, filter 40).

Header at 375px: **123.8px expanded → 41.6px condensed**, with
`scroll-margin-top` following it 172.5px → 67.5px. All eight nav items scroll
clear of the edge fade, checked one at a time; the marked item is auto-scrolled
into view. At 1280px the header is 45.6px in both states and the nav still
wraps — the condensed styles are mobile-only.

URL state: `?q=python&sort=stars&dir=descending` written and restored; a
poisoned `?sort=<img onerror>&dir=javascript:` is rejected and rewritten to
`?q=data`; the default sort writes no query string at all.

Print unaffected: résumé budget still reads "About 56 lines of the ~59 a page
holds"; defaults still `about/education/experience/skills` on and the rest off;
after `afterprint` the body class, `.print-hidden`, `.resume-empty` and the
filter value all return to where they started. `.copy-btn` is `display:none` in
the print block, confirmed through the CSSOM.

## 6. Deployment

`master` → GitHub Pages, served at the repo root. Push is the deploy; there is no
pipeline to break.

Two preconditions, both silent failures:

- The repo must stay named **`affannajiy.github.io`** — any other name moves the
  site off the root domain onto a `/subpath/`.
- The repo must stay **public** — Pages from a private repo needs a paid plan.

Full steps and failure symptoms are in `README.md` and the `deploy-site` skill.
