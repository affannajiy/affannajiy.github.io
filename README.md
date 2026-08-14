# affannajiy.github.io

Personal portfolio. Plain HTML, CSS and JavaScript — no framework, no build step,
no dependencies. What is in the repo is exactly what the browser runs.

**Live:** https://affannajiy.github.io

Light mode only, by design. Sortable + filterable Projects table fed live from the
GitHub API. Content-Security-Policy locked to same-origin, keyboard skip link,
`aria-current` nav marker, and a Retry control on API failure.

---

## Files

| Path | What it is |
| --- | --- |
| `index.html` | Every section. All copy lives here. |
| `style.css` | All styling. Colour tokens at the top of the file. |
| `script.js` | Fetches repos from the GitHub API and fills the Projects table. |
| `assets/` | Static files. **Currently empty — see the résumé note below.** |
| `CLAUDE.md` | Hard constraints, and the index to everything below. Read before changing anything. |
| `docs/` | The reasons behind the rules — one file per area. Start at `docs/README.md`. |
| `docs/UI-UX_Rulebook.md` | General UI/UX reference. Not project-specific. |
| `docs/SECURITY_Rulebook.md` | General security reference. Not project-specific. |
| `.claude/launch.json` | Local dev-server config for Claude Code. |
| `.claude/skills/` | Skills Claude uses to work on this site — see below. |

---

## Run it locally

Any static file server works. The site *must* be served over HTTP — opening
`index.html` directly with `file://` breaks the GitHub API fetch (CORS).

```bash
python -m http.server 8123
```

Then open http://localhost:8123.

---

## Editing each section

### Masthead
The big name block at the top. Edit `.masthead-name`, `.masthead-role`, and the
four `<dt>`/`<dd>` pairs in `.masthead-meta` (Based in / Studying / Focus / Contact).

### About
Edit the `<p>` inside `<section id="about">` in `index.html`. That is all.

### Education, Experience, Skills
Plain tables in `index.html`, all filled from your résumé. Edit the `<tr>` rows
directly — one row per qualification, role or skill:

```html
<tr><th scope="row">Software</th><td>Python</td><td>Intermediate</td></tr>
```

Add, remove or reorder rows freely. Nothing else needs to change. Keep the
`<th scope="row">` on the first cell — screen readers use it to label the row.

### Résumé

**There is deliberately no PDF in this repo right now.** The original résumé
contained your phone number and, more importantly, two referees' full names,
personal mobile numbers and email addresses. Publishing that to GitHub Pages makes
it permanently crawlable — and it is their data, not yours to publish.

The file was moved out of the repo to:

```text
C:\Users\AFFAN\Documents\resume-PRIVATE-do-not-publish.pdf
```

The Résumé section currently offers a "Request the PDF by email" button instead,
and everything the résumé says is already on the page as HTML.

To publish a PDF later:

1. Make a **public version**: replace the References block with "References
   available on request", and remove your phone number.
2. Save it as `assets/resume.pdf` — check the real filename. Windows hides
   extensions, and the last one arrived as `resume.pdf.pdf`.
3. In `index.html`, swap the mailto button for:
   `<a class="button" href="assets/resume.pdf" download>Download résumé (PDF)</a>`

Never commit the private version.

### Projects
**Nothing to edit.** `script.js` calls
`https://api.github.com/users/affannajiy/repos?sort=updated&per_page=100`
on every page load and renders the result. Forks are filtered out.

To change what shows up, change the repos themselves on GitHub:

- **Add a project** → make the repo public.
- **Hide a project** → make it private, or archive it and add a filter in `script.js`.
- **Fix a description** → edit the repo's description on GitHub; the site picks it up on next load.

Rate limit is 60 requests/hour per IP (unauthenticated). Fine for normal traffic.
Never put a GitHub token in `script.js` — the file is public, and a committed token
is a leaked token.

Column headers sort the table (name, language, stars, updated). Click once to sort,
again to reverse. The filter box above the table matches name, description and
language as you type, and reports how many of the total matched. If the API fails,
the page says why, says what to do about it, and shows a **Retry** button.

### Colours
All colour tokens are CSS variables in the `:root` block at the top of `style.css`.
Change a value once, it applies everywhere. Do not hardcode hex values further down.

