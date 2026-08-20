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

All 213 items of the OWASP Secure Coding Practices checklist walked against the
source. That list was §2a of [SECURITY_Rulebook.md](../../../../rulebooks/SECURITY_Rulebook.md) until
2026-08-20 and is now replaced there by ASVS 5.0. Four changes, three rejections
([decisions-not-built.md](../../site-feature-map/reference/decisions-not-built.md)), and a written statement of
which categories are *not applicable* rather than passed
([security-posture.md](../../audit-untrusted-input/reference/security-posture.md) §7).

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
them. Three suggestions refused — see [decisions-not-built.md](../../site-feature-map/reference/decisions-not-built.md).

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
[decisions-not-built.md](../../site-feature-map/reference/decisions-not-built.md).

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
| Tap targets | `.related-btn` **40px**; `.ev-link` 15px, inline exemption ([accessibility.md](../../check-accessibility/reference/accessibility.md)) |

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
budget to skip it — contradicting §4 of [printing.md](../../verify-print/reference/printing.md), and it would
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

## 2026-08-18 — rulebook sweep before v1.3.2

Measured at 375px and 1280px, served over HTTP from a **fresh port** (see the
stale-subresource note below).

| Check | 375px | 1280px |
| --- | --- | --- |
| `#compare-dialog` hint, table empty | `hidden`, `display: none` | `display: none` |
| `#compare-dialog` hint, table overflowing | visible, `display: block` | `display: none` |
| `.table-wrap` when overflowing | `tabindex="0"`, `role="region"` | — |
| ASCII diagram hint (its wrap overflows) | visible, unaffected by the table gate | `display: none` |
| Page horizontal overflow | false | false |
| Console errors | none | none |

**Regression found and fixed in the same round.** The first implementation looked
the hint up with `wrap.parentNode.querySelector(":scope > .scroll-hint")`. The
ASCII diagram's hint shares a parent with the Skills table, so once that table
stopped overflowing the diagram's hint was hidden while the diagram still
scrolled — the exact failure the fix existed to prevent, moved one element to the
left. Now `wrap.previousElementSibling`.

**Stale `script.js` across a reload, not just `style.css`.** `location.reload()`
and a forced navigation both kept serving the old `script.js` from the pane's
cache; `curl` against the same server returned the new file. The tell was that
`tabindex` was still being set (old code does that too) while the new `hidden`
logic never ran — behaviour that exists in both versions cannot distinguish them.
Fixed by serving from a **different port**, which is a different cache key.
`.claude/launch.json` now carries a `portfolio-alt` config for this.

## 2026-08-20 — résumé content refresh

Content-only round: new résumé folded into About, Education, Experience and
Interests. No colour, control or animation changed, so contrast was not
re-measured.

| Check | Result |
| --- | --- |
| Site-owned inline styles (`[style]`) | 0 |
| Console errors | none |
| Projects rows from live API | 10 |
| Page horizontal overflow @375px | false |
| Header height / `scroll-margin-top` @375px | 124px / 172.5px — clears |
| Tap targets @375px | nav 40, wordmark 40, button 44, sort 40, filter 40 |
| `.filter-input` font size | 16px |
| `.table-wrap` overflowing @375px | 0 |
| Sort, filter, empty-filter status | each exercised, each stated in words |
| Print apply/revert on cancel | fully reverted |

### The résumé budget has no headroom left

**Before adding a `[data-resume]` string, measure the budget — do not eyeball it.**
The one-page résumé was already sitting at **exactly 59 of ~59 lines** before this
round. Rewriting the Keysight Highlights cell from 118 to 258 characters pushed it
to **60 lines — roughly 2 pages**, which is a whole extra sheet bought by one cell.

Bisected the ceiling by swapping candidate strings into the cell and re-reading
`#export-budget`: **185 characters is the largest that still fits**; 258 does not.
The shipped cell is 185 and carries both achievements with both numbers.

The rule: any new or lengthened `[data-resume]` row now costs a page unless
something else is dropped. The estimate does say so in words when it spills, so
the failure is loud — but it is only loud in the export dialog, which nobody opens
while editing content.

