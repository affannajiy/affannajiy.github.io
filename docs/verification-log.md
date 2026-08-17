# Verification log

No tests, no build step, so verification is manual and written down. This is the
**record**; the *procedure* lives in the `verify-site`, `verify-print`,
`check-accessibility` and `audit-untrusted-input` skills.

Update after any round that measured something new. **A number here with no date
behind it is a number nobody has checked.**

---

## Round: 2026-08-17, one scroll direction on mobile

Nine of twenty `.table-wrap`s overflowed at 375px, so nine tables took a second
gesture to read. Below 640px rows stack instead. Plus: every dialog centred, and
the `#` button moved out of `<summary>`.

| Check | Result |
| --- | --- |
| Page overflow | `scrollWidth === innerWidth` at **320px**, **375px** and **1280px**. Walked every element in `main` and the footer: **0 offenders** at 320px |
| Scrolling table wraps | **9 → 0**. `syncScrollableTables()` strips the `tabindex` and `role=region` by itself — 9 keyboard stops that no longer lead anywhere |
| Still scroll on purpose | `.ascii-wrap` (fixed-width art) and `#compare-table` inside its own dialog |
| Cell labels | 253 `data-label`s across `main`, all derived from `<thead>`. Education row reads `Qualification / Institution / Period / Result`, each cell 344px wide |
| Labels survive a render | 40 on the Projects table after sort, 12 of 12 cells after filtering to 3 rows |
| Search index / JSON / budget leak | none. An attribute is invisible to `readableText()`; budget **`About 58 lines of the ~59 a page holds`**, unmoved |
| `<thead>` stacked | Projects and Education **kept** (sort bar, 65px: a "Sort by" label over 40px buttons). "Year by year", which has no sort, **hidden** — every cell names its own column |
| Plain header inside the sort bar | `Description` has no sort button and is `display: none` — not a dead label in a control bar |
| Sorting stacked | `aria-sort="ascending"` follows the click, rows reorder, filter status reads `Showing 3 of 10 repositories matching "py", sorted by name, ascending.` |
| Desktop unchanged | `display: table` / `table-row` / `table-header-group`, `thead th` still `sticky`, label `::before` computes `none` |
| Contrast | cell label **5.35**, "Sort by" **5.35**, row header **5.05**, `.anchor-btn` **5.05** |
| Dialogs centred | all **7** — export, repo, QR, compare, search, keys, JSON. Both axes, gaps equal to within 2px. The palette lives inside the search dialog, so it inherits |
| Search dialog while typing | fixed `height: min(82vh, 34rem)` rather than a max. Centred with an auto height, the box grows symmetrically and slides the input out from under the finger |
| Export dialog on a 375×812 screen | UA clamps it to 773px against 842px of content, and computed `overflow-y: auto` — it scrolls inside. **Not clipped** |
| `#` button out of `<summary>` | `summary .anchor-btn` **0**, `.section > .anchor-btn` **8**. Chrome's "interactive element inside `<summary>`" for 8 elements is gone |
| `#` tap target | **40×40**, up from ~19×40 — out of flow, the box can just be the target. Aligned to the heading band (`top` 780 = summary `top` 780), 22px clear of the fold chevron |
| `#` no longer toggles the fold | clicked, `details.open` unchanged. The `stopPropagation` guard deleted with the nesting |
| Console | zero site-owned errors, `[style]` count **0** |
| Projects table | 10 rows live from the API, status states the count |

**Follow-up the same day** — the stacked sort bar, and certificate verification:

| Check | Result |
| --- | --- |
| Sort chip at rest | **17.92:1**, `--fg` on `--bg`, 1px `--border`, **71×40**. Was muted grey inherited from a header row it no longer sits on — 5-ish and reading as decoration |
| Sort chip pressed | `aria-sort="ascending"` → `--accent-text` on `--accent-soft`, `--accent` border, arrow recoloured. **4.72:1**. Drawn from `aria-sort`, so filled and announced cannot drift |
| Unpressed sibling | unchanged in the same click — one chip fills, not all |
| Keyboard-shortcuts button on touch | **already `hidden`.** Gated on `(hover: hover)`, not on width: emulated touch reports `hover: false`, `pointer: coarse` → hidden; 1280px desktop → shown. Nothing changed |
| Certificate verify links | 4 of 7, `.cert-verify`. **Zero tracking parameters** — LinkedIn's `?trk=` and `lipi=` stripped |
| Column header | `PDF` → `Record`, and `data-label` follows it automatically |
| Print | `.cert-verify` `display: none`, asset URL still emitted, verify URL not, **no dangling `·`**. Masthead 67.3mm, budget **58 of ~59** — both unmoved |
| Certificates **Reset** alignment | was **4.8px** low — `.retry-btn`'s `margin-top: .6rem` (9.6px) on a `align-items: center` row, which centres the *margin* box, so the visible box drops by half. Now `delta: 0`, tops **and** bottoms flush, heights equal. Own grid row below 640px keeps the 9px, **58×40** |
| Failure path, unplanned | rate-limited mid-round. Rendered **10 rows from a 12-minute-old cache**, stated the reason, offered Retry, cleared `aria-busy`. Working as designed |

