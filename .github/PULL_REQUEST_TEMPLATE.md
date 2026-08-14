<!--
  Read CONTRIBUTING.md and CLAUDE.md before filling this in. CLAUDE.md is the
  invariants file: a change that breaks one of its rules gets closed with a
  pointer to the rule, so it is cheaper to check first than to rewrite after.
-->

## What this changes

<!-- One or two sentences. The diff shows what; say why. -->

## Why

<!-- The reason is the expensive thing to reconstruct a year from now. -->

---

## Invariants

- [ ] No framework, no build step, no new dependency — including CDN tags and web fonts.
- [ ] Still exactly four source files: `index.html`, `style.css`, `script.js`, `assets/`.
- [ ] No inline `style` attribute and no inline `<script>`; the CSP is unchanged and did not gain `unsafe-inline`.
- [ ] No analytics, tracker, cookie, or consent banner added.
- [ ] No secret, token, or API key committed.
- [ ] No third-party contact details added to the page or to `assets/`. If a PDF was added, `pdftotext -layout <file> -` was run and the output read.

## Verification

State what you measured. "Looks fine" is not a result.

- [ ] Served over HTTP (`python -m http.server 8123`), not `file://`.
- [ ] Console clean of site-owned errors.
- [ ] Checked at **375px** and **1280px**.
- [ ] Exercised the sort controls, the filter, and Retry — clicked, not read.
- [ ] No horizontal overflow at 375px (`scrollWidth === innerWidth`).
- [ ] Projects table still populates from the live API.
- [ ] Contrast re-measured, if any colour changed. (Floor: 4.5:1.)
- [ ] Both PDF formats still print, and the page is restored after a cancelled print — if anything printable was touched.

**Numbers:**

<!-- e.g. "header 123.8px → 41.6px at 375px; scrollWidth 375 = innerWidth 375;
     22 repos live; muted on cream 5.05:1" -->

## Screenshots

<!-- Only if something visual changed. Before and after, at one stated width. -->