### Follow-up the same day — internship length and the Sahom row

Two corrections from Affan after the round above.

**"Eight months", not seven.** The internship ran January to August 2026, so the
span is eight. Restored in all four places (About paragraph, the 2026 timeline
row, the Keysight detail list, the SSMS evidence cell). Character-neutral swap —
the budget did not move.

**Sahom Sejahtera starts May 2025, not June**, standardised against LinkedIn.
Dataran Sungai Dipang *is* in Kampung Sahom — the resume and the site were
describing the same place at different zoom levels, not disagreeing. The row now
names both, and carries the 40-tree figure the site had been missing.

Budget re-measured across four candidate strings for that cell: the shipped
278-character version holds at **59 of ~59**. Trimming the talk and the workshop
buys a line back (58) if a future row needs one.

## 2026-08-20 — Security rulebook sweep

Read `rulebooks/SECURITY_Rulebook.md` end to end and ran the whole
`audit-untrusted-input` round against it. **No code defect found.** Every guard
held on measurement, not on reading.

### Poisoned cache, API pinned to a 404

512 cache entries, twelve of them hostile. Measured:

| Check | Result |
| --- | --- |
| Rows rendered | **200** — capped at `MAX_REPOS` despite 512 entries |
| `[onmouseover]`/`[onerror]`/`[onclick]` in the table | **0** |
| `<img>`, `<b>` from remote strings | **0** |
| `window.__XSS` | **false** |
| Link hosts | `["github.com"]` alone — `javascript:` and `evil.example.com` both fell back |
| Longest description cell | **300** — clamp held against a 20,000-char field |
| Topics | over-long dropped, `PYTHON` folded to `python`, `'not-an-array'` dropped |
| Fork row | excluded |
| Status line | named the cache age **and** the 404, with Retry present |

### Cache self-heal

Corrupt JSON (`{not json`) → key `null` after reload. Forged `time` one year in
the future → key `null`, and `ghost` appears nowhere in `document.body`. Both
delete rather than skip.

### Poisoned URL

`?sort=<img onerror=alert(1)>&dir=javascript:&view=../../etc&topic=NOT_A_SLUG&focus=<script>`
— every one ignored, query string rewritten to empty. `q` clamps at `MAX_NAME`.

### Two things worth writing down

- **`connect-src` is doing real work.** A `fetch('/script.js')` from the console
  was blocked — the page cannot read its own origin over the network. That is
  the CSP working, not a bug, and it is why the API must be pinned by editing
  the file rather than by intercepting the request.
- **`/favicon.ico` 404s once per load.** Browser default probe, not a site
  request; `assets/favicon.svg` is declared and serves 200. Not a defect and not
  worth a fifth asset to silence.

### What was actually fixed — stale rulebook citations

The 2026-08-20 renumbering left **18 citations naming a real section that now
holds a different rule**, which is the exact trap `CLAUDE.md` §2 warns about.
Remapped by meaning, not by arithmetic:

| Was | Now | Rule |
| --- | --- | --- |
| `Security §2.9` (no escaper) | `§2b.3` | use the framework's encoder; a hand-written escape misses a case |
| `Security §2.9` (simplest impl) | `§1a.1` | economy of mechanism |
| `Security §3.6` (size/shape) | `§2a.3` | check type, length, range, format |
| `Security §2.4` (scheme/host) | `§2a.2`, `§2m.1` | allowlist |
| `Security §2.4` (topics dropped) | `§2a.2`, `§2a.5` | reject, do not repair |
| `Security §2.4` (defence in depth) | `§1b.4` | layer independent controls |
| `Security §2.4, §3.6` (`text()`) | `§2a.8`, `§2a.3` | another service's reply is input |
| `Security §3.5` (retry cooldown) | `§6.3` | rate limiting and quotas |
| `Security §2.12` (one boundary) | `§1a.1` | two mechanisms where one would do |
| `Security §1.7` (stated error) | `§2h.1` | handle every error path on purpose |
| `§3.4` (a failure needs a way out) | `§2h.1` | same |