The site is **light mode only** on purpose — there is no dark theme and no toggle.

### Links
Edit the rows in `<section id="links">`. All three are real: email, GitHub and
LinkedIn. External links need `rel="noopener noreferrer"`.

### Content Security Policy
`index.html` carries a CSP allowing only this origin's own files plus
`api.github.com`. Practical consequences:

- **No inline `style="..."` attributes and no inline `<script>`.** They are blocked.
  Put widths and colours in `style.css`, behaviour in `script.js`.
- Adding a CDN script, a web font or an external image fails with a console error
  instead of silently working. That is the point.
- If something stops rendering, check DevTools → Console for a CSP message before
  assuming the CSS is wrong.

---

## Skills for Claude

`.claude/skills/` holds three skills so the procedures do not have to be
re-explained each session. Claude picks them up automatically; you can also
invoke one by name.

| Skill | What it does |
| --- | --- |
| `verify-site` | The full check after any edit — serves over HTTP, measures contrast, checks 375px/1280px, tap targets, page overflow, CSP console noise, and exercises sort/filter/Retry for real. |
| `edit-site-content` | How to add a section or table without breaking section numbering, the nav, the sticky-header offset or the CSP. Also lists what must never be published. |
| `deploy-site` | Push and Pages setup, the repo-name and visibility preconditions, and what each failure symptom actually means. |

They encode the traps that already caught us once: the CSP blocking inline
styles, the mobile header growing past `scroll-margin-top`, iOS zooming inputs
under 16px, and the preview pane's inability to scroll or paint.

---

## Deploying to GitHub Pages

Two preconditions, both already satisfied — but both are silent failures if they
ever change.

**1. The repo must be named exactly `affannajiy.github.io`.** ✅ done

This is a *user site*; the name is what makes it serve at the root domain. Any
other name serves at `affannajiy.github.io/<repo-name>/` instead.

> **The name that matters is the repo name on GitHub, not the folder on your
> laptop.** Renaming a local folder does nothing — GitHub never sees it.
> Check with `git remote -v`.

**2. The repo must be public.** ✅ done

Pages from a private repo requires a paid plan. A private repo is the usual
reason the Pages screen offers no branch, or the site 404s forever.

### One-time setup

**1. Push the site to the default branch**

```bash
git add -A && git commit -m "Add portfolio site" && git push origin master
```

**2. Turn Pages on**

Push **first**, then enable Pages — enabling it with nothing pushed gives a 404
you then have to wait out, because there is no commit to build from.

GitHub → repo → **Settings** → **Pages**:

- **Source:** `Deploy from a branch`
- **Branch:** `master`, folder `/ (root)`
- **Save**

The branch dropdown must match the real default branch — this repo uses
`master`, not `main`. Confirm with `git branch --show-current`.

Wait 1–2 minutes. The Pages settings screen shows the live URL when it is ready.

### Every deploy after that

Just push. Pages rebuilds automatically.

```bash
git add -A && git commit -m "Update skills" && git push
```

Changes are usually live in under a minute.

---

## Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| Site is at `affannajiy.github.io/<name>/` | Repo is not named `affannajiy.github.io`. Rename it. |
| Pages screen offers no branch | Repo is private (free plan), or nothing has been pushed yet. |
| Styles missing on the live site only | A case-wrong path. Pages is case-sensitive; Windows is not. |
| Projects table says "Failed to load repos" | Either offline, or you hit the 60/hr API rate limit. Wait an hour. |
| Projects table is empty locally but fine on GitHub | You opened `index.html` as a `file://` URL. Serve it over HTTP instead. |
| A style or script silently does nothing | CSP blocked it. Check DevTools → Console; move inline styles into `style.css`. |
| Pushed but the site did not change | Hard-refresh (`Ctrl+Shift+R`). Pages and the browser both cache. Check **Actions** for a failed deploy. |
| 404 on the whole site right after enabling Pages | Give it a few minutes on first deploy. Confirm the branch and `/ (root)` folder in Settings → Pages. |

---

## Deliberate non-goals

No build step. No npm. No framework. No analytics. No cookie banner.
If a change requires any of those, it is the wrong change — see `CLAUDE.md`.
