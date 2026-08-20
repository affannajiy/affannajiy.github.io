# Content rules

What may go in the page, and how remote content is curated. Hardening helpers:
[security-posture.md](../../audit-untrusted-input/reference/security-posture.md).

## 1. The Projects list

| # | Rule |
| --- | --- |
| C1 | **Never hardcode the Projects list.** It is fetched from the GitHub REST API at runtime, always. If the API is unreachable, show the failure in the table. Do not fall back to a stale baked-in list. |
| C2 | The API is called **unauthenticated** (60 req/hr/IP). Fine for this traffic. Do not "fix" this with a token or a proxy backend. |
| C3 | Forks are filtered out. Everything else public is shown. Curate by changing repo visibility on GitHub, not by an allowlist here. |
| C4 | **Curation lives in GitHub topics, never in an allowlist here.** The Selected-projects band takes repositories tagged `featured`. The topic chips are built from the topics the repositories actually carry, and show only topics used more than once. With nothing tagged, the band and the chip row hide themselves. This keeps C1 and C3 and still allows curation: tag on GitHub, the site follows. |

## 1a. The name

**`‘Affan Najiy bin Rusdi`, and the leading character is U+2018.**

The mark is the *ayn* in the Arabic ʿAffān. It is part of the name, not a stray
quote, and **nobody may "fix" it away.** It reads as a typo to anyone who has not
met the convention, which is exactly why it is written down here.

U+2018 LEFT SINGLE QUOTATION MARK is the character, chosen 2026-08-20 because the
masthead and the footer already used it. U+02BF is the strictly correct ayn, and
was rejected: it is an uncommon glyph, and a fallback box would land on the name
itself. A straight ASCII `'` (U+0027) is not the character — it renders visibly
differently beside the masthead.

**One spelling, every surface.** Before the 2026-08-20 sweep the name rendered
four ways: U+2018 in the masthead and footer, U+0027 in the JSON export and the
`<title>`, and no mark at all in `og:site_name`, `og:title` and the meta
description — so a shared link card showed a different name from the page it
opened. All seven now agree. Grep before adding an eighth:

```bash
grep -rn "Affan Najiy" --include=*.html --include=*.js --include=*.css .
```

Note the byte, not just the glyph: `'` and `‘` look alike in a diff.

## 2. Unfinished content

**Placeholder content carries a visible `.hint` line**, so what is unfinished is
obvious. Remove the hint when the real content lands. **Never invent a URL or a
credential to fill a gap — leave it marked.**

## 3. Privacy of other people, and of Affan

| # | Rule |
| --- | --- |
| P1 | **No third-party contact details on the site or in `assets/`.** No phone numbers or email addresses belonging to referees, signatories or committee members. A name and job title on a résumé or certificate is fine: it is a matter of record and gives a stranger no way to contact them. A published PDF is permanently crawlable, so the test is whether the file hands someone a channel to a third party who never agreed to it. |
| P2 | **No personal phone number** in the page or any committed file. Email is the public contact channel. |
| P3 | **Published PDFs live in `assets/`, named kebab-case, and are checked before commit.** A PDF's full text is extractable and crawlable. Run `pdftotext -layout <file> -` and read the output before you add one. Referee blocks, phone numbers and signatories' contact details are the usual finds. |

Standing instruction from Affan: the site showcases him, so no supervisor,
referee or colleague is named as a contact.

## 4. Open items that need Affan, not code

- **Tag repositories on GitHub** with `featured` to light up the Selected
  projects band. Optionally `academic` / `coursework` for more topic chips. Only
  topics used more than once get one.
- ~~**Certificate verification URLs.**~~ **Done 2026-08-17** — four of seven
  (Coursera, DataCamp ×2, LinkedIn Learning), beside the PDF in the same cell
  inside `.cert-verify`. The header changed `PDF` → `Record`, because a header
  that names one of the two things under it misleads. The other three publish
  none, and the `.hint` now **states which**, instead of promising links.
  - **Strip tracking parameters from a supplied URL.** LinkedIn's share link
    carried `?trk=share_certificate` and a `lipi=` page-view token. The bare
    certificate path resolves on its own. Rule 1.6 says this page carries no
    trackers, and an issuer's tracker is still a tracker.
  - **`.cert-verify` does not print.** Print emits `href` only for `^="assets"`,
    so on paper "Verify" would be a word with no destination, and nobody types a
    100-character hash. The separator sits inside the span, so both leave
    together and the cell ends clean.
- **Keep the availability dates in "Currently seeking" current.**
- `assets/resume.pdf` still says the internship is ongoing.