Twelve in `script.js`, five in `SECURITY.md` §3 (`§2.3`→`§1b.11`,
`§3.2`→`§5b.6`, `§3.9/§3.10`→`§6.7/§6.8`, `§2.11`→`§1a.4`, `§3.2`→`§5b.2/§5b.7`),
one in `security-posture.md`. `SECURITY.md` also cited **`rule 2.2`** twice for
the unauthenticated-API trade; `CLAUDE.md` has no rule 2.2 — the rule is **1.5**,
no secrets in the repo.

UI-UX citations were checked and left alone: `§1.N` still resolves to Nielsen
heuristic N and `§2.4` to the Gestalt list, so that scheme did not move.

### Gaps re-checked against the rulebook and left accepted

`frame-ancestors` (§5) is ignored in a `<meta>` CSP and Pages sets no headers —
already `SECURITY.md` §3.1, and a JS frame-buster is still the wrong answer.
Actions pinned by tag not digest (§5b.2, §5b.7) — already §3.8, all three
first-party, workflow scoped `contents: read` / `pages: write` / `id-token: write`.
Neither changed; both now cite the right section.

### Regression round after the edits

Comments and prose only, no behaviour touched. Re-verified anyway: 10 live
repos, 0 site-owned inline styles, 0 page overflow at 375px and desktop, console
clean apart from the favicon probe, `grep -c TESTFAIL script.js` = 0.

## 2026-08-20 — Engineering rulebook sweep

Read `rulebooks/ENGINEERING_Rulebook.md` and scanned §1 (failure modes) against
the code. Two hits, both fixed. Everything else in §1 either does not apply or is
a constraint the project chose on purpose.

### §1.13 copy-paste divergence — three clipboards, two holes

Three controls copy something: the address buttons (`.copy-btn`), the JSON
dialog (`#json-copy`), and the section anchors (`.anchor-btn`). Each was its own
implementation of the same four steps — feature-detect, write, confirm, revert
after 2500ms. They had already drifted, and **each copy had lost a different
half of the confirmation**:

| Control | Visible on success | Announced | Visible on failure | Announced on failure |
| --- | --- | --- | --- | --- |
| Address buttons | "Copied" | yes | "Press Ctrl+C" | yes |
| **JSON dialog** | "Copied" | **none — no `role="status"` node at all** | "Press Ctrl+C" | **none** |
| **Section anchor** | ` copied` via CSS | yes | **nothing at all** | yes |

So a screen-reader user copied the JSON in silence, and a sighted reader whose
clipboard permission was denied clicked an anchor and saw the button do
**nothing** — a failed copy and a working one were indistinguishable.

Neither hole is visible while reading one call site. That is the argument for
the rule: one idea, three implementations, and the bug lives in the difference.

**Fixed** by one path — `canCopy()`, `copyStatusNode()`, `attachCopy()` — with
`COPY_RESET_MS` replacing three copies of `2500`. Every copy control now says
the result in words on screen **and** announces it, and both halves revert
together. `.anchor-btn.is-failed::after { content: " press Ctrl+C" }` is the
visible half the anchor never had; `--muted`, not a red, because nothing is
lost — the address is still on screen to select by hand.

One behaviour deliberately added rather than preserved: `canCopy()` is
re-checked **per click**, not once at wiring time. A permission can be revoked
while the page is open, and the old code would then have done nothing silently.

Measured on 8125 (8123 was serving a stale `style.css` — the documented preview
quirk; a second port is the cheapest way past it):

| Path | Result |
| --- | --- |
| Anchor, clipboard denied | `class="anchor-btn is-failed"`, `::after` = `" press Ctrl+C"`, announced "Could not copy the link." |
| Anchor, revert after 2.7s | class gone, `::after` = `none`, announcer emptied |
| Anchor, clipboard stubbed OK | `is-done`, `::after` = `" copied"`, announced |
| Address button, denied | "Press Ctrl+C" + full announcement |
| Address button, OK | "Copied", announced, wrote the right address |
| **JSON copy, OK** | "Copied" **and** "The JSON is on the clipboard." — the hole is closed |

Tap targets unchanged: `.anchor-btn` is 40px directly, `.copy-btn` is a 20px box
with a 40px absolute `::after` overlay. `getBoundingClientRect()` on the button
reads 20 and is the wrong thing to measure — check the pseudo.

