# Things deliberately not built

Recorded so they are not re-proposed as improvements. A suggestion here is not
"we forgot" — it is "we decided, and here is why".

Related: [FEATURES-suggestion.md](../../site-feature-map/reference/FEATURES-suggestion.md) — the 2026-08-14 round,
including what *was* built.

---

## Rejected on principle

| Thing | Why not |
| --- | --- |
| **Dark mode** / `color-scheme: light dark` / theme toggle | Affan's call: no. Light-only is deliberate — see [design-system.md](../../site-design-and-layout/reference/design-system.md). |
| **Named references, supervisor contact details** | Affan's call: the site is about showcasing him, not about contacting anyone else. Content rule P1 also blocks it. |
| **A GitHub token or a proxy backend** to raise the API rate limit | A token in a public repo is a leaked token; a backend is a build step and a dependency. |
| **Analytics of any kind** | Nothing here needs consent, and adding it would require a banner. |

## Rejected on cost

| Thing | Why not |
| --- | --- |
| **Hover-prefetch of the certificate PDFs** (the mcmaster.com behaviour) | `default-src 'none'` blocks `<link rel="prefetch">` for this origin's own files, and Chrome dropped `prefetch-src`, so it falls back to `default-src`. Buying it means `default-src 'self'` — downgrading the CSP from "nothing loads unless named" to "anything same-origin loads" — to speed up seven PDFs behind seven links. McMaster prefetches because it has thousands of pages behind a hover. **Not a trade worth making here.** |
| **Live sandbox / mock terminal** | Needs a backend; widening `connect-src` breaks the CSP rule and takes a runtime dependency. |
| **`curl /raw` plaintext endpoint** | Needs a fifth source file. The console-note half shipped instead. |
| **README in the repository dialog** | One API call per open against a 60/hour budget, rendering as a `<pre>` with no Markdown library. |
| **`og:image`** | The sharing card is text-only. An image would be a binary in `assets/` that silently goes stale the day a job title changes, and the card already carries the name and the role. The `og:` tags are read by the scraping service, not by the page, so none of them touch the CSP. |

## Rejected as security theatre

| Thing | Why not |
| --- | --- |
| **A JavaScript frame-buster** | `frame-ancestors` is ignored in a `<meta>` CSP and GitHub Pages sends no custom headers, so the site genuinely cannot forbid being framed. But there is no login, no session, no form and no state-changing control here — a clickjack has nothing to capture or trigger. A frame-buster would look like protection while protecting nothing, and would be quoted later as though the risk were handled. Accepted and documented in [security-posture.md](../../audit-untrusted-input/reference/security-posture.md) §1 instead. Revisit the day the page grows an action worth hijacking. |
| **A fixed `escapeHTML()`** | It *was* fixed, briefly, then deleted. Repairing the escaper would have left the same trap set for the next person to concatenate a string, and an escaper sitting in the file reads as permission to build HTML from remote data. Nodes are built instead — see [security-posture.md](../../audit-untrusted-input/reference/security-posture.md) §3. |
| **`lang="ms"` on institution names** | WCAG 3.1.2 exempts proper names, and "Universiti Teknologi PETRONAS" is a proper name in an English sentence. Tagging it would change how a screen reader pronounces a name its owner spells in Latin script anyway. Revisit if a genuine Malay *phrase* is ever added to the page. |

## Rejected from the 2026-08-17 sixty-feature proposal

Recorded in full in [feature-inventory.md](../../site-feature-map/reference/feature-inventory.md). The ones worth
naming here because they will be proposed again:

| Thing | Why not |
| --- | --- |
| **An "Archive" view mode** | Everything already shows everything. Building a fourth mode meant deciding which of Affan's rows count as "older extracurricular material" and marking them — a decision about his CV, not a feature, and he declined to tag it. |
| **Project maturity / Active-Dormant, job-target résumé profiles, skill first-use dates, technology chronology, what-changed "ENDED"** | Each needs a fact the page does not hold. Inferring them breaks the never-invent-content rule, and a wrong "first used 2023" is a wrong claim with Affan's name on it. Asked whether he would hand-tag `data-` attributes to make them honest, he declined. Revisit only if the tagging happens. |
| **A drawn node-link project graph** | Shared-topic adjacency shipped as text in the detail dialog instead. A picture needs a layout algorithm, geometry the CSP will not let JS set inline, and a text fallback for paper and screen readers — three costs to say what one sorted line says. |
| **A permanent "claimed by" column on Education, Experience and Certificates** | The reverse of the evidence links, always visible. A fourth column costs width at 375px and lines in the one-page résumé; the transient caption in `.jump-note` answers the same question at the moment it is asked, and disappears. |
| **A section minimap and a breadcrumb** | The sticky nav already marks the current section, so these are the third and fourth indicator of one fact. A single `04 / 08` readout shipped instead. |
| **Search filter chips and recent-search history** | Two rows of chrome in front of a dialog that currently opens clean, for what the `type:` prefix and the URL already do. History would also be the only reader-facing thing this site ever stored beyond density. |
| **Remembered scroll position, session restore** | Same argument as persisted fold state below. Filters are already remembered *better* — they are in the URL, so the state is shareable and the address bar says why the page looks the way it does. |

## Rejected from the 2026-08-17 AI security/UX review

Two models proposed ~80 items. Most were already built; these were **wrong**, and
will be proposed again because they sound right.