**New harness trap.** Flipping `@media print` to `all` does **not** switch off
`@media screen and (max-width: 640px)`, so at 375px the print reading came back
`display: block` with cell labels — the stacked layout, not a print leak.
**Measure print above 640px.**

**Lighthouse, live site, Moto G Power / slow 4G:** 99 / 100 / 100 / 92. Nothing
actionable. SEO 92 is the missing `robots.txt`, rejected on purpose; CSP-in-meta,
HSTS, COOP and XFO are response headers GitHub Pages does not let the repo set;
minify and unused-JS want a build step (constraint 1.2). CLS **0**.

## Round: 2026-08-17, QR code

A committed PNG, not a generated one — a QR encoder is Reed–Solomon arithmetic and
rule 1.3 forbids fetching one, so ~250 lines to avoid a 2KB file is the wrong
trade. Dialog for screen, 18mm float for paper.

| Check | Result |
| --- | --- |
| Button tap target | box **22px**, hit area **40px** via the inherited `.copy-btn::after` overlay. Download link in the dialog 44px |
| Button styling | drawn as a `.copy-btn`, matching the Copy chips it sits beside. Every computed value identical — 11.2px, uppercase, 0.672px tracking, same border, colour, background and padding; only the width differs, the label being longer. Row heights 40 / 41 / 41 / **40**, so the new row does not stand out |
| Button before JS confirms `showModal` | `hidden`, and `.qr-btn[hidden]` added — `.copy-btn` is `display: inline-flex`, so without it the button renders while claiming to be hidden |
| Search index / JSON / budget leak | `.qr-btn` added to `NOT_CONTENT`. JSON view reads `"This page", "affannajiy.github.io"` — **`QR code` appears nowhere**, and no dangling separator |
| Command palette | offers `QR code`, and **gained no `Copy` commands** — 19 items. `.copy-btn` styling meant losing `button.button`, so `main button.qr-btn` is named in `COMMAND_SOURCES`; the Copy chips stay out, eight commands reading "Copy" naming no address |
| Image | `assets/qrcode_affannajiy.github.io.png`, 450×450, renders 240px in the dialog. `width`/`height` attributes state 450, not the 512 first assumed |
| Second click on an open dialog | does not throw (`if (!dialog.open)`) |
| Rendered size | 240px desktop, 225px at mobile width, `overflowX: false` both |
| Print, record | masthead 67.3mm, code 18mm, **no overhang, no intrusion into About** |
| Print, résumé | masthead **21.6mm — identical to before the code existed**, so 0 lines |
| Budget | `About 58 lines of the ~59 a page holds` |
| Missing file | `404` → alt text renders, address still readable as text, dialog still usable, no overflow |

### The résumé masthead is the constraint

In résumé mode the fact list drops to its two `[data-resume]` rows, taking the
masthead to **21.6mm**. Measured, in order:

1. **22mm** — overhung by 0.4mm and leaked into About.
2. `flow-root` + **20mm** — leak fixed, but containment turned the overhang into
   height: masthead **24.1mm**, +2.5mm the character-counting estimate cannot see.
3. **18mm** + 1mm margin — 19mm inside 21.6mm. Masthead back to **21.6mm**, zero
   invisible cost. Kept.

`flow-root` stays anyway: without it, the next masthead trim leaks the float again.

### Harness traps, both new

- **A resize preset leaves a stale layout viewport.** `innerWidth` reported 375
  while the layout was still 410, so `scrollWidth > innerWidth` read `true` and
  looked like real overflow. Clean reload: 735 / 720, `false`. **Reload after a
  resize before believing an overflow number.**
- **A deleted image still loads from cache.** `img.complete` stayed true after
  `rm`. Probe the 404 with `new Image()` and a cache-busting query instead.

`style.css` was flipped to `@media all` to measure and **flipped back** — verified
`@media print` × 1, `@media all` × 0.

---

