# State, filtering, status, errors

What page shows now, and how it says so. GitHub fetch, untrusted inputs,
filtering, URL state, search, keyboard, view modes.

Related: [security-posture.md](../../audit-untrusted-input/reference/security-posture.md) hardening ·
[tables.md](../../site-state-and-tables/reference/tables.md) sorting · [printing.md](../../verify-print/reference/printing.md) paper behaviour.

---

## 1. Status and errors

- `#projects-status` (`role="status"`) reports loading, count, sort, or failure.
- Skeleton rows, never a spinner. **No progress bar** — percentage unknown, so
  drawing one lies.
- **Errors state the fix, not just the fault** (Rulebook §1.9) and offer Retry
  (§1.3). Advice picked from the failure: 403/429 → rate limit + wait, 5xx →
  GitHub down, unreadable reply → captive portal/proxy, else → check connection.
  One fixed message is wrong: telling someone to wait out a limit they never hit
  is a wrong fix, worse than none.
- **Both failure paths get Retry** via `addRetry()` — empty, and stale-cache.
  Stale path once had the caveat but no button: a stated failure with no way to
  act is half a message.
- **10s fetch deadline.** No deadline is a hang, not a slow request — skeletons
  sit there and the status line keeps claiming a fetch is live. Timeout names
  itself: "GitHub did not answer within 10 seconds", not "AbortError".
- **Retry rate-limits itself.** Second click inside 3s → "Wait 3s". Says
  "Retrying…" while working; a button that only greys out reported nothing.
