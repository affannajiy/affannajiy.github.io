# State, filtering, status and error handling

Everything about what the page is currently showing and how it says so: the
GitHub fetch, the two untrusted data sources, filtering, URL state, search,
keyboard, and view modes.

Related: [security-posture.md](security-posture.md) for the hardening helpers,
[tables.md](tables.md) for sorting, [printing.md](printing.md) for how filters
and view modes behave differently on paper.

---

## 1. Status and error handling

- The Projects table announces itself through `#projects-status`
  (`role="status"`), which reports loading, the repo count, the active sort, or
  the failure.
- Loading uses shape-matched skeleton rows, never a spinner. Do not add a
  progress bar — the percentage is unknown, so drawing one would be a lie.
- **Errors must state the fix, not only the fault** (UI-UX Rulebook §1.9), and
  must offer a Retry control (§1.3). The advice is **selected from the
  failure**: 403/429 names the rate limit and the wait, 5xx says GitHub is down,
  an unreadable reply names a captive portal or proxy, anything else says check
  the connection. Do not go back to one fixed message — telling someone to wait
  out a rate limit they never hit is a wrong fix, which is worse than none.
- **Both failure paths get Retry, via the shared `addRetry()`.** The empty path,
  where the error is the whole story, and the stale-cache path, where it is a
  caveat on a table that still reads. The cached path had the caveat but no
  button for a while: a stated failure with no way to act on it is half a
  message, and the reader was left holding stale data with only a full page
  reload as a way out.
- **The fetch has a 10-second deadline.** A request with no deadline is not a
  slow request, it is a hang: the skeleton rows sit there and the status line
  goes on claiming a fetch is in flight, which the reader has no way to detect.
  On timeout it fails like any other failure, naming what happened — "GitHub did
  not answer within 10 seconds", not "AbortError".
- **Retry rate-limits itself.** It is the control a frustrated reader clicks
  repeatedly, and it spends a shared 60-per-hour budget, so a second click
  inside 3 seconds becomes "Wait 3s" rather than another request. It says
  "Retrying…" while working, because a button that only greys out has not
  reported anything.
- **The table carries `aria-busy` while the skeleton is up**, and drops it on
  every settle path.
- **The system panel in the colophon is measured, never typed.** "Page updated"
  is `document.lastModified` — the header GitHub Pages sends for `index.html`,
  so it cannot go stale the way a hand-written date does, which is the entire
  reason a "last updated" line is worth having. "GitHub API" is set from the
  actual fetch result; "Network" follows `navigator.onLine`. If a value here
  cannot be measured, it does not belong here.

## 2. Filtering

- The Projects filter matches name, description and language,
  case-insensitively.
- Filtering happens **before** sorting; `repos` holds everything, `view` holds
  what is rendered. Keep that split — sorting a filtered list is the only
  correct order.
- An empty result is a stated sentence with the query echoed back and a way out
  ("Clear the filter…"), never a blank table.
- 21 rows filter instantly, so there is no debounce and no spinner. Do not add
  either without measuring first.
- **Two filters compose, and both are named.** The typed query and the active
  topic chip are AND, not OR — someone who picked `python` then typed `api` is
  narrowing. `describeState()` names whichever are active, or the count on
  screen has no stated reason for being what it is.
- **Certificate filters are selects, not a text box.** Year, issuer and type are
  a closed set the table already knows, and free text over a closed set invites
  a query that can only fail. Options are built from the rows, so a new
  certificate joins the filters with no second edit. Empty results are a
  sentence naming the way out, never a blank table.
- **`.filtered-out` is for filters; `data-hide-in` is for view modes.** Two
  separate mechanisms on purpose, so they can never fight over one attribute. On
  paper `.filtered-out` is reversed and `data-hide-in` is not — see
  [printing.md](printing.md).

## 3. URL state

- **The filter, sort, topic and view mode live in the URL** — `?q=`, `?sort=`,
  `?dir=`, `?topic=`, `?view=`, written with `history.replaceState` on every
  `refresh()`. A filtered view is shareable and survives a reload.
  **`replaceState`, never `pushState`**: one history entry per keystroke would
  make Back walk the reader letter by letter out of a word they typed.
- **A URL is untrusted input, exactly like the API and the cache.** `sort` is
  checked against the three known columns with `hasOwnProperty`, `dir` against
  the two legal values, `view` against the two modes, and `topic` against
  `TOPIC_RE`; anything else is ignored, not assigned. Only non-default state is
  written, so a plain visit keeps a plain URL.

## 4. Search and keyboard

- **One search, one key.** `/` and `Ctrl`/`Cmd`+`K` both open the site-wide
  search dialog. `/` used to focus the Projects filter; it no longer does,
  because a key that means different things depending on where you were looking
  is worse than a key that means one thing. The hint beside the filter now says
  what the field filters instead of claiming a key.
- **Everything that reads the page back goes through `readableText()`** — the
  search index, the JSON view, the section labels and the résumé line estimate.
  It strips control labels and screen-reader-only notes, so a result never reads
  `"linkedin.com/in/affannajiy (opens in a new tab)Copy"`. One exclusion list,
  because four separate readers will not stay in step by hand.
- **The search index is read out of the DOM on open**, never stored beside the
  content. Anything written into `index.html` is searchable without being
  registered anywhere. Rebuilt per open rather than at load — the Projects rows
  do not exist until the API answers — and per open rather than per keystroke.
- **Keyboard handlers install only where `(hover: hover)` matches**, and the `?`
  reference button in the colophon is revealed by the same test. A phone is
  never told to press a key it does not have.
- Every handler stands down inside a text field and while a `<dialog>` is open.
  **`typing()` must also ignore fields inside a *closed* dialog** — without
  that, the first Escape out of the search box leaves focus in its input and
  kills every shortcut for the rest of the visit, silently. The dialog also
  blurs its own input on `close`; both guards are kept, either one alone fixes
  it.
- The `g` chord expires after 1200ms, so a half-pressed chord cannot swallow a
  keystroke typed a minute later.

## 5. View modes

- **Full is the default and hides nothing.** Recruiter and Developer hide rows
  and blocks carrying `data-hide-in`, and nothing else. The toggle sits in the
  fold-controls bar, always visible, so no content is ever gated behind a click
  the reader does not remember making.
- The work is done in CSS from a body class; JS only records the mode, announces
  the change in words through an `sr-only` `role="status"`, and writes it to the
  URL. Measured: 88 rows full, 82 recruiter, 76 developer.

## 6. Remembered and not remembered

**Density is remembered** (`localStorage`, `table-density`); fold state is not.
The distinction is not arbitrary: forgetting a density resets a preference about
*how* to read, while forgetting a fold hides content behind a click the reader
made once and does not remember making.