## Round: 2026-08-17, OWASP Secure Coding Practices audit

All 213 items of [SECURITY_Rulebook.md](SECURITY_Rulebook.md) §2a walked against
the source. Four changes, three rejections
([decisions-not-built.md](decisions-not-built.md)), and a written statement of
which categories are *not applicable* rather than passed
([security-posture.md](security-posture.md) §7).

| Change | Measured after |
| --- | --- |
| CSP `require-trusted-types-for 'script'; trusted-types 'none'` | `div.innerHTML = "<b>x</b>"` → `TypeError: … requires 'TrustedHTML' assignment`; `trustedTypes.createPolicy` → blocked by `trusted-types 'none'`. Page unaffected: **10 rows, 5 chips, 22 evidence links, 0 site-owned console errors** |
| 3 × `innerHTML = ""` → `textContent = ""` | **0 `innerHTML` assignments left in `script.js`.** Compare bar cleared and rebuilt three times: 3 child nodes each time, no duplication |
| `credentials: "omit"`, `referrerPolicy: "no-referrer"` on the fetch | live call still lands — `api.github.com/users/affannajiy/repos` in **583 ms**, 10 repositories |
| `#hash` as an id, not a selector | `#education` opens its fold; **`#a,*` is refused** — it used to be a legal selector matching `<html>`, whose first `details.section-fold` then opened |

Also clamped `err.message` to 200 — the last unclamped string on a reader-visible
path.

### Traps hit while measuring, all harness

- **`location.hash = …` fires `hashchange` asynchronously.** Reading the fold in
  the same statement reports `open: false` and looks like a regression. Read it in
  the next call.
- **`dialog.showModal()` on the search dialog bypasses the handler that builds the
  index**, so a query matches nothing. Click `.header-search` instead — 8 matches
  for `python`.
- **Devtools `eval()` bypasses CSP.** `window.eval('1+1')` succeeded and proves
  nothing about `script-src` — which is why the comment in `index.html` credits
  the absent `'unsafe-eval'`, not Trusted Types, for killing `eval`.
- The first topic chip is **"All"** (`""`), so clicking `[data-topic]:first` filters
  nothing and reads as a broken chip.

`assets/resume.pdf` re-scanned for PII while in the area: **0 phone numbers, 0
email addresses, 0 ID numbers** across 120,693 extracted characters.

---

## Round: 2026-08-17, hardening — a11y, print, untrusted input, Reset

Seven gaps from an AI feature review, kept only where reading the code confirmed
them. Three suggestions refused — see [decisions-not-built.md](decisions-not-built.md).

| Gap | Before | After |
| --- | --- | --- |
| `?q=` unbounded | taken at any length | clamped to `MAX_NAME` (100); **URL rewritten to the clamped value** — `?q=` of 4,000 chars came back as `searchLen: 103` |
| `.table-wrap` keyboard | 20 scrollers, 0 focusable | **9 focusable, 9 overflowing, 0 mismatch**; labels from each `<caption>`, re-synced on resize, fold toggle and `viewmodechange` |
| Search snippet | `slice(0, 160)` from the start | window centred on the match |
| `forced-colors` | absent | 1 block, 6 rules, parsed |
| Print breaks | absent | `orphans`/`widows` + 3 `break-after` rules, parsed |
| Static sort | silent | one shared `sr-only` `role="status"` |
| Language counts | `{}` | `Object.create(null)` |

### The snippet bug was real

`Perhutanan` sits at char **278** of its row, `RECONSA` at **261**. Both were
outside the old 160-character window, so the result claimed a match and then
showed no trace of it. Both now appear in their own snippet.

### Reset view

Built from `undoRegister` + the two hooks, never its own list. Offered **only when
something is on** — absent from the palette on a clean page.

Stacked all five and cleared them in one command:

```text
›Reset the view — the Developer view, the Projects filter,
  the certificate filters, the Experience year filter
```

After: Everything chip pressed, All years, `cert-year` empty, filter box empty,
10 project rows, 15 Experience rows, **`location.search` empty**. Focus mode +
view mode together also cleared, `body.className` back to `""`.

Scope is deliberately *what hides content*. Sort order and comparison selection
hide nothing, so they stay — and the command label enumerates what it will clear,
so nothing is a surprise.

### Sort announcement wording

First version read "Education history. Column headers sort the table. sorted by
Qualification, ascending." — captions here also carry instructions. Now the first
sentence only: **"Education history sorted by Qualification, ascending."**

### Unmoved