- `aria-busy` while skeletons are up, dropped on every settle path.
- **Colophon system panel is measured, never typed.** "Page updated" =
  `document.lastModified` (Pages' own header, cannot go stale). "GitHub API" =
  actual fetch result. "Network" = `navigator.onLine`. Unmeasurable value does
  not belong here.

## 2. Filtering

- Projects filter matches name, description, language, case-insensitive.
- **Filter before sort.** `repos` = everything, `view` = rendered. Keep the split.
- Empty result = sentence with query echoed and a way out, never a blank table.
- 21 rows filter instantly. No debounce, no spinner. Measure before adding either.
- **Two filters compose, both named.** Query AND topic chip, not OR.
  `describeState()` names whichever are active, or the count has no stated reason.
- **Certificate filters are selects.** Closed set; free text over a closed set
  invites a query that can only fail. Options built from rows, so a new
  certificate joins with no second edit.
- **A filter that empties a block collapses the block.** Filter Experience to
  2026 → MBOT and Pemuzik have no roles, and render as a bare header row under a
  sub-heading. Reads as broken, not filtered. `syncEmptyBlocks()` sets
  `.block-empty` on `.table-wrap` **and** the `.subhead` above it. Three rules:
  - **Only `.subhead`-introduced blocks.** Projects and Certificates state their
    own empty result in words; hiding those deletes the explanation.
  - **Emptiness = each row's own computed `display`, never `offsetParent`.** A
    closed `<details>` hides rows without filtering any. Reading that as empty
    leaves the block hidden after the fold reopens. Easy to reintroduce.
  - **Not `.resume-empty`.** Print-only, stripped on `afterprint` — reusing it
    means one print silently undoes the on-screen filter.
- **Three hiding mechanisms, never shared:** `.filtered-out` filters ·
  `data-hide-in` view modes · `body.focus-mode` focus. On paper the first and
  third are reversed, the second is not — [printing.md](../../verify-print/reference/printing.md) §4.
- **Filters register their own undo** via `registerUndo(name, owns, active,
  undo)`. A search result can land on a row a filter hides, and a hidden row is
  nothing. Registered, not hard-coded: a filter that forgets shows up the first
  time anyone searches for it, where a hard-coded list rots silently at filter
  four. `undo()` reuses the control's own reset handler, so the button a reader
  presses and the one a jump presses cannot drift.
- **A nav item with nothing in it is marked, never hidden.** `syncNavEmpty()`
  sets `data-empty="true"` + an `sr-only` note. Dotted underline is the signal,
  not dimming — never colour alone. Stays clickable; hiding it would gate the
  section behind undoing a control first.
  - **Run from filters as well as view modes.** View-mode-only was the first
    build, and no view mode empties a section on this content — the mark could
    never appear. Correct and unreachable is worse than not built.
  - Only sections that **have** rows are judged. About and Links are prose.

### 2a. A count must be of what is visible

- **Never count what passed the filter.** Count
  `getComputedStyle(row).display !== "none"`. A view mode hides rows in CSS, so a
  row can pass every filter and still not be on the page — Certificates at
  `year=2024` in the Developer view said "Showing 1 of 7" over an empty table,
  while the nav marked the same section empty. A status that contradicts the page
  is worse than no status.
- **Name the control actually in the way.** If the filter matched but a view mode
  is hiding the matches, say so and point at Everything. Offering Reset there is
  a way out that does not work.
- **Recount on `viewmodechange`.** The event exists so a filter subscribes itself;
  a call list inside the view mode goes out of date the day someone adds a fourth
  filter and forgets. Same reasoning as the undo register.
- **`VIEW_LABEL` lives beside `viewMode`.** The certificate status reads it during
  init; `var` hoists the name but not the value, so declaring it beside its first
  reader made it `undefined` at exactly the wrong moment.

## 3. URL state

- `?q=` `?sort=` `?dir=` `?topic=` `?view=` `?focus=`, written with
  `history.replaceState` on every `refresh()`. Shareable, survives reload.
  **Never `pushState`** — one entry per keystroke makes Back walk the reader
  letter by letter out of a word they typed.
- **A URL is untrusted input, like the API and the cache.** `sort` checked
  against known columns with `hasOwnProperty`, `dir` against two values, `view`
  against two modes, `topic` against `TOPIC_RE`, `focus` against a slug pattern
  **and** the existence of a real `.section`. Anything else ignored, not
  assigned. Only non-default state written, so a plain visit keeps a plain URL.
- **The fragment is the sixth untrusted input, and was the one taken raw.**
  `revealTarget()` handed `location.hash` to `querySelector`, so `#a,*` was a
  valid *selector* matching `<html>` and opened whichever fold came first —
  selector injection, small blast radius, wrong all the same. Now pattern-checked
  (`^[A-Za-z][\w-]*$`) then `getElementById`, matching what `?focus=` already did.
  Verified against all 90 ids and all 22 `href="#…"` on the page: none rejected.
  The old `try/catch` existed only because a raw hash could throw; an id cannot.
- **Nothing new goes in `localStorage`.** Remembered scroll, fold state and
  session restore were all proposed and declined — fold state by name in
  [decisions-not-built.md](../../site-feature-map/reference/decisions-not-built.md). Filters already survive a
  reload better: the URL is shareable and says why the page looks as it does.

## 4. Search, palette, keyboard

- **One search, one key.** `/` and `Ctrl`/`Cmd`+`K` both open it. `/` no longer
  focuses the Projects filter — a key meaning different things by location is
  worse than one meaning one thing.
- **The header Search control is not optional.** Shortcuts install only behind
  `(hover: hover)`, so before it existed the dialog was **unreachable** on a
  phone, not merely undiscovered — and so was every command in it. Written in
  `index.html`, not built in JS, so it is in the header's layout from first
  paint; `initSearch()` only unhides it, and only after `showModal` is confirmed.
  `Ctrl K` hint revealed by the same `(hover: hover)` test the `?` panel uses.
- **The palette is the search dialog, not a second one.** One list, one set of
  arrow keys, one Enter. Commands and hits separated by a group heading and a
  marker, never by position — position moves with the query.
  - **Commands built from the DOM.** Jumps from the nav; every other command
    finds an existing control and clicks it, so palette and button cannot
    diverge, and a new control joins with no second edit. Hidden or disabled
    controls skipped — which is why a phone is not offered "Keyboard shortcuts".
  - **Opens showing them.** Replaces the blank prompt. This is the whole
    accommodation for readers who will not learn a syntax: a recruiter presses
    Search and sees "Switch to the Recruiter view" without typing or knowing
    anything.
  - `>` = commands only. Accelerator, never a requirement — same list the empty
    box already shows.
  - **Only focus mode's two commands are hand-written**, because focus mode has
    no control of its own on the page.
- **Syntax: `section:` `type:` `year:` `lang:`.** Documented in the `?` panel,
  not above the input — a manual in front of everyone who wanted to type a word
  is the wrong trade. **Unknown prefix is searched literally and said so.**
  Strict rejection would punish a colon in ordinary prose ("note: python"), and
  a search that fails on plain English is worse than one ignoring a prefix.
  `lang:` reads `data-lang`, written by `renderRows()` from the API's own field
  — so it filters on what GitHub reported, not on words in a description.
- **Every index entry carries its node**, not just its section id. Otherwise a
  hit on one row of sixty-six scrolls to the top of Experience and leaves the
  reader to find it by eye — the work search existed to do. Live nodes are safe
  **only** because the index is rebuilt per open; one cached across a re-render
  is an orphan.
- **The jump clears what hides its target and says what it changed**, in a
  transient `role="status"` note fixed to the bottom of the viewport. Fixed, not
  in flow: the jump just scrolled the page, so a note at the top is delivered
  where the reader no longer is. Order: focus → fold → view mode → filter.
  Cheapest undo first, filter last because it is most likely deliberate. **Each
  step re-tests whether the node is still hidden**, so nothing is cleared that
  was not in the way.
- **Match painted with the CSS Custom Highlight API**, cleared after 2.6s.
  `CSS.highlights` marks a Range without inserting a node — the entire reason it
  is used. A `<mark>` would be read back out by `readableText()`, which feeds
  the search index, the JSON view and the résumé budget; that bug family has
  cost three rounds. Nothing inserted, nothing to unwrap, nothing to leak. No
  API, or a term matching only assembled row text (cells joined with `·`, which
  is in no text node) → row flash instead. Held, not pulsed; static under
  `prefers-reduced-motion`.
- **Scroll is synchronous, `block: "center"`.** An earlier build wrapped it in
  `requestAnimationFrame`; rAF never fires in a tab that is not compositing, so
  a needless precaution became a way for the jump to never happen. Every undo is
  a synchronous DOM change and `scrollIntoView` flushes layout itself. `center`
  not `start` — a row at the top lands under the sticky header unless every row
  carries `scroll-margin-top`.
- **Everything reading the page back goes through `readableText()`** — search
  index, JSON view, section labels, résumé estimate. Strips control labels and
  `sr-only` notes, so a result never reads `"linkedin.com/in/affannajiy (opens
  in a new tab)Copy"`. One exclusion list; four readers will not stay in step by
  hand.
- **Index read from the DOM on open**, never stored beside the content. Anything
  in `index.html` is searchable unregistered. Per open, not at load — Projects
  rows do not exist until the API answers.
- **Keyboard installs only behind `(hover: hover)`**, as does the `?` button. A
  phone is never told to press a key it has not got.
- Handlers stand down in a text field and while a `<dialog>` is open.
  **`typing()` must also ignore fields in a *closed* dialog** — else the first
  Escape out of the search box leaves focus in its input and kills every
  shortcut for the visit, silently. The dialog also blurs on `close`; both
  guards kept, either alone fixes it.
- `g` chord expires after 1200ms, so a half-pressed chord cannot swallow a
  keystroke typed a minute later.

## 5. View modes

- **Full is the default and hides nothing.** Recruiter and Developer hide rows
  carrying `data-hide-in`, nothing else. Toggle always visible in the
  fold-controls bar, so nothing is gated behind a click nobody remembers making.
- CSS does the work from a body class; JS records the mode, announces it via
  `sr-only` `role="status"`, writes the URL. Measured: 88 full, 82 recruiter,
  76 developer.
- **No Archive mode.** Proposed as a fourth mode showing "everything including
  older material" — which is Everything. Building it meant deciding which of
  Affan's rows count as old: a decision about his CV, not a feature.

## 5a. Focus mode

- **One section on screen.** `body.focus-mode` + `.focus-target`, `?focus=<id>`,
  `f` toggles, `Esc` leaves. A third mechanism, not a fourth view mode: folding
  it into `data-hide-in` would inherit "view modes are not reversed on paper",
  and a focused PDF really would be one section.
- **Nothing mentions focus mode while it is off.** Way in is the palette or the
  key; the only thing it draws is its own way out, and only while on. Clearest
  case of the sleeper-build rule.
- **The nav re-targets focus instead of navigating.** Without it every nav item
  becomes a link to a section that is not rendered — a blank screen. The nav is
  the one piece of chrome focus mode keeps, so it must keep working.
- **`?focus=` validated like any URL parameter**: matches `^[a-z][a-z0-9-]*$`
  **and** names a real `.section`. "Looks like an id" is not enough for a string
  about to enter a selector. Poisoned values ignored and dropped from the URL.
- **Above the first section, `f` focuses the first one.** The scrollspy reports
  no current section at the top, and an earlier build had the palette fall back
  while the key did not — so `f` did nothing at exactly the scroll position a
  first-time reader occupies. One `sectionToFocus()` serves both.

## 6. Remembered and not

**Density is remembered** (`localStorage`, `table-density`); fold state is not.
Forgetting a density resets a preference about *how* to read. Forgetting a fold
hides content behind a click the reader does not remember making.

## 7. Evidence links

- **Skills evidence phrases are anchors**, one per named row. Was prose, so
  "every skill points at a real row" held only while someone checked by eye, and
  nothing could ask the reverse.
- **They go through `revealEntry()`, not the browser's hash jump.** A coursework
  row can be behind a closed fold, a year filter or a view mode; the native jump
  would scroll to a `display: none` row and land the reader on whatever is
  nearby. Same path as search, so a filter registering its undo once is
  reversible from both.
- **Modified clicks are left alone** — `href` is a real href, so open-in-new-tab
  must keep working.
- **A `<td>` target is promoted to its `<tr>`.** Four names live in column two.
  A single lit cell says "this word"; the answer is the row.
- **The skill is the row's first `<td>`, not its `<th scope="row">`** — that
  header is the category (`Software`, `Professional`), repeated down the group.
  Reading it produced "Evidence for Professional", which names four rows.
- **The reverse direction is said in `.jump-note`, never written into the row.**
  A caption inserted into a cell is read straight back out by `readableText()`
  into the search index, the JSON view and the résumé budget — the bug family
  that has cost three rounds. `revealEntry()` passes the changed list alongside
  its sentence so this caller can name the skill first without parsing prose.
- **Phrases naming no row point at `#projects`**; the two `—` cells stay plain.
  Never invent a target.

## 8. Related repositories

- **Edge is a shared topic, never a shared language.** Language is free and says
  nothing — every Python repo would link to every other and the answer is one
  blob. A topic is tagged on purpose, so the edge carries intent. No allowlist:
  curation happens on GitHub and the page reports it.
- **Text, not a drawn graph.** A node-link picture needs a layout algorithm,
  geometry the CSP forbids as inline style, and a separate version for paper and
  screen readers — three costs to say what one sorted line says.
- **Neighbours are buttons, not links.** A button swaps the dialog in place, so
  the edge is walkable; a link would leave for GitHub, the opposite of the point.
  `show()` is one function for both entry points, and only calls `showModal()`
  when the dialog is closed — on an open one it throws.
- **Sorted most-shared, then by name**, so two openings do not shuffle.
- **Empty states are stated and distinct**: tagged but alone, versus not tagged
  at all. The second names the thing that would fill it. Hiding the row would
  teach the reader nothing.

## 9. Reset the view

- **One way out of every hiding control at once.** A reader who has stacked a
  view mode, a year, a topic, a search and a sort had five controls to find, and
  the Back button was doing the job by accident.
- **Built from `undoRegister` plus the focus and view-mode hooks**, never its own
  list — a hard-coded list misses the sixth filter silently, which is the whole
  reason the register exists.
- **Offered only when something is on.** A permanent Reset on a clean page is a
  control that does nothing the first time anyone tries it.
- **The label enumerates what it will clear**, and the status line repeats it
  afterwards. Same undo order as a search jump: focus, then view mode, then
  filters — so the two cannot mean different things by "undo everything".
- **Scope is what hides content.** Sort order and comparison selection hide
  nothing, so Reset leaves them; the enumerated label means that is visible
  rather than surprising.
