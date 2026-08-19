# Content rules

What may be written into the page, and how remote content is curated. Hardening
helpers: [security-posture.md](../../audit-untrusted-input/reference/security-posture.md).

---

## 1. The Projects list

| # | Rule |
| --- | --- |
| C1 | **The Projects list is never hardcoded.** It is fetched from the GitHub REST API at runtime, always. If the API is unreachable, show the failure in the table — do not fall back to a stale baked-in list. |
| C2 | The API is called **unauthenticated** (60 req/hr/IP). Acceptable for this traffic. Do not "fix" this with a token or a proxy backend. |
| C3 | Forks are filtered out. Everything else public is shown. Curate by changing repo visibility on GitHub, not by adding an allowlist here. |
| C4 | **Curation that is not a list lives in GitHub topics, never in an allowlist here.** The Selected-projects band takes repositories tagged `featured`; the topic chips are built from whatever topics the repositories actually carry, showing only those used more than once. With nothing tagged, the band and the chip row hide themselves. This is how C1 and C3 are kept while still allowing curation: tag on GitHub, the site follows. |

## 2. Unfinished content

**Placeholder content carries a visible `.hint` line**, so what is unfinished is
obvious. Remove the hint when the real content lands. **Never invent a URL or a
credential to fill a gap — leave it marked.**

## 3. Privacy of other people, and of Affan

| # | Rule |
| --- | --- |
| P1 | **No third-party contact details on the site or in `assets/`.** No phone numbers or email addresses belonging to anyone else — referees, signatories, committee members. A name and job title on a résumé or a certificate is acceptable: it is a matter of record and gives a stranger nothing to contact them with. A published PDF is permanently crawlable, so the test is whether the file hands someone a channel to reach a third party who never agreed to that. |
| P2 | **No personal phone number** in the page or in any committed file. Email is the public contact channel. |
| P3 | **Published PDFs live in `assets/`, named kebab-case, and are checked before committing.** A PDF is not just a link — its full text is extractable and crawlable. Run `pdftotext -layout <file> -` and read the output before adding one. Referee blocks, phone numbers and signatories' contact details are the usual finds. |

Standing instruction from Affan: the site is about showcasing him, so no
supervisor, referee or colleague is named as a contact.

## 4. Open items that need Affan, not code

- **Tag repositories on GitHub** with `featured` to light up the Selected
  projects band. Optionally `academic` / `coursework` for more topic chips —
  only topics used more than once get one.
- ~~**Certificate verification URLs.**~~ **Done 2026-08-17** — four of seven, from
  Coursera, DataCamp ×2 and LinkedIn Learning, beside the PDF in the same cell
  inside `.cert-verify`. The header changed `PDF` → `Record`: a header naming one
  of the two things under it misleads. The remaining three publish none, and the
  `.hint` now **states which**, rather than promising links that are coming.
  - **Tracking parameters are stripped from a supplied URL.** LinkedIn's share
    link carried `?trk=share_certificate` and a `lipi=` page-view token; the bare
    certificate path resolves on its own. Rule 1.6 says this page carries no
    trackers — pasting an issuer's is still carrying one.
  - **`.cert-verify` does not print.** Print emits `href` only for
    `^="assets"`, so on paper "Verify" would be a word with no destination — and
    a 100-character hash is not a URL anybody types. The separator sits inside
    the span so both leave together and the cell ends clean.
- **Keep the availability dates in "Currently seeking" current.**
- `assets/resume.pdf` still says the internship is ongoing.