| Thing | Why not |
| --- | --- |
| **`frame-ancestors 'none'` in the CSP** | Ignored in a `<meta>` CSP — only a real response header carries it, and GitHub Pages sends none. Adding it looks like a control and is a comment. Same ruling as the frame-buster above. |
| **`Permissions-Policy` in a `<meta http-equiv>`** | Not a thing. Permissions-Policy is response-header-only; no browser reads it from markup. Would sit in `<head>` looking like hardening forever. |
| **`conic-gradient` pie chart built by writing `element.style`** | Breaks rule 1.8. The proposal argued it "does not violate the CSP" — true, and exactly the trap: the CSP does not block CSSOM writes, so this fails as a **silent** broken invariant instead of a loud one ([layout.md](../../site-design-and-layout/reference/layout.md) §4). Bars stay block characters. |
| **Commit-history activity heatmap** | One API call per repository against a 60/hour budget. |
| **Fuzzy search, `aria-activedescendant` combobox rewrite** | Not wrong, just not worth it yet. The parser and arrow-key walking already work; a rewrite risks the keyboard path for a small gain. Revisit if results ever outgrow one screen. |

Reopened instead: **claimed vs demonstrated skills**. It was rejected for needing
facts the page lacked — evidence became machine-readable on 2026-08-17, so
evidence *counts* are now derivable. Usage *dates* still are not, so the
technology chronology stays rejected.

## Rejected from the OWASP Secure Coding Practices audit (2026-08-17)

All 213 items of [SECURITY_Rulebook.md](../../../../docs/SECURITY_Rulebook.md) §2a walked. Four
changes shipped ([security-posture.md](../../audit-untrusted-input/reference/security-posture.md) §1, §2, §4, §7). These
three are real controls that are wrong *here*.

| Thing | Why not |
| --- | --- |
| **SRI (`integrity=`) on `style.css` and `script.js`** (SCP-204) | A build step wearing a hash. Every edit to either file would need the digest recomputed by hand, and a stale digest does not warn — the browser refuses the stylesheet or the script outright. Rule 1.2, and the failure mode is total. A same-origin file is already covered by whatever trust the HTML naming it has. |
| **`redirect: "error"` on the GitHub fetch** (SCP-10) | GitHub answers `301` for a renamed account, so this breaks the table the day Affan renames himself — a self-inflicted outage guarding a path `connect-src https://api.github.com` already closes, since CSP is checked on every redirect hop. |
| **`robots.txt` disallowing `docs/` and `.claude/`** (SCP-158) | Nothing to hide — the repo is public, so the crawler's copy discloses nothing new. Costs a fifth top-level file, which is how rule 1.4 erodes. |

Not rejected, just **not ours**: response headers (SCP-162), HSTS (SCP-143),
`nosniff`. Pages sends `nosniff` and `github.io` is HSTS-preloaded; neither is
configurable from the repo.

**Re-confirmed against a live Lighthouse run, 2026-08-17** (99 / 100 / 100 / 92,
CLS 0). Every item it flags is already on this page: `robots.txt` above, the
headers above, and minify / unused-CSS / unused-JS, which all want the build step
rule 1.2 forbids. **Nothing was changed for it.** A 92 bought with a fifth
top-level file is a worse repo with a rounder number.

## Rejected from the mobile-width round (2026-08-17)

| Thing | Why not |
| --- | --- |
| **Dropping columns on narrow screens** instead of stacking | Hidden data, the same reason the Stars column went. A table showing three of five columns with no control saying so reads as three being all there are. |
| **Stacking `#compare-table` too** | It is repositories against attributes. Stacked, each card holds one attribute across every repository and the comparison — the whole feature — is gone. It keeps its dialog's scroll. |
| **Reflowing the ASCII diagram** | Fixed-width art. Reflowed it is not a diagram. |
| **Un-scrolling the condensed nav strip** | It scrolls sideways deliberately, with a `mask-image` fade saying so ([layout.md](../../site-design-and-layout/reference/layout.md) §3). It is a control strip, not content, and the alternative is dropping destinations. |
| **Hiding `<thead>` unconditionally when stacked** | Takes sorting off every phone. Kept wherever it holds a `.sort-btn`. |
| **Hiding the "Keyboard shortcuts" button by width** | It is already gated on `(hover: hover)`, which is the honest test: a phone never sees it, and a laptop in a narrow window — a keyboard behind a small screen — still does. A `max-width` rule would break exactly that case. |

## Rejected because they would go stale or gate content

| Thing | Why not |
| --- | --- |
| **Hand-maintained activity log / "last updated" line** | Goes stale, and a stale freshness indicator is worse than none. `document.lastModified` does the honest version. |
| **Separate quick-facts strip** | The masthead `<dl>` already is one. A second would be duplication. |
| **Back-to-top control** | The sticky header already is one — the wordmark links to `#top` and every section link is a jump. |
| **Persisted fold state** | All folds open on load is the invariant; remembering a collapsed section would gate content behind a click the reader made once and does not remember making. |
| **Closed-by-default sections** | Same reason. The footer colophon is the one exception and it is not a section. |

## Worth doing, but not a build

- **Technical log / war stories.** A writing project. It needs Affan's material,
  not code.

## Rejected from the 2026-08-18 deploy-outage round

| Idea | Why not |
| --- | --- |
| Revert or force-push `v1.3.0` to trigger a fresh deploy | The commit never failed — it built twice and produced the artifact both times. A new hash meets the same wedged queue, and rewriting published history to work around a scheduler already cost a day on 2026-08-17. |
| Unpublish the site, then republish | The only "reset the source" control a user page has. It takes the live site down first, so a failed republish leaves it dark instead of stale. |
| Empty commit to force a rebuild | Puts a second, contentless commit on top of a release for no gain. One release per commit. |
| Mirror on Cloudflare Pages / Netlify now | Real redundancy, but a standing second host, second account and a DNS decision — furniture, for an event that is rare. Documented as the option if it is ever wanted; Cloudflare because it can serve static files with no build and no injected analytics. |
| Keep re-running the queued run | Revives the same orphaned record. `workflow_dispatch` is the actual lever, which is why the workflow file now exists. |
