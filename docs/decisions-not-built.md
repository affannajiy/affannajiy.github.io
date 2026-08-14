# Things deliberately not built

Recorded so they are not re-proposed as improvements. If a suggestion appears
here, the answer is not "we forgot" — it is "we decided, and here is why".

Related: [FEATURES-suggestion.md](FEATURES-suggestion.md) for the full record of
the 2026-08-14 feature round, including everything that *was* built.

---

## Rejected on principle

| Thing | Why not |
| --- | --- |
| **Dark mode** / `color-scheme: light dark` / theme toggle | Affan's call: no. Light-only is deliberate — see [design-system.md](design-system.md). |
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
| **A JavaScript frame-buster** | `frame-ancestors` is ignored in a `<meta>` CSP and GitHub Pages sends no custom headers, so the site genuinely cannot forbid being framed. But there is no login, no session, no form and no state-changing control here — a clickjack has nothing to capture or trigger. A frame-buster would look like protection while protecting nothing, and would be quoted later as though the risk were handled. Accepted and documented in [security-posture.md](security-posture.md) §1 instead. Revisit the day the page grows an action worth hijacking. |
| **A fixed `escapeHTML()`** | It *was* fixed, briefly, then deleted. Repairing the escaper would have left the same trap set for the next person to concatenate a string, and an escaper sitting in the file reads as permission to build HTML from remote data. Nodes are built instead — see [security-posture.md](security-posture.md) §3. |
| **`lang="ms"` on institution names** | WCAG 3.1.2 exempts proper names, and "Universiti Teknologi PETRONAS" is a proper name in an English sentence. Tagging it would change how a screen reader pronounces a name its owner spells in Latin script anyway. Revisit if a genuine Malay *phrase* is ever added to the page. |

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