Résumé budget **58 of ~59**. Contrast baseline unchanged (no colour touched).
`[style]` count 0, no overflow, 22 evidence links, 0 dead, live API 10 rows.

### Three harness traps

- **`var closed = …` silently fails.** `window.closed` is read-only, so a test
  variable of that name never takes and reads as `false`. Cost one wrong "the
  fold is still focusable" conclusion.
- **A 300,000-char query string never reaches the page.** `python -m http.server`
  answers **414**, and GitHub Pages would too. The clamp is defence in depth, not
  the only bound — test it at ~4,000.
- **Clicking the export radio's label triggers the print button** and a native
  print dialog freezes the renderer. Set `.checked` and dispatch `change`.

---

## Round: 2026-08-17, full round after Batch B

Whole site, not just the diff. Found one real bug in code neither batch touched.

### Bug: a filter count that contradicted the page

Certificates, `year=2024`, Developer view. 7 rows → 6 filtered out → the one
survivor also carries `data-hide-in="developer"`. Table visibly empty, status
line said **"Showing 1 of 7 certificates."** The nav marked the section empty at
the same time, so the page disagreed with itself.

Cause: `shown` counted rows passing the *filter*. A view mode hides in CSS, so a
row can pass every filter and still not be on the page. The Experience year bar
had the same shape.

Both now count `getComputedStyle(row).display !== "none"` — what the reader can
see. And when the view mode is what is hiding them, the message names *that*,
because Reset would not have brought the row back:

| State | Says |
| --- | --- |
| Developer, no filter | "5 of 7 certificates — the Developer view is hiding the rest." |
| Developer + `year=2024` | "1 certificate matches those filters, but the Developer view is hiding them. Select Everything to see them." |
| Back to Everything | "Showing 1 of 7 certificates." — recounted live |

`viewmodechange` event, not a call list: a filter added later subscribes itself,
where a list goes quietly out of date the day someone forgets it. Same reasoning
as the undo register. `VIEW_LABEL` moved up beside `viewMode` — the certificate
status reads it during init, before its old declaration ran, and `var` hoists the
name but not the value.

### Measured

| | |
| --- | --- |
| Contrast | body 14.4, hint/nav 5.05, section num + masthead role 4.96, row label 5.35, table header 17.92 — **all baseline** |
| `--accent-text` `#b8490c` | 4.96 on body, 5.25 on table and dialog surfaces |
| Header at 375 | 124px, `scroll-margin-top` 172.5 — anchors clear it |
| Overflow | none at 375 or desktop; `[style]` count 0, so no CSP-blocked styles |
| Tap targets | nav/wordmark/sort/filter/header-search 40, button 44 |
| `.detail-btn` | box 15px, `::after` **40px** (inset `6.25px 0 -33.75px`) |
| Filter font | 16px — no iOS zoom |

### Exercised, not read

- **Sorting**: 5 `[data-sortable]` tables, `aria-sort` follows every click; the
  4- and 3-row tables genuinely reverse (first-row-only comparison had said
  otherwise — the probe was wrong, not the site).
- **Projects filter**: `python` 3 of 10, `zzzzzz` states the way out, cleared → 10.
- **Certificate filters**: 1 of 7 visible matches its sentence; Reset restores 7
  and the resting wording.
- **View modes**: 82 / 75 / 68 rows, exclusive `aria-pressed`, `?view=` written,
  Everything restores. *Not a toggle* — clicking the active chip keeps it, and
  Everything is the way back.
- **Nav empty-marking**: driving Certificates to zero sets `data-empty` and adds
  " — nothing to show here right now" as `.sr-only`.
- **Scrollspy**: nav `aria-current` and the `NN / 08` readout track together;
  above the first section it shows `— / 08` rather than faking `01`.
- **403 path**: names the cause, the 60/hour limit, the wait, the profile
  fallback, and offers Retry at 40px.
- **Poisoned cache**: `<img src=x onerror=alert(1)>` renders as text (0 `<img>`,
  0 `<script>`), `javascript:alert(1)` **and** `http://evil.example.com` both
  fall back to the profile URL, `name: 12345` coerces, `topics: 'not-an-array'`
  does not throw, and the poisoned topics never become Related edges — only
  `ok-topic` matched. No console errors.

The 403 and cache paths need `fetch` stubbed *before* `script.js` runs, which the
console cannot do. Used a throwaway copy in the scratchpad with a `stub.js`
injected ahead of `script.js`, served on its own port, then deleted. **Never add a
stub to the repo** — the fifth file rule, and a test stub that ships is a
disabled network call waiting to be forgotten.