### §1.14 lava flow — `slim()`

`function slim(list) { return narrow(list); }`, one caller, and that caller
passed a list `narrow()` had already returned. A half-finished migration held in
place by a name that still read as though it did something: every cache write
narrowed an already-narrowed list a second time. Deleted; `writeCache` stores
what it is given. The comment explaining *why* the cache is slim was kept — that
part was still true and is the reason nobody deleted the function.

Cache shape confirmed identical after removal: 10 rows, the same 8 narrowed
fields, 3,269 bytes, no forks.

### Considered and left alone

- **`script.js` is 3,900 lines in one IIFE** — reads as §1.1 god object, but
  rule 1.4 fixes the file count at four. Forced by a constraint, not a drift.
- **No tests (§3.16–§3.20)** — no build step, so no runner. The
  `verify-site` / `audit-untrusted-input` skills are the test suite, run by hand
  and written down here.
- **§4.9 configuration in the environment** — `API_URL` is in the source because
  there is one environment and no build to inject anything.

### Regression round

Console clean. 0 site-owned inline styles. 0 page overflow at 375px and 1280px.
Poison round re-run because the cache write path changed: `injected` 0, `imgs`
0, `xssRan` false, hosts `["github.com"]` alone, live API repopulated 10 narrowed
rows. No print impact — `.copy-btn` and `.anchor-btn` are already hidden on
paper, and the new announcer is `.sr-only`.

## 2026-08-20 — UI/UX rulebook sweep

Ran `rulebooks/UI-UX_Rulebook.md` against the page, measuring the pass/fail
sections (§4, §5, §7) rather than reading them. Four criteria had never been
checked here at all. Three passed. One failed badly.

### Passed, first time measured

| Criterion | Result |
| --- | --- |
| **1.4.10 reflow at 320px** | 0 page overflow, 0 elements past the viewport outside `.table-wrap` |
| **1.4.4 resize text 200%** | Root 15px → 32px, 0 overflow, 0 offenders |
| **1.4.12 text spacing** | line-height 1.5 / letter-spacing .12em / word-spacing .16em / para 2em forced — 0 clipped blocks, 0 overflow |
| **2.4.11 focus not obscured** | 129 focusable elements in `main`, each focused in turn and tested against the sticky header's rect. 1 hit, and it is the header's own Search button at `top: 0`. No real obstruction — the browser honours `scroll-margin-top` when it scrolls a focused element into view |

Also confirmed: line spacing 24.8px on 16px = **1.55**, over the 1.5 floor
(§6.11), and no justified body text (§6.12).

### Failed — §6.10 line length  *(fix reverted the same day, see below)*

Every prose block on the page ran **far past the 80-character ceiling** at
1280px:

| Element | Measured | Ceiling |
| --- | --- | --- |
| Bare `<p>` in `.section-body` (About ×3, Résumé ×1) | **108ch** | 80 |
| `.note` (Dean's List line) | **120ch** | 80 |
| `.hint` ×7 | **144ch** | 80 |

The rule in `style.css` said the 1000px column bounded the line at "roughly
105ch at 1280px" and treated that as the reason no second cap was needed. 105ch
was never a bound — it is 1.3× the ceiling, and the real number was worse.

**Fixed** at **65ch**, which is not a new number: `.status[data-state="error"]`
already used it, so the site had picked its measure and applied it to exactly
one element. After: **max 65ch, 0 blocks over 80**, across all 11 visible prose
blocks. At 320px they read 46ch. `.resume-actions` still 108ch — untouched,
which is the point.

Two traps, both hit on the way:

- **Specificity.** A bare `.hint` is (0,1,0) and loses to
  `.section-body p { max-width: 100% }` at (0,1,1). The first version capped the
  unclassed paragraphs and left `.hint` — **the widest lines on the page** — at
  144ch, while a naive check of "did the rule apply" said yes. Every selector
  now carries the `.section-body` prefix for specificity, not for scope.
- **`:not([class])`** excludes `.resume-actions` and `.fold-controls`. Both are
  `<p>` inside a section body, both are rows of buttons, both squash at 65ch.

Scoped to `@media screen`. Print keeps `max-width: 100%`.

> **Reverted later the same day, on Affan's call.** The measurement stands — the
> lines really are 108–144ch — but the cap was the wrong answer *here*. The
> paragraphs on this page are short, so 65ch left them as a narrow strip beside a
> wide empty gutter, which reads worse than the long line does. `.section-body p`
> is back to `max-width: 100%` and the 1000px column is the only bound. The two
> traps above still apply to anyone who tries it again. Rulings carried into
> [layout.md](../../site-design-and-layout/reference/layout.md) §1 and
> [decisions-not-built.md](../../site-feature-map/reference/decisions-not-built.md).

### §5.12 safe area — added

No `env()` anywhere in the file. `main` and `.site-header` now take
`padding: 0 max(1.25rem, env(safe-area-inset-right)) 0 max(1.25rem, env(safe-area-inset-left))`,
and the meta viewport gained `viewport-fit=cover` — without that half iOS
letterboxes the page and `env()` reports 0. `max()` rather than an addition, so
a device with no cutout is unchanged: measured 20px left and right at 1280px,
15px at 320px, exactly as before.

### §1.1 / §7b.7 — the status line could state a wrong total

`per_page=100` is the largest page the GitHub REST API returns and there is no
second request, so a 101st repository would never arrive. The status line said
"N public repositories" regardless — presenting the first page as the whole
list. Not reachable today at 10 repos; a silent lie the day it is.

`PER_PAGE` is now named (it was an inline `100` in the URL string), `truncated`
is set from `data.length >= PER_PAGE` **before** `narrow()` drops the forks —
the page limit applies to what GitHub sent, not to what survived — and it rides
in the cache, coerced back with `=== true` like everything else read out of
`localStorage`.

Verified against a 100-row cache with `truncated: true` and the API pinned to a
404: **"The 100 most recently updated of a longer list, live from the GitHub
API, sorted by name, descending."** The filtered variant is unchanged
("Showing 11 of 100 …"), because there the count already has a stated reason.

### Print

Budget re-read: **"About 59 lines of the ~59 a page holds — fits on one page."**
Unmoved. Table edges all drawn at 0.8px (last `th`, last `td`, last row);
`.copy-btn` and `.anchor-btn` both `display: none` on paper. `@media print`
restored after each flip.

Note for next time: flipping `@media print` to `all` does **not** switch the
screen rules off, so a `@media screen` cap still reads as present in that
measurement. It cannot reach paper by construction — `screen` never matches when
printing — and the flip cannot show that. Do not chase it.

### Regression

320px / 375px / 1280px: 0 overflow at each. 0 site-owned inline styles. Console
clean. Copy controls from the engineering round still behave.

Port note: 8123 was serving a `style.css` from before the round and produced
three misleading readings before it was spotted. A second port is the fix, not a
reload.

---

## 2026-08-20 — prose measure reverted, skill docs revised

Two changes, neither measured against a new criterion.

### The 65ch prose cap is out

Affan's call after seeing it: body prose runs the full content column again.
`.section-body p` is `max-width: 100%`, the `@media screen` block that capped
`> p:not([class])`, `p.hint` and `p.note` at 65ch is deleted, and the comment now
records why the cap is not coming back. Nothing else in the file moved. The
`65ch` on `.status[data-state="error"]` is untouched — that one predates the
round and is a different element.

### Prose justified above 640px

Affan's call, after the revert above. `.section-body > p:not([class])`,
`.section-body p.note` and `.colophon-note` take `text-align: justify` plus
`hyphens: auto`, inside `@media screen and (min-width: 641px)`.
`.colophon-note` was already justified and unhyphenated before this round, so it
was folded into the same block rather than left as a second answer to the same
question.

Measured word-space width, against a 4.17px natural space at 15px Arial:

| Viewport | State | Widest space | Stretch |
| --- | --- | --- | --- |
| 1280px | justify + hyphens | **5.98px** | 1.43x — mild |
| 320px | justify + hyphens, **no width gate** | **27.75px** | **6.6x — holes** |
| 320px | gated, ragged-right | 4.19px | 1.00x |

**The width gate is the finding.** Justify was applied at every width first, and
1280px measured fine, so it looked done. A narrow column has fewer word spaces per
line to absorb the same slack, so it degrades far worse than a wide one — the
opposite of the intuition that a short line is easier to set. 641px is the
complement of the site's single 640px breakpoint.

Confirmed after: prose and `.note` and `.colophon-note` all `justify` / `auto` at
1280px; all `start` / `manual` at 375px and 320px. `.hint`, `.resume-actions` and
`.fold-controls` untouched at every width.

Regression: 0 page overflow at 320 / 375 / 1280 (`scrollX` 0 after
`scrollTo(500,0)`), 0 inline styles, console clean, header 124px against
`scroll-margin-top` 172.5px, filter font 16px, Projects live at 10 rows. Résumé
budget re-read from the export dialog: **"About 59 lines of the ~59 a page holds
— fits on one page."** Unmoved, as expected — the rule is `@media screen`.

### The name normalised to one spelling

Affan shortened the `<title>` to `‘Affan Najiy`, which surfaced that the name
rendered **four ways** across the repo. The leading mark is the ayn in ʿAffān and
is deliberate — the masthead already carried it, so it was not touched.

| Was | Character | Where |
| --- | --- | --- |
| `‘Affan Najiy bin Rusdi` | U+2018 | masthead, footer |
| `'Affan Najiy bin Rusdi` | U+0027 | JSON export |
| `'Affan Najiy` | U+0027 | the new `<title>` |
| `Affan Najiy` | none | `og:site_name`, `og:title`, meta description |

The last row is the one that mattered: a shared link card named him differently
from the page it opened.

**Settled on U+2018 everywhere**, Affan's call — the character the masthead
already used. U+02BF is the strictly correct ayn and was rejected as an uncommon
glyph that risks a fallback box on the name itself. Seven occurrences now agree
(`index.html` ×6, `script.js`, `style.css` header comment).

`og:title` also dropped the role to match the shortened `<title>` exactly, so the
tab, the search headline and the shared card all say one thing. The role is still
a field in the JSON export, where it is data rather than a heading.

Verified: `document.characterSet` UTF-8, `<title>` and masthead both start
`U+2018`, `title === og:title`, JSON export parses and its `name` carries U+2018,
masthead prints at 26.67px carrying the mark, budget **"About 59 lines of the ~59
a page holds"** unmoved, 0 inline styles, console clean.

Worth knowing: the `<title>` is what a browser offers as the filename when
someone saves the page or prints to PDF, and some systems strip or substitute a
leading `‘`. Not a defect and nothing was changed for it — `assets/resume.pdf` is
the fixed-name copy for anywhere that matters.

### Every `.md` under `.claude/skills/` revised

24 files, rewritten for concision with `ste-writing`. Facts preserved. Four
things were **wrong**, not merely wordy, and are now corrected:

| File | Was | Now |
| --- | --- | --- |
| `edit-site-content/SKILL.md` | "Body prose is capped at `65ch` by `.section-body p`" | Full column, with the revert named |
| `edit-site-content/SKILL.md` | "seven items already make the header ~124px", `scroll-margin-top` "9rem" | Eight items, `11.5rem` — matches `style.css:1828` and layout.md §2 |
| `audit-untrusted-input/reference/security-posture.md` | `§2.4`, `§2.9`, `§3.5` | `§1b.4`, `§2b.3`, `§6.3` — the 2026-08-20 renumbering, same remap as `script.js` |
| `site-feature-map/reference/FEATURES-suggestion.md` | Certificate verification URLs listed as still needed, citing a "rule 2.5" that no longer exists | Marked done 2026-08-17, pointing at content-rules §4 |

Also: `tables.md` sections reordered to 1 / 1a / 1b / 2 / 3 / 4 (they ran 1, 1a,
2, 3, 1b, untitled), and long `.claude/skills/...` paths inside a skill replaced
with relative links.

No source file changed for this, so no verification round is owed. The CSS revert
above is covered by the regression numbers in the UI/UX round: it restores the
state those were taken against.