Not exercised: no year empties Experience under a view mode, so that branch is
covered only by the identical Certificates case.

---

## Round: 2026-08-17, Batch B — evidence links, related repos

Served over HTTP, exercised on live API data. Chronology not built — see
[decisions-not-built.md](decisions-not-built.md).

### Palette row layout (fix)

`.search-what` is `display: block` so a content hit can stack source over match.
Command rows share the class, so every command wrapped onto two lines.

| | Before | After |
| --- | --- | --- |
| Marker and label | two rows | one row |
| Command row height | ~66px | **42px** (floor 40) |
| Gap after `›` | — | 8px |

Count line honest: says 17 commands, 17 buttons render. 16 on touch, unchanged.

### Evidence links

22 links, **0 dead** — every `href` resolves to a real id. 11 new ids: 4 on
`<tr>`, 4 on `<td>` (the name lives in column two), 1 on the Keysight subhead;
non-row phrases point at `#projects`; the two `—` cells stay plain.

| Target hidden by | Cleared | Said |
| --- | --- | --- |
| Year filter **and** closed fold | both | "Evidence for Project direction — Experience, opened the fold, cleared the Experience year filter." |
| Focus mode on another section | focus left | "…— Experience, left focus mode." |
| Nothing | — | "Evidence for Python — Projects." |

Bug found: caption read **"Evidence for Professional"**. `th[scope="row"]` in
Skills is the *category*, repeated down the group; the skill is the first `<td>`.

### Related repositories

Live data, `daily-history`: `tyunnie-pa — shares groq, resend` ·
`affannajiy.github.io — shares github-pages`. Most-shared first, then by name,
so two openings do not shuffle.

Both empty states fire and say different things — `Black-Caravan_DIM-Proj`
"No other repository shares these topics yet"; `algo-viewer`, `affannajiy`,
`CS_OOP-Algebro` "No topics on GitHub yet — tagging repositories is what links
them."

Swap `daily-history` → `tyunnie-pa` in place, no throw: `showModal()` on an open
dialog throws, so `show()` only opens when closed.

### Unmoved by both

| | |
| --- | --- |
| Résumé budget | **58 of ~59** — anchors add no text, so `readableText()` is byte-identical |
| Page overflow | 0 at 375, −15 at desktop |
| Console | no errors, no CSP violations |
| Skills row text | `Software Python Intermediate Keysight internship · …` — unchanged |
| Tap targets | `.related-btn` **40px**; `.ev-link` 15px, inline exemption ([accessibility.md](accessibility.md)) |

### Two traps worth naming

- **Browser disk-cached `script.js`.** Server sent 136,877 bytes, page ran
  133,006. Four rounds of "the handler is not attached" before checking. `?v=`
  on the HTML does not bust a subresource; loading over `127.0.0.1` instead of
  `localhost` does, being a separate origin.
- **Shortcuts install behind `(hover: hover)`.** After a resize to mobile they
  stay uninstalled until reload, so `/` did nothing and looked broken.

---

## Round: 2026-08-17, Batch A — palette, jump, focus mode

Eight features from a 60-item proposal, cut to what the docs and the content
could support. All exercised, not read.

### Palette

| Query | Result |
| --- | --- |
| *(empty)* | 17 commands, 0 hits — "Type to search this page, or pick one of these 17 commands." |
| `>` | Same 17, commands only |
| `recruiter` | 1 — "Switch to the Recruiter view" |
| `python` | 8 hits, 0 commands |
| `lang:python` | 1 — the one repo GitHub reports as Python |
| `year:2023` | 6 |
| `section:skills sql` | 2, both in Skills |
| `foo:bar` | 0 — "There is no filter named “foo” — that word was searched for literally." |
| `zzzzzzzz` | 0, way out named |

Commands built from the page: 8 nav jumps, focus, collapse-all, density, 3 view
modes, Build a PDF, View as JSON, Keyboard shortcuts. **16 on touch** — the
keyboard-reference button is hidden there, so the palette correctly does not
offer keys the device cannot press.

### Landing on the match

| Hidden by | Before | After | Said |
| --- | --- | --- | --- |
| Closed fold | `open: false` | `open: true` | "opened the fold" |
| Year filter 2023 | row hidden, **1** of 4 blocks | row visible, **4** blocks, chip → "All years" | "cleared the Experience year filter" |
| Recruiter view | row hidden | row visible, `body.className` empty | "switched out of the Recruiter view" |

Highlight: `CSS.highlights.get('search-hit-mark')` held **exactly one Range,
`"Oracle"`** — no `<mark>`, 0 `.hit-flash` nodes. Gone after 3s, nothing left.

### Focus mode

Focused: **1 of 8 sections**, masthead and fold bar gone, `?focus=about`, Exit
"Leave focus · About" at **40px**. Nav click re-targets to `?focus=skills`
instead of navigating to an unrendered section. `Esc` → 8 back, URL empty, Exit
hidden.

`f` at page top focuses About and toggles off. `g` then `f` does **nothing** —
chord consumed, not silently repurposed. `/`, `Ctrl+K`, `?` all still fire after
the search dialog has opened and closed.

**`?focus=<img onerror=1>` rejected**: 8 sections, 0 `.focus-target`, **0 `img`
nodes**, parameter dropped, leaving `?view=recruiter`.

### Print (`@media print` → `@media all`)

| State | Sections |
| --- | --- |
| Focused, screen | 1 |
| As printed | **8**, masthead back, header and jump note dropped |
| As printed, 2 unticked | **6** — `.print-hidden` outranks the reversal |
| Back to screen | 1, nothing leaked |

Budget: **58 of ~59, focused or not.**

### Nav marking

No view mode empties a section on this content, so view-mode-only scoping made
it unreachable — run from filters too. Certificates → 2024 + "Centre of Student
Development, UTP" (0 matches) marks it: `data-empty="true"`, **dotted**
underline, still a live link, `sr-only` "— nothing to show here right now".
Reset clears it.

### Everything else

| | 375px | 1280px |
| --- | --- | --- |
| Header expanded | **124px** | 46px |
| Header condensed | **42px** | — |
| `window.scrollX` after `scrollTo(500,0)` | 0 | 0 |
| `body.scrollWidth` / `clientWidth` | 375 / 375 | 1265 / 1265 |
| Inline styles, after exercising everything | 0 | 0 |

Contrast all ≥ 4.5:1 — header search **16.70**, focus exit **17.06**, readout
**5.05**, palette group **5.05**, command marker **5.05**, command label
**14.40**. Console clean apart from the colophon note.

### Bugs found

| Bug | Cost |
| --- | --- |
| **Search dialog had no visible trigger** — `/` and `Ctrl+K` install behind `(hover: hover)` | On a phone the whole feature was **unreachable**, not undiscovered. Found by asking where a recruiter would click |
| `.header-search` / `.focus-exit` set `display: flex`, overriding `hidden` | Rendered while claiming hidden; without JS, a Search button opening nothing |
| Third header child took mobile header 124px → **164px** | 40px of phone screen, and 40px on every `scroll-margin-top` |
| Empty query matched every index entry | Palette dumped all 112 page entries under the commands |
| `f` used `readingId` with no fallback; the palette had one | At page top — where a first-time reader is — the key silently did nothing |
| Jump wrapped its scroll in `requestAnimationFrame` | rAF never fires in a non-compositing tab, so a needless precaution became a way for the jump to never happen |
| Nav marking scoped to view modes alone | Correct and unreachable on this content |
| `documentElement.scrollWidth` reported −35px overflow on a page that cannot scroll sideways | **A measurement bug in this log, three rounds running.** Reports descendants unclipped by an intermediate `overflow-x: auto`. The recorded "−15 (scrollbar)" at 1280px was the same artifact |

---

## Round: 2026-08-17, empty blocks under the year filter

Filtering Experience to a year left every employer without a role in it as a
header row under its sub-heading. `syncEmptyBlocks()` collapses the pair.

| Year | Blocks standing (of 4) |
| --- | --- |
| All years | 4 |
| 2026 | 2 — Keysight, UTP |
| 2025 | 2 — UTP, MBOT |
| 2024 | 3 — UTP, MBOT, Pemuzik |
| 2023 | 1 — UTP |

"All years" restores all four.

**Both traps tested.** Collapsing the Experience fold then switching view mode —
which re-runs the sync while every row is invisible — left all four `shown`, and
reopening changed nothing; the check reads each row's own computed `display`,
which a closed `<details>` does not touch. View modes alone emptied no block, as
predicted: the one UTP row carrying `data-resume` is in no `data-hide-in`. 2023
**and** Recruiter together collapsed three, and reset cleanly.

**Print** with the year bar on 2023:

| State | Blocks |
| --- | --- |
| Screen, 2023 | 1 |
| As printed | **4** — filter reversed, block returns with its rows |
| As printed, résumé | 2 — MBOT and Pemuzik stay dropped, `.print-resume .resume-empty` outranks the reversal |
| Back to screen | 1, nothing leaked |

Budget unmoved: 58 with no filter, 58 on 2023, 58 on 2026. Zero inline styles
after exercising every chip. Console clean.

**Conflict found.** First build hid `.block-empty` on paper and taught the
budget to skip it — contradicting §4 of [printing.md](printing.md), and it would
have shipped a résumé quietly missing two affiliations. Caught by reading the
doc for the area being touched, which is what the `CLAUDE.md` routing table is
for.

---

## Round: 2026-08-14, UI/UX and security review

Whole page read against both rulebooks, then re-measured. All exercised.

### The injection, before and after

Poisoned the cache with a repo name of
`pwn" onmouseover="window.__XSS=1" data-x="`, API pointed at a 404 so the poison
rendered.

**Before:** live `onmouseover` on a real `<button>` — `hasAttribute` returned
`true`. `script-src 'self'` blocked execution, so the CSP held; the escaper did
not.

**After:** same poison plus a `javascript:` URL, `evil.example.com`, an
`<img onerror>` name, a `<b>` language, non-array `topics`, an 80-char topic, an
uppercase topic, a 20,000-char description, `fork: true`, `null`, a bare string,
an empty name, and 500 filler rows — 508 entries.

| Measured | Result |
| --- | --- |
| Rows rendered | 200 — `MAX_REPOS` held |
| `[onmouseover]`, `[onerror]`, `[onclick]` | 0 |
| `img` / `b` / `script` created | 0 |
| `window.__XSS` | never set |
| Link hosts | `github.com` only — both bad URLs fell back |
| Longest description | 300 chars — clamp held against 20,000 |
| Bad topics | dropped; `PYTHON` → `python`; 80-char slug dropped |
| Fork | excluded |
| Status line | named cache age **and** failure, with Retry |

**Self-healing, both paths.** Corrupt JSON: deleted next load, `getItem` → null.
Forged timestamp a year ahead: deleted next load, its row never rendered.

### Failure and rate limiting

`TIMEOUT_MS` set to 1: status read "Could not load repositories: GitHub did not
answer within 0.001 seconds…", `aria-busy` cleared, skeletons gone, Retry
present, colophon API row "Unreachable — …". Restored to 10000.

Retry twice inside cooldown: second became `Wait 3s`, `disabled: true`, returned
to `Retry` on its own.

### No JavaScript

`.no-js` forced: filter row, Projects status and table, both Projects hints,
certificate filters and status, export button and JSON button all
`display: none`. Projects table, certificates table and the fixed-PDF link still
rendered. `<noscript>` states what is missing and links the profile.

### Links that leave the page

34 carry `target="_blank"`; **34 of 34** carry "(opens in a new tab)" — 13 in
`index.html`, 21 from `externalLink()`. Marker contrast 4.96:1. Dropped in print.

### Text read back out

"linkedin" reads `LinkedIn · linkedin.com/in/affannajiy`, previously
`…affannajiy (opens in a new tab)Copy`. JSON Links table matches. JSON reports 8
sections, 14 tables.

### Tap targets

Two fixed: skip link 37px → **40px**, footer "Back to top" 17px → **40px**. The
three documented small controls keep their overlays, confirmed via CSSOM:
`.anchor-btn::before` 40px, `.detail-btn::after` 40px, `.copy-btn::after` 40px.

### Re-measured after the changes

| | 375px | 1280px |
| --- | --- | --- |
| Page overflow | 0 | −15 *(artifact — see the 2026-08-17 round)* |
| Inline styles | 0 | 0 |
| Repositories | 22 | 22 |
| Header | 124px → 42px condensed | — |
| `scroll-margin-top` | 172.5px → 67.5px | — |

Console clean. Zero offenders escaping `.table-wrap`. `.filter-input` 16px.
Keyboard reference hidden on touch; 4 scroll hints at 375px.

**Exercised:** sort (`aria-sort` follows, first row `ADS-academic`); filter (4 of
22 for "python"); empty result; repo dialog (5 rows, resolved `github.com` URL);
comparison (3 columns, 7 rows, **"Clear selection" now works** — it previously
had no handler at all); static sort on Education; certificate filters (1 of 7 →
7); year bar (9 of 15 for 2025); topic chips; collapse-all (8 → 0 → 8); density;
all three view modes.

**View modes** by non-null `offsetParent`: **88 full, 81 recruiter, 74 developer.**

**Keyboard survives the killer path:** after opening and closing search, `?`,
`/`, `Ctrl+K` and `g p` all still fire.

**Print:** budget "About 58 lines of the ~59 a page holds — fits on one page".
Export sets `print-resume`, 4 `.print-hidden`, 8 `.resume-empty`; `afterprint`
returns body class, both counts, fold state and filter to their starting values.

### Bugs found

| Bug | Severity |
| --- | --- |
| `escapeHTML()` left quotes unescaped — attribute injection, confirmed live | **High.** Only the CSP stopped execution |
| Cache accepted unbounded row counts and string lengths | DoS against render and layout |
| Cache accepted a forged future timestamp | Poison persisted past expiry, indefinitely |
| A failed cache entry was skipped but left in place | Re-parsed and re-rejected every visit |
| No fetch timeout — a hang left "Loading…" up permanently | The status line lied |
| No `<noscript>` | Same lie for every visitor with JS off |
| Compare dialog's "Clear selection" had no handler | A labelled control that did nothing |
| 13 external links opened new tabs unannounced | WCAG 3.2.5 |
| Skip link 37px, "Back to top" 17px | Under the 40px floor |
| `sr-only` notes and "Copy" leaked into search and JSON | Third occurrence of this family |

---

## Round: 2026-08-14, after the feature build

**Baseline.** 22 repos live; zero console errors, zero CSP violations; zero
inline styles at both widths including after exercising every control; no
horizontal overflow.

**Tap targets** at 375px: chips 40, filter selects 40, colophon summary 40, nav
44, filter 40. `.anchor-btn` / `.detail-btn` / `.copy-btn` are 16–17px boxes with
a 40px overlay — `.anchor-btn` uses `::before` because `::after` already carries
its "copied" text. Inline `.text-link`s stay below 40px: words, not controls.

**Contrast**, all ≥ 4.5:1: chip resting and pressed 17.92, language bar 5.25,
stat label 5.05, stat value 17.92, search kicker 5.05, search body 14.40,
colophon note 5.05, anchor 5.05, detail 5.35, view label 5.05, ASCII 15.27,
featured language 5.35, featured description 15.27.

**Exercised:** Education static sort both ways with `aria-sort` following;
certificate filters narrow, count, and state the way out; topic chips write
`?topic=python` and "All topics" clears to a bare URL; year bar 15 → 9 for 2025;
all eight `g` chords, `?`, `/`, `Ctrl+K` fire and all stand down in a field or
behind a dialog; repo dialog opens from cached fields with no second API call;
comparison selects, compares, clears; JSON reads back 8 sections and 14 tables.

**Security** re-run after adding `topics` to the cache. Poisoned with
`javascript:` URLs, `<img onerror>` name, `<b>` language, non-array `topics`,
over-long and uppercase topic slugs, `null`, a bare string, an empty name; API
at 404. Result: three valid rows survived, rest dropped; zero `img`/`script`/`b`
nodes; both bad URLs fell back to the profile; bad topics dropped, `PYTHON` →
`python`; status line named cache age and failure, with Retry.

**Header** at 375px: **123.8px → 41.6px condensed**, `scroll-margin-top`
following 172.5px → 67.5px. All eight nav items scroll clear of the edge fade;
the marked item auto-scrolls into view. At 1280px 45.6px in both states and the
nav still wraps — condensed styles are mobile-only. No feature this round added
a nav destination; that was the point of folding the colophon into the footer.

**URL state:** `?q=python&sort=stars&dir=descending` written and restored; a
poisoned `?sort=<img onerror>&dir=javascript:` rejected and rewritten to
`?q=data`; default sort writes no query string.

**Print:** budget back under one page at **58 of ~59** after the `.hint` and
`.evidence` fixes; full record ~5 pages. Defaults still
`about/education/experience/skills` on. Applied and fully reverted — body class,
`.print-hidden` (4), `.resume-empty` (8), forced folds (8), Projects filter.
`.copy-btn` `display:none` in the print block, confirmed via CSSOM.

**View modes:** 88 full, 82 recruiter, 76 developer.

### Bugs found

Kept because each is a class of mistake that can recur.

| Bug | Cost |
| --- | --- |
| `estimateLines()` counted `.hint` paragraphs the print block hides | Budget over-reported by five lines |
| Closing the search dialog left focus in its input | **Every shortcut dead for the rest of the visit**, silently |
| `#` copy button's text leaked into `textContent` | Labels read `"About#"` in search, export checkboxes and JSON |
| Stale-cache failure stated the problem, offered no Retry | Reader left holding stale data, full reload the only way out |
| Featured list kept a stale entry after being hidden | Latent |
| `.anchor-btn` shipped at 16.8px | Under the 40px floor |
