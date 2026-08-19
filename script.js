/* ─────────────────────────────────────────────────────────────
   Projects table + nav scrollspy.

   The Projects list is never hardcoded: it is fetched from the GitHub REST
   API on every load. If the API is unreachable the failure is shown in the
   table — there is no stale baked-in fallback to hide behind.
   ───────────────────────────────────────────────────────────── */

(function () {
  "use strict";

  /* First thing, before anything can fail. `.no-js` on <html> is what hides the
     controls that cannot work without this file; reaching this line is the only
     honest proof that it loaded and parsed. Do not move it below any other
     statement — a throw above it would leave the page claiming JavaScript is
     off, which at that point would be the truthful thing to claim anyway. */
  document.documentElement.classList.remove("no-js");

  var GITHUB_USER = "affannajiy";
  var API_URL =
    "https://api.github.com/users/" +
    GITHUB_USER +
    "/repos?sort=updated&per_page=100";

  var tbody    = document.getElementById("projects-body");
  var statusEl = document.getElementById("projects-status");
  var table    = document.getElementById("projects-table");
  var filterEl = document.getElementById("projects-filter");

  var repos = [];      // everything the API returned, minus forks
  var view  = [];      // what is currently rendered: filtered, then sorted
  var sortKey = "updated";
  var sortDir = "descending";
  var query = "";
  var topic = "";      // active topic chip, "" for all
  var viewMode = "";   // "", "recruiter" or "developer" — "" is the full page

  /* Declared up here with viewMode itself, not beside its first reader. Two
     things now name a mode in a sentence — the jump announcement and the
     certificate status — and the second runs during init, before the point
     where this used to be declared. `var` hoists the name but not the value, so
     the old position would have read undefined and thrown. */
  var VIEW_LABEL = { recruiter: "Recruiter", developer: "Developer" };
  var focusId = "";    // id of the one section focus mode is showing, "" for none
  var compare = [];    // repo names picked for the comparison table

  /* ── Helpers ─────────────────────────────────────────── */

  /* There is no escapeHTML() in this file any more, and that is the fix rather
     than an oversight.

     It used to be `div.textContent = v; return div.innerHTML`, which looks
     airtight and is not: the HTML serialiser escapes `&`, `<` and `>` in a text
     node but leaves quotes alone, because a text node has no attribute context
     to break out of. Every call site dropped the result straight into one. A
     repo name of `x" onmouseover="…` therefore closed the attribute and opened
     a new one — confirmed against a poisoned cache, which produced a live
     `onmouseover` attribute on a real button. `script-src 'self'` stopped the
     handler from running, which is defence in depth doing its job (Security
     §2.4), but a first layer that only holds because the second one caught it
     is not holding.

     Fixing the escaper would have left the same trap set for the next person to
     concatenate a string. Every remote value is now written through
     `textContent` and `setAttribute` on nodes built by hand, so there is no
     parser in the path and nothing to escape correctly (Security §2.9).

     THE RULE: never assemble HTML from remote data in this file. Build nodes.
     If you find yourself reaching for an escaper, you are on the wrong path. */

  /* Remote strings are also unbounded. A 5MB description in a poisoned cache is
     not an injection but it is still a denial of service against the layout and
     the render loop, so every field is cut to a length the column can hold
     (Security §3.6 — validate at the boundary, on size as well as on shape). */
  function clamp(value, max) {
    var s = text(value);
    return s.length > max ? s.slice(0, max) : s;
  }

  // Escaping stops a value breaking out of an attribute, but it does not stop
  // "javascript:..." being a valid href. Everything here is remote data, so the
  // scheme and host are checked rather than assumed (Security §3.6, §2.4).
  function safeRepoURL(value) {
    try {
      var url = new URL(String(value));
      if (url.protocol === "https:" && url.hostname === "github.com") {
        return url.href;
      }
    } catch (e) {
      /* falls through to the safe default below */
    }
    return "https://github.com/" + GITHUB_USER;
  }

  // Topics are remote data and arrive as an array of unknown contents. Anything
  // that is not a short, plain slug is dropped rather than escaped and shown:
  // a topic is a GitHub slug by definition, so a value that is not one is not a
  // topic (Security §2.4, §3.6).
  var TOPIC_RE = /^[a-z0-9][a-z0-9-]{0,34}$/;

  function safeTopics(value) {
    if (!Array.isArray(value)) return [];
    var out = [];
    for (var i = 0; i < value.length && out.length < 12; i++) {
      var t = text(value[i]).toLowerCase();
      if (TOPIC_RE.test(t) && out.indexOf(t) === -1) out.push(t);
    }
    return out;
  }

  /* ── Building nodes instead of strings ───────────────────
     Where remote data is rendered, the markup is now assembled as DOM nodes and
     the values go in through `textContent`. There is no parser involved, so
     there is no escaping to get right and no attribute to break out of — the
     whole class of bug the escaper above guards against cannot reach these
     paths at all (Security §2.9: the simplest correct implementation).

     The string builders remain where every value is written by this file, such
     as the skeleton rows. Escaping is still the rule for those. */
  function el(tag, className, textValue) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (textValue != null) node.textContent = textValue;
    return node;
  }

  function cell(tag, textValue, scope) {
    var node = el(tag, null, textValue);
    if (scope) node.setAttribute("scope", scope);
    return node;
  }

  /* Every link that leaves the page is built here, so the security attributes
     and the warning cannot be remembered in one place and forgotten in another.

     `rel="noopener noreferrer"` severs the `window.opener` handle and withholds
     the referrer. The visually hidden note is the other half: a link that
     replaces the reader's context without saying so takes control away from
     them (Nielsen §1.3), and a screen reader gets no warning at all from
     `target` on its own. */
  function externalLink(href, label, className) {
    var a = el("a", className || "text-link", label);
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.appendChild(el("span", "sr-only", " (opens in a new tab)"));
    return a;
  }

  function formatDate(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return "—";
    return d.toISOString().slice(0, 10);
  }

  function setStatus(text, state) {
    statusEl.textContent = text;
    if (state) statusEl.setAttribute("data-state", state);
    else statusEl.removeAttribute("data-state");
  }

  /* ── Reading text back out of the page ───────────────────
     The search index, the JSON view, the section labels and the résumé line
     estimate all read the rendered page back as plain text. None of them wants
     the *whole* string: `element.textContent` also collects the labels of
     controls sitting inside the content, and the screen-reader-only notes
     written for assistive tech alone.

     This has produced the same bug three times now — section names reading
     "About#" once the copy-link button existed, a row reading
     "linkedin.com/in/affannajiy (opens in a new tab)Copy" in both the search
     results and the exported JSON. The exclusion list lives here once, so a new
     control added to the page cannot be forgotten by four separate readers. */
  var NOT_CONTENT = ".sr-only, .anchor-btn, .copy-btn, .detail-btn, .qr-btn";

  function readableText(node) {
    if (!node) return "";
    // A clone, so stripping the controls does not remove them from the page.
    var copy = node.cloneNode(true);
    [].forEach.call(copy.querySelectorAll(NOT_CONTENT), function (junk) {
      junk.parentNode.removeChild(junk);
    });
    return copy.textContent.replace(/\s+/g, " ").trim();
  }

  /* The name of a section, for the export checkboxes, the search results and
     the JSON view — three places that must agree on what a section is called.
     The "01 — " index is stripped too, leaving the name a reader would say out
     loud. */
  function sectionLabel(section) {
    var title = section.querySelector(".section-title");
    if (!title) return section.id;
    return readableText(title).replace(/^\s*\d+\s*—\s*/, "").trim() || section.id;
  }

  /* ── The undo register ───────────────────────────────────
     Search can now land on a row that something is currently hiding — a closed
     fold, a year filter, a view mode. Landing on a hidden row is landing on
     nothing, so the jump clears whatever is in the way and says which control
     it touched.

     Filters register their own undo here rather than the jump hard-coding a
     list of them. A filter that forgets to register leaves its rows unjumpable,
     which shows up the first time anyone searches for one; a hard-coded list
     would instead go quietly out of date the day a fourth filter is added.

     `owns` answers "is this node mine to unhide", `active` answers "am I
     currently hiding anything", `undo` puts the control back to showing
     everything, and `name` is what the reader is told was changed. */
  var undoRegister = [];

  function registerUndo(name, owns, active, undo) {
    undoRegister.push({ name: name, owns: owns, active: active, undo: undo });
  }

  /* Assigned by initViewModes(). A view mode is not a filter — it is not
     reversed on paper and it is not in the register — but a jump still has to
     be able to step out of one, so it is reachable through this instead. */
  var leaveViewMode = null;

  /* Assigned by initFocusMode(). Same reasoning: focus mode hides more than any
     filter does, so a jump into a section that is not the focused one has to be
     able to let go of it. */
  var setFocusSection = null;

  /* Assigned by initSearch(), which owns the visible `.jump-note`. Anything that
     moves the page under the reader says so through this. A second status line
     would be a second thing to keep in sync and a second thing to time out. */
  var sayJump = null;

  /* The section the reader is currently in, kept up to date by the scrollspy.
     Read by whatever offers to focus "this" section and has to know which one
     that is. */
  var readingId = "";

  /* Above the first section the scrollspy correctly reports no section at all,
     and focusing nothing is not a thing anyone asked for. Falling back to the
     first section keeps both entry points working from the very top of the
     page — which is exactly where a reader who has never met focus mode is
     standing. One function, because the palette and the `f` key disagreeing
     about what "this section" means is the kind of bug nobody reports; they
     just decide the key is broken. */
  function sectionToFocus() {
    var here = document.getElementById(readingId) ||
               document.querySelector("main .section[id]");
    return here || null;
  }

  /* ── Loading state ───────────────────────────────────────
     Shape-matched skeleton rows rather than a spinner: they say what is
     coming, not merely that something is. */
  // Bar widths come from the stylesheet, not an inline style attribute: the
  // Content-Security-Policy forbids inline styles, and that is worth keeping.
  function renderSkeleton(rows) {
    tbody.textContent = "";
    var frag = document.createDocumentFragment();

    for (var r = 0; r < rows; r++) {
      var tr = el("tr", "skeleton-row");
      for (var c = 0; c < 4; c++) {
        var td = el("td");
        td.appendChild(el("span", "skeleton-bar"));
        tr.appendChild(td);
      }
      frag.appendChild(tr);
    }

    tbody.appendChild(frag);
  }

  /* ── Sorting ─────────────────────────────────────────── */

  // Every field is coerced before it is compared or lowercased. The data now
  // arrives from two places — the live API and the localStorage cache — and a
  // cache entry can be edited by anything with access to this origin. Neither
  // source is assumed to have typed its own fields (Security §2.4, §3.6).
  function text(value) {
    return value == null ? "" : String(value);
  }

  function valueFor(repo, key) {
    switch (key) {
      case "name":     return text(repo.name).toLowerCase();
      case "language": return text(repo.language).toLowerCase();
      case "updated":  return text(repo.updated_at);
      default:         return "";
    }
  }

  // Filter first, then sort what survived. Two filters compose: the typed query
  // and the selected topic. They are AND, not OR — a reader who picked "python"
  // and then typed "api" is narrowing, not widening.
  function applyFilter() {
    var q = query.trim().toLowerCase();

    view = repos.filter(function (r) {
      if (topic && safeTopics(r.topics).indexOf(topic) === -1) return false;
      if (!q) return true;
      return (
        text(r.name).toLowerCase().indexOf(q) !== -1 ||
        text(r.description).toLowerCase().indexOf(q) !== -1 ||
        text(r.language).toLowerCase().indexOf(q) !== -1 ||
        safeTopics(r.topics).join(" ").indexOf(q) !== -1
      );
    });
  }

  function sortRepos() {
    var dir = sortDir === "ascending" ? 1 : -1;
    view.sort(function (a, b) {
      var av = valueFor(a, sortKey);
      var bv = valueFor(b, sortKey);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      // Stable tiebreak so equal values never shuffle between sorts.
      return a.name.localeCompare(b.name);
    });
  }

  // aria-sort is the single source of truth: the CSS arrow is drawn from it,
  // so the visible state and the announced state cannot drift apart.
  function syncSortIndicators() {
    var headers = table.querySelectorAll("thead th[aria-sort]");
    for (var i = 0; i < headers.length; i++) {
      var btn = headers[i].querySelector(".sort-btn");
      var key = btn && btn.getAttribute("data-key");
      headers[i].setAttribute(
        "aria-sort",
        key === sortKey ? sortDir : "none"
      );
    }
  }

  /* ── Rendering ───────────────────────────────────────── */

  function emptyRow(message) {
    var tr = el("tr");
    var td = cell("td", message);
    td.colSpan = 4;
    tr.appendChild(td);
    return tr;
  }

  // Whatever replaces the skeleton — rows, an empty result or a failure — the
  // table has stopped being busy and must stop saying it is.
  function settled() {
    if (table) table.removeAttribute("aria-busy");
  }

  function renderRows() {
    settled();
    tbody.textContent = "";

    if (view.length === 0) {
      tbody.appendChild(
        emptyRow(
          query.trim()
            ? "No repositories match “" + query.trim() + "”."
            : "No repositories carry the topic “" + topic + "”."
        )
      );
      return;
    }

    // Built one node at a time into a fragment, then attached once — so the
    // remote values never pass through an HTML parser, and the table is still
    // touched a single time rather than once per row.
    var frag = document.createDocumentFragment();

    for (var i = 0; i < view.length; i++) {
      var r = view[i];
      var tr = el("tr");

      /* The language, as an attribute as well as a cell, so search's `lang:`
         prefix filters on what GitHub reported rather than on whether the word
         happens to appear in a description. text() has already narrowed it;
         setAttribute takes a string and parses nothing, so this is not a path
         remote data can escape from. */
      tr.setAttribute("data-lang", text(r.language));

      var nameCell = el("td");
      nameCell.appendChild(externalLink(safeRepoURL(r.html_url), text(r.name)));
      nameCell.appendChild(document.createTextNode(" "));

      // The link is the primary action and stays a link, so middle-click and
      // "copy link address" keep working. Details is a second, named
      // affordance rather than a hijacked click on the first.
      var btn = el("button", "detail-btn", "Details");
      btn.type = "button";
      btn.setAttribute("data-repo", text(r.name));
      nameCell.appendChild(btn);

      tr.appendChild(nameCell);
      tr.appendChild(cell("td", text(r.description) || "—"));
      tr.appendChild(cell("td", text(r.language) || "—"));
      tr.appendChild(cell("td", formatDate(r.updated_at)));
      frag.appendChild(tr);
    }

    tbody.appendChild(frag);
    labelCells(table);
    syncNavEmpty();
  }

  // One sentence covering count, both filters and sort — the whole state of the
  // table. Two filters can be active at once, so both have to be named, or the
  // count on screen has no stated reason for being what it is.
  function describeState() {
    if (repos.length === 0) return "No public repositories found.";

    var sortLabel = { name: "name", language: "language", updated: "last updated" }[sortKey];
    var direction = sortDir === "ascending" ? "ascending" : "descending";
    var sorted = ", sorted by " + sortLabel + ", " + direction + ".";

    var narrowed = [];
    if (query.trim()) narrowed.push("matching “" + query.trim() + "”");
    if (topic) narrowed.push("tagged “" + topic + "”");

    if (narrowed.length === 0) {
      return (
        repos.length +
        " public " +
        (repos.length === 1 ? "repository" : "repositories") +
        ", live from the GitHub API" + sorted +
        " Select a column header to sort."
      );
    }
    return (
      "Showing " + view.length + " of " + repos.length +
      " repositories " + narrowed.join(" and ") +
      (view.length === 0
        ? ". Clear the filter to see them all."
        : sorted)
    );
  }

  function refresh() {
    applyFilter();
    sortRepos();
    syncSortIndicators();
    renderRows();
    setStatus(describeState());
    syncTopicChips();
    syncURL();
  }

  function renderError(message) {
    settled();
    tbody.textContent = "";
    tbody.appendChild(emptyRow("Could not load repositories."));

    // State the fix, not just the fault (Rulebook §1.9) — and state the fix
    // that matches this failure. A rate-limit explanation attached to a
    // parsing error sends the reader to wait out a limit they never hit.
    var advice;
    if (/\b(403|429)\b/.test(message)) {
      advice =
        " This is the GitHub API hourly rate limit (60 requests per hour). " +
        "Wait a few minutes and retry";
    } else if (/\b(5\d\d)\b/.test(message)) {
      advice = " GitHub itself is having trouble. Retry in a few minutes";
    } else if (/shape|JSON|Unexpected token/i.test(message)) {
      advice =
        " The reply arrived but could not be read, which usually means a " +
        "network captive portal or proxy answered instead of GitHub. Retry";
    } else {
      advice = " Check your connection and retry";
    }

    setStatus(
      "Could not load repositories: " + message + "." + advice +
        ", or browse the profile directly at github.com/" + GITHUB_USER + ".",
      "error"
    );

    addRetry();
  }

  // Shared by both failure paths: the empty one, where the error is the whole
  // story, and the cached one, where it is a caveat on a table that still
  // reads. Both need the same way out.
  /* The unauthenticated API allows 60 requests an hour from one address, and a
     Retry button next to a rate-limit message is exactly the control a
     frustrated reader clicks repeatedly. A held-down retry can spend the rest
     of the hour's budget in seconds, which turns a wait into a lockout — so the
     button rate-limits itself (Security §3.5) and says why it is unavailable
     rather than going quietly grey (Nielsen §1.1). */
  var RETRY_COOLDOWN = 3000;
  var lastRetry = 0;

  function addRetry() {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "retry-btn";
    btn.textContent = "Retry";

    btn.addEventListener("click", function () {
      var wait = RETRY_COOLDOWN - (Date.now() - lastRetry);
      if (wait > 0) {
        btn.textContent = "Wait " + Math.ceil(wait / 1000) + "s";
        btn.disabled = true;
        window.setTimeout(function () {
          btn.disabled = false;
          btn.textContent = "Retry";
        }, wait);
        return;
      }
      lastRetry = Date.now();
      btn.disabled = true;
      btn.textContent = "Retrying…";
      loadProjects();
    });

    statusEl.appendChild(document.createElement("br"));
    statusEl.appendChild(btn);
  }

  /* ── Fetch ───────────────────────────────────────────── */

  /* Stale-while-revalidate.

     The list is still never hardcoded (rule 2.1) — this cache only ever holds
     a response the live API gave us on an earlier visit, and every visit still
     calls the API. What it removes is the wait: a returning reader sees the
     real table on first paint instead of skeleton rows for the length of a
     round trip.

     The rule that must not bend is the one about hiding failures. If the
     revalidation fails, the status line says so and names the age of what is
     on screen, so a stale table is never passed off as a fresh one. */
  var CACHE_KEY = "projects-cache-v1";
  var CACHE_MAX_AGE = 6 * 60 * 60 * 1000;   // 6 hours

  /* Both sources are bounded, not just checked for shape. A poisoned cache
     holding fifty thousand rows, or one row with a five-megabyte description,
     injects nothing — and still hangs the render and destroys the layout.
     Size is part of validating input (Security §3.6). */
  var MAX_REPOS = 200;
  var MAX_NAME = 100;
  var MAX_DESC = 300;
  var MAX_LANG = 40;

  function dropCache() {
    try { window.localStorage.removeItem(CACHE_KEY); } catch (err) { /* nothing to do */ }
  }

  /* The one place either source is turned into a row this file will render.
     Keeping it single means the cache cannot be validated more loosely than the
     API, which is exactly the drift Security §2.12 warns about. */
  function narrow(list) {
    var out = [];
    for (var i = 0; i < list.length && out.length < MAX_REPOS; i++) {
      var r = list[i];
      if (!r || typeof r !== "object" || r.fork) continue;

      var name = clamp(r.name, MAX_NAME);
      if (name === "") continue;

      out.push({
        name: name,
        description: clamp(r.description, MAX_DESC),
        language: clamp(r.language, MAX_LANG),
        updated_at: clamp(r.updated_at, 40),
        created_at: clamp(r.created_at, 40),
        topics: safeTopics(r.topics),
        html_url: safeRepoURL(r.html_url),
        fork: false
      });
    }
    return out;
  }

  function readCache() {
    try {
      var raw = window.localStorage.getItem(CACHE_KEY);
      if (!raw) return null;

      var parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.repos)) { dropCache(); return null; }

      // A timestamp is a number, and one in the future is not a timestamp this
      // page wrote. Without the upper bound a forged `time` of year 3000 pins a
      // poisoned cache permanently past its own expiry.
      var when = parsed.time;
      if (typeof when !== "number" || !isFinite(when) || when > Date.now() + 60000) {
        dropCache();
        return null;
      }
      if (Date.now() - when > CACHE_MAX_AGE) { dropCache(); return null; }

      // localStorage is writable by anything running on this origin, so what
      // comes back out is input, not state. Entries that are not plain objects
      // with a usable name are dropped rather than rendered; if that empties
      // the list, the cache is deleted and the API answers instead.
      parsed.repos = narrow(parsed.repos);
      if (parsed.repos.length === 0) { dropCache(); return null; }

      return parsed;
    } catch (err) {
      // Corrupt JSON is not something that fixes itself on the next visit, so
      // the bad entry goes rather than being re-parsed and re-rejected forever.
      dropCache();
      return null;                 // private mode, quota, or corrupt JSON
    }
  }

  /* The API returns roughly 80 fields per repo and the table renders six of
     them. Storing the raw payload costs ~116KB and a JSON.parse of the same
     size on every load — which is the wait we are trying to remove. Keeping
     only the rendered fields cuts it to a few KB. */
  function slim(list) {
    return narrow(list);          // already the rendered fields, already bounded
  }

  function writeCache(list) {
    try {
      window.localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ time: Date.now(), repos: slim(list) })
      );
    } catch (err) {
      /* Caching is an optimisation. Failing to cache is not a page error. */
    }
  }

  function describeAge(time) {
    var mins = Math.round((Date.now() - time) / 60000);
    if (mins < 1) return "moments ago";
    if (mins < 60) return mins + " minute" + (mins === 1 ? "" : "s") + " ago";
    var hrs = Math.round(mins / 60);
    return hrs + " hour" + (hrs === 1 ? "" : "s") + " ago";
  }

  function loadProjects() {
    var cached = readCache();

    if (cached) {
      repos = cached.repos;
      if (filterEl) filterEl.disabled = false;
      buildTopicChips();
      buildStats();
      buildFeatured();
      refresh();                                   // real table, no skeleton
      setStatus(
        repos.length +
          " public repositories, from a copy saved " +
          describeAge(cached.time) +
          ". Checking GitHub for changes…"
      );
    } else {
      setStatus("Loading repositories from GitHub…");
      renderSkeleton(6);
      // Skeleton rows are shaped like data, which is the point — and is exactly
      // why a screen reader must be told they are not data yet.
      if (table) table.setAttribute("aria-busy", "true");
    }

    /* A fetch with no deadline is not a slow fetch, it is a hang: the skeleton
       rows sit there and the status line goes on claiming the request is in
       flight, which is a lie the reader has no way to detect (Nielsen §1.1).
       Ten seconds, then it fails like any other failure and offers Retry. */
    var TIMEOUT_MS = 10000;
    var ctrl = typeof AbortController === "function" ? new AbortController() : null;
    var timedOut = false;
    var timer = window.setTimeout(function () {
      timedOut = true;
      if (ctrl) ctrl.abort();
    }, TIMEOUT_MS);

    /* The call is stated in full rather than left to defaults. `credentials`
       already defaults to same-origin, so no cookie was going to GitHub anyway
       — writing it down is what makes that a decision instead of a default
       somebody could change without noticing. `referrerPolicy` is the one that
       does new work: the meta policy sends this page's origin to every
       cross-origin request, and an API that needs no referrer should be told
       nothing (Rulebook §1.3 — least privilege applies to what you disclose,
       not only to what you can reach). */
    var options = {
      headers: { Accept: "application/vnd.github+json" },
      credentials: "omit",
      referrerPolicy: "no-referrer"
    };
    if (ctrl) options.signal = ctrl.signal;

    fetch(API_URL, options)
      .then(function (res) {
        window.clearTimeout(timer);
        if (!res.ok) {
          throw new Error("GitHub API responded " + res.status);
        }
        return res.json();
      })
      .then(function (data) {
        // The API is trusted to be GitHub, not trusted to be well-formed. An
        // object where an array was expected must fail as a stated error, not
        // as a TypeError three frames deeper (Security §1.7, §3.6).
        if (!Array.isArray(data)) {
          throw new Error("GitHub returned an unexpected response shape");
        }

        // Same boundary as the cache, deliberately. The API is the more trusted
        // of the two sources, but "more trusted" is not a shape check.
        repos = narrow(data);

        if (repos.length === 0) {
          settled();
          tbody.textContent = "";
          tbody.appendChild(emptyRow("No public repositories found."));
          setStatus("No public repositories found.");
          return;
        }

        writeCache(repos);
        if (filterEl) filterEl.disabled = false;
        setApiState("Operational — answered just now");
        buildTopicChips();
        buildStats();
        buildFeatured();
        refresh();
      })
      .catch(function (err) {
        window.clearTimeout(timer);

        // An abort reads as "AbortError" in the console and as nothing useful
        // to a reader. What actually happened is that GitHub did not answer, so
        // that is what the message says.
        // Bounded like every other string that reaches the DOM. This one is the
        // platform's, not GitHub's, so it is short in practice — but "in
        // practice" is not a length limit, and this is the only unclamped
        // string left on a path a reader can see.
        var message = timedOut
          ? "GitHub did not answer within " + TIMEOUT_MS / 1000 + " seconds"
          : clamp(err && err.message, 200) || "the request failed";

        setApiState("Unreachable — " + message);
        // With nothing on screen the failure is the whole story. With a cached
        // table on screen it is a caveat about that table — but it is still said.
        if (cached) {
          setStatus(
            repos.length +
              " public repositories, from a copy saved " +
              describeAge(cached.time) +
              ". GitHub could not be reached just now (" +
              message +
              "), so this list may be out of date.",
            "error"
          );
          // A stated failure with no way to act on it is half a message
          // (§3.4, Rulebook §1.3). The table below is readable, so this is a
          // caveat rather than a dead end — but the reader still has to be
          // able to ask for fresh data without reloading the whole page.
          addRetry();
        } else {
          renderError(message);
        }
      });
  }

  /* ── Sort click handling ─────────────────────────────── */

  table.addEventListener("click", function (event) {
    var btn = event.target.closest(".sort-btn");
    if (!btn || repos.length === 0) return;

    var key = btn.getAttribute("data-key");

    if (key === sortKey) {
      sortDir = sortDir === "ascending" ? "descending" : "ascending";
    } else {
      sortKey = key;
      // Text reads naturally A→Z; counts and dates read best largest-first.
      sortDir = key === "name" || key === "language" ? "ascending" : "descending";
    }

    refresh();
  });

  // Filtering 21 rows is instant, so there is nothing to debounce and no
  // spinner to justify — the table simply keeps up with typing.
  if (filterEl) {
    filterEl.disabled = true;   // no data to filter until the fetch lands
    filterEl.addEventListener("input", function () {
      query = filterEl.value;
      refresh();
    });

    // Both Projects filters undo together. They compose as AND, so a repository
    // hidden by the pair cannot be brought back by clearing only one of them,
    // and clearing one while leaving the other would report a change the reader
    // could not see.
    registerUndo(
      "the Projects filter",
      function (node) { return !!(node.closest && node.closest("#projects")); },
      function () { return !!(query.trim() || topic); },
      function () {
        query = "";
        topic = "";
        filterEl.value = "";
        refresh();
      }
    );
  }

  /* ── Filter and sort state in the URL ────────────────────
     Without this the view is unshareable and unreloadable: someone who filters
     to "python", sorts by stars and sends the link sends the default table
     instead, and their own reload throws the work away (Nielsen §1.3, §1.6).

     replaceState, never pushState. pushState here would stack one history
     entry per keystroke, so Back would walk the reader letter by letter out of
     a word they typed — a worse outcome than no history at all.

     A URL is untrusted input, exactly like the API response and the cache. The
     sort key is checked against the known columns and the direction against
     the two legal values; anything else is ignored rather than assigned. */
  var SORT_KEYS = { name: 1, language: 1, updated: 1 };
  var VIEW_MODES = { recruiter: 1, developer: 1 };

  function readStateFromURL() {
    var params;
    try {
      params = new URLSearchParams(window.location.search);
    } catch (e) {
      return;                       // no URLSearchParams: state stays default
    }

    var k = params.get("sort");
    if (k && Object.prototype.hasOwnProperty.call(SORT_KEYS, k)) sortKey = k;

    var d = params.get("dir");
    if (d === "ascending" || d === "descending") sortDir = d;

    /* Clamped, like every remote string. This was the one URL parameter with no
       bound on it: sort and view are checked against known sets, topic against a
       charset, focus against a real element — but `q` was taken at whatever
       length arrived. A link carrying a few hundred thousand characters would
       have been echoed into the status line and filtered against on every
       keystroke. Same ceiling as a repository name, since that is the longest
       thing anyone could sensibly search for here. */
    var q = clamp(params.get("q"), MAX_NAME);
    if (q) {
      query = q;
      if (filterEl) filterEl.value = q;
    }

    // A topic must look like a topic before it is stored, for the same reason
    // the sort key is checked against a known set: this string is about to be
    // compared, echoed into the status line and written back to the URL.
    var t = text(params.get("topic")).toLowerCase();
    if (t && TOPIC_RE.test(t)) topic = t;

    var v = params.get("view");
    if (v && Object.prototype.hasOwnProperty.call(VIEW_MODES, v)) viewMode = v;

    // A focused section is checked the same way everything else out of the URL
    // is: it has to name a real section on this page before it is stored. An id
    // from a query string is about to be put in a selector and written back
    // out, so "it looks like an id" is not enough — it must BE one.
    var f = params.get("focus");
    if (f && /^[a-z][a-z0-9-]*$/.test(f)) {
      var section = document.getElementById(f);
      if (section && section.classList.contains("section")) focusId = f;
    }
  }

  function syncURL() {
    if (!window.history || !window.history.replaceState) return;
    var params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (topic) params.set("topic", topic);
    if (viewMode) params.set("view", viewMode);
    if (focusId) params.set("focus", focusId);
    // Only the non-default sort is written, so the plain URL stays plain.
    if (sortKey !== "updated" || sortDir !== "descending") {
      params.set("sort", sortKey);
      params.set("dir", sortDir);
    }
    var search = params.toString();
    var next =
      window.location.pathname + (search ? "?" + search : "") +
      window.location.hash;
    try {
      window.history.replaceState(null, "", next);
    } catch (e) {
      /* file:// forbids replaceState. Losing the shareable URL is not a
         reason to break the table, so the failure is swallowed here. */
    }
  }

  readStateFromURL();

  /* "/" used to focus this filter. It now opens the site-wide search instead —
     one key, one search, rather than a key that means different things
     depending on which part of the page you were looking at. The hint beside
     the field no longer claims the key; it says what the field filters, which
     was the more useful half of it. See initKeyboard(). */

  /* ── PDF export ──────────────────────────────────────────
     No PDF library, and none needed: the browser already has a typesetter and
     a "Save as PDF" destination. This decides what is visible, calls print(),
     and puts the page back exactly as it was afterwards.

     Everything it changes is recorded in `restore` first. A print dialogue can
     be cancelled, and a page left hidden or re-sorted because the reader
     pressed Escape would be a worse bug than having no export at all. */
  function initExport() {
    var openBtn = document.getElementById("export-open");
    var dialog  = document.getElementById("export-dialog");
    var form    = document.getElementById("export-form");
    var checks  = document.getElementById("export-sections");
    var langSel = document.getElementById("export-language");

    if (!openBtn || !dialog || !form || !checks) return;

    // <dialog> without showModal is just a box. If the browser lacks it, the
    // button would open nothing — so it is removed rather than left as a lie.
    if (typeof dialog.showModal !== "function") {
      openBtn.remove();
      return;
    }

    var sections = document.querySelectorAll("main .section[id]");
    var budgetEl = document.getElementById("export-budget");

    // A SECTION is "curated" if it marks anything at all with data-resume.
    // Inside a curated section, only marked rows and paragraphs print — which
    // is what drops the one-row MBOT and PETRA UTP tables from the résumé
    // without naming them anywhere. A section that marks nothing (Skills)
    // prints whole. CSS cannot ask whether an ancestor contains a matching
    // descendant, so the answer is recorded as a class once, here.
    sections.forEach(function (section) {
      if (section.querySelector("[data-resume]")) {
        section.classList.add("resume-curated");
      }
    });

    // Tables emptied by that curation, and the sub-heading that introduces
    // them, are hidden together: a heading standing over nothing reads as a
    // missing section rather than an omitted one. Emptiness cannot be asked in
    // CSS, so it is resolved here and recorded for undo like every other print
    // change.
    function collapseEmptyTables(restore) {
      document.querySelectorAll(".resume-curated table.grid-table").forEach(
        function (table) {
          if (table.querySelector("tbody tr[data-resume]")) return;

          var wrap = table.closest(".table-wrap") || table;
          var prev = wrap.previousElementSibling;
          wrap.classList.add("resume-empty");
          restore.emptied.push(wrap);

          if (prev && prev.classList.contains("subhead")) {
            prev.classList.add("resume-empty");
            restore.emptied.push(prev);
          }
        }
      );
    }

    function currentMode() {
      var picked = form.querySelector("input[name=mode]:checked");
      return picked ? picked.value : "resume";
    }

    // Whether a section starts ticked, which depends on the format.
    //   data-print-default="off"  — never in a PDF at all. §08 Résumé: a
    //     paragraph explaining how to download the PDF, printed inside that
    //     PDF, is nonsense.
    //   data-resume-default="off" — in the full record, not on a one-page
    //     résumé. Certificates, Projects and Links: 32 rows between them.
    // Both are unticked, not removed — the reader can still put them back.
    function defaultFor(section) {
      if (section.getAttribute("data-print-default") === "off") return false;
      if (currentMode() === "resume" &&
          section.getAttribute("data-resume-default") === "off") return false;
      return true;
    }

    // One checkbox per section, built from the page so a new section appears
    // here automatically and cannot be forgotten.
    sections.forEach(function (section) {
      var label = sectionLabel(section);

      var wrap = document.createElement("label");
      wrap.className = "export-check";

      var input = document.createElement("input");
      input.type = "checkbox";
      input.checked = defaultFor(section);
      input.value = section.id;
      input.setAttribute("data-section", section.id);

      var text = document.createElement("span");
      text.textContent = label;

      wrap.appendChild(input);
      wrap.appendChild(text);
      checks.appendChild(wrap);
    });

    function fillLanguages() {
      if (!langSel) return;
      var seen = {};
      var list = [];
      repos.forEach(function (r) {
        if (r.language && !seen[r.language]) {
          seen[r.language] = true;
          list.push(r.language);
        }
      });
      list.sort();
      // Rebuild rather than append, so reopening the dialog cannot duplicate.
      langSel.length = 1;
      list.forEach(function (lang) {
        var opt = document.createElement("option");
        opt.value = lang;
        opt.textContent = lang;
        langSel.appendChild(opt);
      });
    }

    /* ── The one-page budget ────────────────────────────────
       "One page" is a promise the dialog makes, so the dialog has to be able
       to tell when it is about to break it (Nielsen §1.1) — finding out in the
       print preview is finding out too late.

       This is an ESTIMATE and says so. A4 at 12.7mm margins leaves ~272mm of
       live height; 10pt at 1.3 line-height is ~4.6mm, so ~59 lines fit. The
       full record uses 14mm and 1.35, so ~56. Text is divided by the ~100
       characters that fit on a 182mm line at 10pt Arial. It cannot know where
       the browser will actually break a word, and it is not asked to — it only
       has to be right about "comfortably fits" versus "nowhere near". */
    var CHARS_PER_LINE = 100;

    function linesFor(text) {
      var n = text.replace(/\s+/g, " ").trim().length;
      return Math.max(1, Math.ceil(n / CHARS_PER_LINE));
    }

    // The résumé print drops .evidence cells, so the estimate has to drop them
    // too. The rule that matters here is not the eight lines it saves — it is
    // that the budget and the stylesheet must pick the same text, or the
    // dialog is describing a page nobody is about to get (§3.9).
    function rowTextFor(row, resume) {
      // readableText() rather than textContent throughout: the sr-only new-tab
      // notes and the Copy buttons are display:none on paper, so charging the
      // budget for them is the same mistake .hint was.
      if (!resume) return readableText(row);
      var out = "";
      [].forEach.call(row.cells, function (cell) {
        if (!cell.classList.contains("evidence")) out += readableText(cell) + " ";
      });
      return out;
    }

    function estimateLines() {
      var resume = currentMode() === "resume";
      var total = resume ? 6 : 8;                       // masthead
      var boxes = checks.querySelectorAll("input[type=checkbox]");

      [].forEach.call(boxes, function (box) {
        if (!box.checked) return;
        var section = document.getElementById(box.value);
        if (!section) return;

        // Curation is the section's, so what counts here must be picked the
        // same way the stylesheet picks it — or the estimate describes a page
        // that is not the one printed.
        var curated = resume && section.classList.contains("resume-curated");

        total += 2;                                     // heading plus its gap
        section.querySelectorAll(".section-body > p").forEach(function (p) {
          // .hint is display:none for the whole print block, so counting one
          // charges the budget for a line that never reaches paper. It went
          // unnoticed while there were two hints on the page; there are now
          // eight, and Skills alone was being billed five lines for nothing.
          if (p.classList.contains("hint")) return;
          if (curated && !p.hasAttribute("data-resume")) return;
          total += linesFor(readableText(p)) + 1;
        });

        section.querySelectorAll("table.grid-table").forEach(function (table) {
          // .block-empty is deliberately NOT skipped here. The print block
          // reverses .filtered-out, so the rows that emptied the block come
          // back on paper and the block comes back with them — the budget has
          // to count a page that ignores the on-screen filter, or it describes
          // one nobody is about to get. See printing.md §4.
          var rows = table.querySelectorAll(
            curated ? "tbody tr[data-resume]" : "tbody tr"
          );
          // An emptied table takes its sub-heading with it and costs nothing.
          if (!rows.length) return;

          var subhead = 0;
          var wrap = table.closest(".table-wrap");
          var prev = wrap ? wrap.previousElementSibling : null;
          if (prev && prev.classList.contains("subhead")) subhead = 2;
          total += subhead;

          if (!resume) total += 2;                      // header row and table gap

          var cols = table.getAttribute("data-resume-columns");
          var divisor = resume && cols ? Number(cols) || 1 : 1;
          var rowLines = 0;
          [].forEach.call(rows, function (row) {
            rowLines += linesFor(rowTextFor(row, resume));
          });
          total += Math.ceil(rowLines / divisor);
        });
      });

      return total;
    }

    function updateBudget() {
      if (!budgetEl) return;
      var resume = currentMode() === "resume";
      var cap = resume ? 59 : 56;
      var lines = estimateLines();
      var pages = Math.max(1, Math.ceil(lines / cap));

      if (!resume) {
        budgetEl.textContent =
          "Roughly " + pages + (pages === 1 ? " page." : " pages.") +
          " The full record is not meant to fit on one.";
        budgetEl.classList.remove("is-over");
        return;
      }

      if (pages === 1) {
        budgetEl.textContent =
          "About " + lines + " lines of the ~" + cap +
          " a page holds — fits on one page.";
        budgetEl.classList.remove("is-over");
      } else {
        budgetEl.textContent =
          "About " + lines + " lines — roughly " + pages +
          " pages. Untick a section, or mark fewer rows with data-resume in " +
          "index.html, to get back to one.";
        budgetEl.classList.add("is-over");
      }
    }

    // Switching format re-derives every checkbox from its declared default,
    // rather than leaving the previous mode's ticks behind for the reader to
    // untangle. Ticking a section only updates the estimate.
    form.addEventListener("change", function (event) {
      if (event.target.name === "mode") {
        [].forEach.call(
          checks.querySelectorAll("input[type=checkbox]"),
          function (box) {
            var section = document.getElementById(box.value);
            if (section) box.checked = defaultFor(section);
          }
        );
      }
      updateBudget();
    });

    openBtn.addEventListener("click", function () {
      fillLanguages();
      updateBudget();
      dialog.showModal();
    });

    form.addEventListener("submit", function (event) {
      // event.submitter is the button that was pressed; "cancel" just closes.
      var action = event.submitter ? event.submitter.value : "cancel";
      if (action !== "print") return;

      var restore = {
        hidden: [], opened: [], emptied: [], query: query, mode: false
      };

      // 0. Format. The class drives the whole résumé print layout in CSS, and
      //    like every other print change it is recorded so it can be undone.
      if (currentMode() === "resume") {
        document.body.classList.add("print-resume");
        restore.mode = true;
        collapseEmptyTables(restore);
      }

      // 1. Hide unticked sections.
      checks.querySelectorAll("input[type=checkbox]").forEach(function (box) {
        if (box.checked) return;
        var section = document.getElementById(box.value);
        if (section) {
          section.classList.add("print-hidden");
          restore.hidden.push(section);
        }
      });

      // 2. "Everything" opens every fold. Forcing the attribute in JS is the
      //    only reliable way — a closed <details> cannot be opened by CSS.
      var detail = form.querySelector("input[name=detail]:checked");
      if (detail && detail.value === "everything") {
        document.querySelectorAll("details.section-fold").forEach(function (d) {
          if (!d.open) {
            d.open = true;
            restore.opened.push(d);
          }
        });
      }

      // 3. Narrow the Projects table if a language was chosen.
      var lang = langSel ? langSel.value : "";
      if (lang && filterEl) {
        query = lang;
        filterEl.value = lang;
        refresh();
      }

      function undo() {
        if (restore.mode) document.body.classList.remove("print-resume");
        restore.emptied.forEach(function (el) {
          el.classList.remove("resume-empty");
        });
        restore.hidden.forEach(function (el) {
          el.classList.remove("print-hidden");
        });
        restore.opened.forEach(function (el) {
          el.open = false;
        });
        if (lang && filterEl) {
          query = restore.query;
          filterEl.value = restore.query;
          refresh();
        }
        window.removeEventListener("afterprint", undo);
      }

      window.addEventListener("afterprint", undo);

      // Let the dialog finish closing and the layout settle before printing;
      // printing mid-close captures the dialog backdrop in some browsers.
      window.setTimeout(function () {
        window.print();
        // afterprint is not fired by every browser. A timed fallback means the
        // page cannot be left in export state even if the event never lands.
        window.setTimeout(undo, 1500);
      }, 60);
    });
  }

  initExport();

  /* ── Folds: reveal on navigation ─────────────────────────
     A nav link, the skip link, or a pasted #anchor must land on readable
     content. Scrolling someone to a heading whose body they cannot see is a
     dead end — the section is present, so the link promised something it did
     not deliver (Nielsen §1.3, Gestalt §2.4: hidden overflow is hidden data). */
  /* The hash is treated as an id, not as a selector. It used to be handed
     straight to `querySelector`, which meant a pasted `#a,*` was a valid
     selector matching the first element on the page rather than the anchor it
     claimed to be — a small consequence here, but selector injection all the
     same, and the try/catch was only there because the raw string could throw.
     `?focus=` in readStateFromURL already checks its value is a real id before
     using it; this is the same rule applied to the same kind of input. */
  var ID_RE = /^[A-Za-z][\w-]*$/;

  function revealTarget(hash) {
    if (!hash || hash.charAt(0) !== "#") return;
    var id = hash.slice(1);
    if (!ID_RE.test(id)) return;
    var target = document.getElementById(id);
    if (!target) return;
    var fold = target.querySelector("details.section-fold");
    if (fold && !fold.open) fold.open = true;
  }

  window.addEventListener("hashchange", function () {
    revealTarget(window.location.hash);
  });

  document.addEventListener("click", function (event) {
    var link = event.target.closest('a[href^="#"]');
    if (link) revealTarget(link.getAttribute("href"));
  });

  revealTarget(window.location.hash);   // deep link on first load

  /* ── Folds: expand / collapse all ────────────────────────
     Eight separate clicks to read everything is a toll on the reader who
     wants the whole record (Nielsen §1.7). The control is built in JS because
     without JS the folds are all open already and it would do nothing. */
  /* ── Scrollable tables must be reachable by keyboard ─────
     19 `.table-wrap` scrollers, and a table wider than its wrap could only be
     scrolled by dragging. That is WCAG 2.1.1: content reachable by pointer only
     is unreachable for anyone on a keyboard, and on a site made almost entirely
     of wide tables it was the largest gap left.

     Focusable **only while it actually overflows.** Making all 19 permanently
     tabbable would add 19 stops to every keyboard pass through the page, most of
     them onto boxes with nothing to scroll — trading one access problem for a
     worse one. So it is re-evaluated on resize, and after anything that changes
     a table's width: the density toggle, a filter, a view mode.

     The label comes from the table's own `<caption>` rather than 19 hand-written
     `aria-label`s. A caption is already required and already correct; a
     duplicate written by hand is a second thing to keep in sync. */
  function syncScrollableTables() {
    [].forEach.call(document.querySelectorAll(".table-wrap"), function (wrap) {
      var overflows = wrap.scrollWidth > wrap.clientWidth + 1;   // 1px slack for
                                                                 // sub-pixel widths
      if (overflows) {
        if (!wrap.hasAttribute("tabindex")) {
          wrap.setAttribute("tabindex", "0");
          wrap.setAttribute("role", "region");
          var caption = wrap.querySelector("caption");
          var label = caption ? readableText(caption) : "";
          if (label) wrap.setAttribute("aria-label", label + " (scrollable)");
        }
      } else if (wrap.hasAttribute("tabindex")) {
        wrap.removeAttribute("tabindex");
        wrap.removeAttribute("role");
        wrap.removeAttribute("aria-label");
      }

      /* The visible half of the same fact. A .scroll-hint immediately before this
         wrap is shown only while the wrap actually overflows — an empty
         #compare-table fits, and a hint asking for a gesture the page is not
         asking for is worse than none. CSS still gates it on width; this gates
         it on truth.

         Immediate sibling, not "anywhere in the parent": the ASCII diagram's own
         hint shares a parent with the Skills table, and a parent-wide lookup hid
         the diagram's hint whenever that table stopped overflowing. The hint
         belongs to the box it sits against. */
      var hint = wrap.previousElementSibling;
      if (hint && hint.classList.contains("scroll-hint")) hint.hidden = !overflows;
    });
  }

  window.addEventListener("resize", syncScrollableTables);
  document.addEventListener("viewmodechange", syncScrollableTables);

  /* Below 640px a table row is drawn as a stacked card, and a cell standing on
     its own line has nothing left saying which column it came from. The label
     is taken from the table's own <thead> and written onto the cell as
     `data-label`, which CSS reads with attr().

     Derived, never hand-written: the header text is already there and already
     correct, and a second copy typed into the markup is a second thing to keep
     in sync — the same bargain `syncScrollableTables()` makes with <caption>.

     An attribute is also invisible to `readableText()`, so the search index, the
     JSON view and the résumé line budget cannot pick these up. Setting one
     parses nothing, which is what makes it safe on the Projects table, where
     every cell is remote text.

     A cell spanning columns — the empty-state row's single "No repositories
     match" cell — is left unlabelled: there is no one column it came from. */
  function labelCells(tbl) {
    if (!tbl) return;

    var headRow = tbl.querySelector("thead tr");
    var body = tbl.querySelector("tbody");
    if (!headRow || !body) return;

    var labels = [].map.call(headRow.cells, function (th) {
      return readableText(th).replace(/\s+/g, " ").trim();
    });

    [].forEach.call(body.rows, function (row) {
      [].forEach.call(row.cells, function (cell, i) {
        if (cell.colSpan > 1 || !labels[i]) {
          cell.removeAttribute("data-label");
          return;
        }
        cell.setAttribute("data-label", labels[i]);
      });
    });
  }

  /* The comparison matrix is excluded by CSS from stacking at all, so labelling
     it would write attributes nothing reads. */
  function labelAllCells() {
    [].forEach.call(
      document.querySelectorAll("main table.grid-table:not(#compare-table)"),
      labelCells
    );
  }

  function initFoldControls() {
    var folds = document.querySelectorAll("details.section-fold");
    var main = document.getElementById("main");
    if (!folds.length || !main) return;

    var bar = document.createElement("p");
    bar.className = "fold-controls";

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "fold-toggle";

    function allOpen() {
      return [].every.call(folds, function (d) { return d.open; });
    }

    // The label states the action, and is re-derived from the real state, so
    // it cannot claim "Collapse all" while half the page is already closed.
    function sync() {
      var open = allOpen();
      btn.textContent = open ? "Collapse all sections" : "Expand all sections";
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    }

    btn.addEventListener("click", function () {
      var open = allOpen();
      [].forEach.call(folds, function (d) { d.open = !open; });
      sync();
    });

    [].forEach.call(folds, function (d) {
      d.addEventListener("toggle", sync);
    });

    sync();
    bar.appendChild(btn);
    main.insertBefore(bar, main.querySelector(".section"));
  }

  initFoldControls();

  /* ── Nav scrollspy ───────────────────────────────────────
     Answers "where am I" without the user scrolling back to check. Marked in
     weight and rule as well as colour, so it never depends on colour alone. */
  function initScrollSpy() {
    // Set up before the early return below: the header condensing must not
    // depend on the nav happening to resolve its section targets.
    var condense = initHeaderCondense();
    var links = document.querySelectorAll(".site-nav a");
    var byId = {};
    var sections = [];

    for (var i = 0; i < links.length; i++) {
      var id = links[i].getAttribute("href").slice(1);
      var section = document.getElementById(id);
      if (section) {
        byId[id] = links[i];
        sections.push(section);
      }
    }
    if (sections.length === 0) {
      if (condense) {
        window.addEventListener("scroll", condense, { passive: true });
        condense();
      }
      return;
    }

    var header = document.querySelector(".site-header");

    // The last section whose heading has passed under the header is the one
    // being read. Above the first section we are still in the masthead, so
    // nothing is marked rather than something being marked wrongly.
    function currentId() {
      var line = (header ? header.getBoundingClientRect().height : 0) + 24;
      var found = null;
      for (var s = 0; s < sections.length; s++) {
        if (sections[s].getBoundingClientRect().top <= line) {
          found = sections[s].id;
        }
      }
      // At the very bottom the last section may be too short to reach the
      // line; mark it anyway, since it is what the reader is looking at.
      var atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 2;
      if (atBottom) found = sections[sections.length - 1].id;
      return found;
    }

    /* Where you are, in the coordinates the sections are already numbered in.
       Not a percentage and not a bar: this document is a set of numbered
       sections, and "04 / 08" is the same fact the headings state, where "43%"
       would be a second scale the reader has to translate. */
    var readout = document.getElementById("doc-position");

    function pad(n) {
      return (n < 10 ? "0" : "") + n;
    }

    var marked;
    function update() {
      var current = currentId();
      if (current === marked) return;
      marked = current;
      readingId = current || "";

      var at = 0;
      for (var i = 0; i < sections.length; i++) {
        if (sections[i].id === current) at = i + 1;
      }

      if (readout) {
        // Above the first section there is no section to be in, and an em dash
        // says that where "00" would claim a section numbered zero.
        readout.textContent =
          (at ? pad(at) : "—") + " / " + pad(sections.length);
      }

      for (var id in byId) {
        if (id === current) {
          byId[id].setAttribute("aria-current", "true");
          keepNavItemVisible(byId[id]);
        } else {
          byId[id].removeAttribute("aria-current");
        }
      }
    }

    // Coalesce to one update per frame — scroll fires far faster than paint.
    var queued = false;
    function onScroll() {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(function () {
        queued = false;
        // Condense first: it decides whether the nav is a scrolling box at
        // all, and update() asks that question when it keeps the marked item
        // in view. Reversed, the first condensing frame measures the old
        // layout and then never re-measures, because update() short-circuits
        // once the marked section stops changing.
        if (condense) condense();
        update();
      });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
    if (condense) condense();
  }

  /* ── Copy email ──────────────────────────────────────────
     A bare mailto: is a dead end on a machine with no mail client configured:
     the click does nothing at all, and nothing says why (Nielsen §1.1). The
     copy button is the escape hatch — and it is built in JS so that a browser
     without the Clipboard API gets no button rather than a broken one. */
  function initCopyEmail() {
    if (!navigator.clipboard || !navigator.clipboard.writeText) return;

    // The same argument applies past mailto:. A GitHub or LinkedIn address is
    // something a reader wants in the clipboard at least as often as they want
    // it opened — usually to paste into a form that will not accept a click.
    var links = document.querySelectorAll(
      'a[href^="mailto:"], .site-footer a[href^="https:"], #links a[href^="https:"]'
    );
    [].forEach.call(links, function (link) {
      var href = link.getAttribute("href");
      var isMail = href.indexOf("mailto:") === 0;
      var address = isMail ? href.slice(7).split("?")[0] : link.href;
      if (!address || link.classList.contains("button")) return;

      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "copy-btn";
      btn.textContent = "Copy";
      // The button repeats a label already on screen, so the accessible name
      // has to carry what it is copying.
      btn.setAttribute(
        "aria-label",
        isMail ? "Copy email address " + address : "Copy link " + address
      );

      // The result is said in words and announced, not shown as a colour
      // change — the confirmation must survive with the sound off and the
      // screen unread (Rulebook §4).
      var said = document.createElement("span");
      said.className = "sr-only";
      said.setAttribute("role", "status");

      var timer;
      btn.addEventListener("click", function () {
        navigator.clipboard.writeText(address).then(
          function () {
            btn.textContent = "Copied";
            said.textContent = isMail ? "Email address copied." : "Link copied.";
          },
          function () {
            // A denied clipboard permission must not look like success.
            btn.textContent = "Press Ctrl+C";
            said.textContent =
              "Could not copy. Select the address and copy it manually.";
          }
        );
        window.clearTimeout(timer);
        timer = window.setTimeout(function () {
          btn.textContent = "Copy";
          said.textContent = "";
        }, 2500);
      });

      link.parentNode.insertBefore(btn, link.nextSibling);
      link.parentNode.insertBefore(said, btn.nextSibling);
    });
  }

  initCopyEmail();

  /* ── Condense the header once past the masthead ──────────
     Eight nav items wrap to two rows at 375px, so the sticky header holds
     124px — nineteen per cent of a 667px phone screen, permanently, while the
     reader is reading something else. Past the masthead the header drops to a
     single row (~44px) and gives that back.

     No destination is removed: all eight links stay, on one row that scrolls
     sideways behind a fade. A clipped edge would read as "finished" and hide
     data (Gestalt §2.4), so the fade is the affordance that says otherwise —
     the same bargain the ASCII diagram makes with .scroll-hint — and the
     scrollspy scrolls the current section back into view, so the reader never
     has to hunt for where they are.

     The class goes on <html>, not on the header, because the anchor offset
     depends on it too: .section carries scroll-margin-top for a 124px header,
     and against a 48px one that would drop every heading 76px down the page.

     It rides the scrollspy's existing rAF-coalesced scroll handler rather than
     adding a second listener on the same event. */
  function initHeaderCondense() {
    var main = document.getElementById("main");
    if (!main) return null;

    var condensed = false;
    return function () {
      // Trigger on the masthead's own measured bottom, not on a pixel constant
      // that a copy edit to the masthead would silently invalidate.
      var masthead = main.querySelector(".masthead");
      var want = masthead ? masthead.getBoundingClientRect().bottom < 0 : false;
      if (want === condensed) return;
      condensed = want;
      document.documentElement.classList.toggle("nav-condensed", want);
    };
  }

  // Keep the marked nav item inside the condensed row. scrollLeft is set
  // directly rather than calling scrollIntoView, which is free to scroll the
  // page as well as the container.
  function keepNavItemVisible(link) {
    var nav = link.parentNode;
    if (!nav || nav.scrollWidth <= nav.clientWidth + 1) return;

    // Rects, not offsetLeft: the nav is statically positioned, so offsetLeft
    // is measured from the page, not from the scrolling box, and the two
    // differ by the header's own padding.
    var box = nav.getBoundingClientRect();
    var item = link.getBoundingClientRect();
    // The right edge is masked by a fade; stopping the item exactly at the
    // edge would leave it half faded out, which is the same as hiding it.
    var FADE = 28;

    if (item.left < box.left) {
      nav.scrollLeft -= box.left - item.left + 12;
    } else if (item.right > box.right - FADE) {
      nav.scrollLeft += item.right - box.right + FADE + 4;
    }
  }

  /* ── Topic chips ─────────────────────────────────────────
     Curation lives on GitHub, not in an allowlist here (rule 2.3): the chips
     are whatever topics the repositories actually carry. Tag a repository and
     a chip appears on the next load; untag it and the chip goes. Only topics
     used more than once get one — a chip that filters to a single row is a
     link to that row wearing a filter's clothes. */
  function buildTopicChips() {
    var box = document.getElementById("topic-chips");
    if (!box) return;

    // Same reason as the language counts. TOPIC_RE has no underscore, so
    // "__proto__" cannot reach here today — this survives someone widening it.
    var counts = Object.create(null);
    repos.forEach(function (r) {
      safeTopics(r.topics).forEach(function (t) {
        counts[t] = (counts[t] || 0) + 1;
      });
    });

    var list = Object.keys(counts).filter(function (t) { return counts[t] > 1; });
    list.sort(function (a, b) {
      return counts[b] - counts[a] || a.localeCompare(b);
    });
    list = list.slice(0, 12);

    if (list.length === 0) {
      box.hidden = true;
      return;
    }
    box.hidden = false;
    box.textContent = "";

    // "All" first, so the way back out is as visible as the way in (§1.3).
    list.unshift("");

    list.forEach(function (t) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip";
      btn.setAttribute("data-topic", t);
      btn.textContent = t === "" ? "All topics" : t + " (" + counts[t] + ")";
      // aria-pressed is the announced state; the CSS fill is drawn from it, so
      // the two cannot drift — the same contract the sort arrows keep.
      btn.setAttribute("aria-pressed", "false");
      btn.addEventListener("click", function () {
        topic = t;
        refresh();
      });
      box.appendChild(btn);
    });

    syncTopicChips();
  }

  function syncTopicChips() {
    var box = document.getElementById("topic-chips");
    if (!box) return;
    [].forEach.call(box.querySelectorAll(".chip"), function (btn) {
      btn.setAttribute(
        "aria-pressed",
        btn.getAttribute("data-topic") === topic ? "true" : "false"
      );
    });
  }

  /* ── Repository statistics ───────────────────────────────
     Same array as the table, so the panel cannot contradict the rows under it.
     The bars are block characters, not CSS widths: a percentage width can only
     be set as an inline style attribute and rule 1.8 forbids those, so the bar
     is text — which also means it survives copy-paste and prints. */
  var BAR_CELLS = 24;

  function buildStats() {
    var wrap = document.getElementById("repo-stats");
    var row  = document.getElementById("repo-stat-row");
    var body = document.getElementById("lang-body");
    if (!wrap || !row || !body || repos.length === 0) return;

    /* Object.create(null), because the keys are remote strings. `language` is
       clamped but not charset-checked, so "__proto__" can arrive: on a plain
       object `counts["__proto__"] = 1` writes the prototype slot instead of a
       count, the assignment is silently dropped, and that language disappears
       from the statistics rather than throwing. A dictionary keyed by untrusted
       text should never inherit from Object. */
    var counts = Object.create(null);
    var withLang = 0;
    var newest = 0;
    repos.forEach(function (r) {
      var lang = text(r.language);
      if (lang) {
        counts[lang] = (counts[lang] || 0) + 1;
        withLang++;
      }
      var t = new Date(r.updated_at).getTime();
      if (isFinite(t) && t > newest) newest = t;
    });

    var langs = Object.keys(counts).sort(function (a, b) {
      return counts[b] - counts[a] || a.localeCompare(b);
    });

    var top = langs[0] || "—";

    row.textContent = "";
    [
      ["Repositories", String(repos.length)],
      ["Languages", String(langs.length)],
      ["Most used", top],
      ["Newest change", newest ? formatDate(new Date(newest).toISOString()) : "—"]
    ].forEach(function (pair) {
      row.appendChild(statCell(pair[0], pair[1]));
    });

    body.textContent = "";
    var frag = document.createDocumentFragment();

    langs.forEach(function (lang) {
      var pct = withLang ? (counts[lang] / withLang) * 100 : 0;
      var filled = Math.max(1, Math.round((pct / 100) * BAR_CELLS));

      var tr = el("tr");
      tr.appendChild(cell("th", lang, "row"));

      // The bar is decoration for a number that is already in the next cell,
      // so it is hidden from assistive tech rather than read out as
      // twenty-four identical glyphs.
      var bar = el("span", "bar", repeat("█", filled) + repeat("·", BAR_CELLS - filled));
      bar.setAttribute("aria-hidden", "true");

      var pctCell = el("td");
      pctCell.appendChild(bar);
      pctCell.appendChild(document.createTextNode(" " + pct.toFixed(0) + "%"));

      tr.appendChild(pctCell);
      tr.appendChild(cell("td", String(counts[lang])));
      frag.appendChild(tr);
    });

    // Repositories GitHub could not classify are stated rather than dropped:
    // a distribution that silently omits rows is a distribution that lies.
    var unknown = repos.length - withLang;
    if (unknown > 0) {
      var tr = el("tr");
      tr.appendChild(cell("th", "Not classified", "row"));
      tr.appendChild(cell("td", "GitHub reports no primary language"));
      tr.appendChild(cell("td", String(unknown)));
      frag.appendChild(tr);
    }

    body.appendChild(frag);
    labelCells(body.closest("table"));
    wrap.hidden = false;
  }

  function statCell(label, value) {
    var div = el("div");
    div.appendChild(el("dt", null, label));
    div.appendChild(el("dd", null, value));
    return div;
  }

  // String.prototype.repeat is ES6; this file is otherwise ES5 by habit, and
  // one helper is cheaper than deciding the whole file's baseline over a bar.
  function repeat(ch, n) {
    var out = "";
    for (var i = 0; i < n; i++) out += ch;
    return out;
  }

  /* ── Selected projects ───────────────────────────────────
     A repository joins this band by carrying the "featured" topic on GitHub.
     Nothing is named here, so the rule that the list is never hardcoded still
     holds (rules 2.1, 2.3). With nothing tagged the band hides itself — an
     empty heading reads as a fault rather than an omission. */
  function buildFeatured() {
    var band = document.getElementById("featured-band");
    var list = document.getElementById("featured-list");
    if (!band || !list) return;

    var picked = repos.filter(function (r) {
      return safeTopics(r.topics).indexOf("featured") !== -1;
    });

    if (picked.length === 0) {
      // Cleared as well as hidden. A revalidation that drops the last featured
      // repository must not leave the previous one sitting in a hidden list,
      // where the next thing to unhide the band would show stale data.
      list.textContent = "";
      band.hidden = true;
      return;
    }

    picked.sort(function (a, b) {
      return text(b.updated_at).localeCompare(text(a.updated_at));
    });

    list.textContent = "";
    var frag = document.createDocumentFragment();

    picked.slice(0, 6).forEach(function (r) {
      var li = el("li", "featured-item");
      li.appendChild(
        externalLink(safeRepoURL(r.html_url), text(r.name), "text-link featured-name")
      );
      li.appendChild(el("span", "featured-lang", text(r.language) || "—"));
      li.appendChild(el("span", "featured-desc", text(r.description) || "—"));
      frag.appendChild(li);
    });

    list.appendChild(frag);
    band.hidden = false;
  }

  /* ── Repository detail ───────────────────────────────────
     Built from what is already in memory. No second request, so it costs
     nothing against the 60-per-hour unauthenticated budget (rule 2.2) and it
     still opens with the network down and the cache warm. */
  function initRepoDialog() {
    var dialog  = document.getElementById("repo-dialog");
    var titleEl = document.getElementById("repo-dialog-title");
    var bodyEl  = document.getElementById("repo-dialog-body");
    var descEl  = document.getElementById("repo-dialog-desc");
    var linkEl  = document.getElementById("repo-dialog-link");
    var cmpBtn  = document.getElementById("repo-dialog-compare");
    if (!dialog || !bodyEl || typeof dialog.showModal !== "function") return;

    var open = null;

    function find(name) {
      for (var i = 0; i < repos.length; i++) {
        if (repos[i].name === name) return repos[i];
      }
      return null;
    }

    // Delegated, because the rows are replaced on every sort and filter.
    table.addEventListener("click", function (event) {
      var btn = event.target.closest(".detail-btn");
      if (!btn) return;
      var r = find(btn.getAttribute("data-repo"));
      if (r) show(r);
    });

    /* One function, because the Details button and a Related button must not be
       able to disagree about what a repository dialog contains. Called on an
       already-open dialog too: showModal() on an open dialog throws, so the
       swap re-fills in place and only opens when it is closed. */
    function show(r) {
      open = r;

      titleEl.textContent = r.name;
      linkEl.href = safeRepoURL(r.html_url);

      var topics = safeTopics(r.topics);
      bodyEl.textContent = "";
      [
        ["Language", text(r.language) || "Not classified"],
        ["Created", r.created_at ? formatDate(r.created_at) : "—"],
        ["Last updated", formatDate(r.updated_at)],
        ["Topics", topics.length ? topics.join(" · ") : "None"],
        ["Repository", safeRepoURL(r.html_url)]
      ].forEach(function (pair) {
        bodyEl.appendChild(detailRow(pair[0], pair[1]));
      });
      bodyEl.appendChild(relatedRow(r, topics, show));

      descEl.textContent = text(r.description) || "No description on GitHub.";
      syncCompareBtn();
      if (!dialog.open) dialog.showModal();
    }

    /* One repository's neighbours, by shared topic.
       Shared topic and not shared language: language is free and says nothing —
       every Python repository would link to every other one and the answer
       would be a single blob. A topic is something Affan tagged on purpose, so
       the edge carries an intention. This is also why there is no allowlist
       here: curation happens on GitHub, and the page reports it (standing
       instruction 5).

       Text, not a drawn graph. A node-link picture needs a layout algorithm,
       geometry the CSP will not let JS set as inline style, and a separate
       text version for paper and for screen readers — three costs to say what
       one sorted line already says.

       Each neighbour is a button rather than a link: it swaps this dialog to
       that repository, so the edge can be walked without closing anything.
       A link would leave for GitHub, which is the opposite of the point. */
    function relatedRow(r, topics, showRepo) {
      var tr = el("tr");
      tr.appendChild(cell("th", "Related", "row"));
      var td = el("td");

      var mine = Object.create(null);   // keyed by remote topics
      topics.forEach(function (t) { mine[t] = 1; });

      var near = [];
      repos.forEach(function (other) {
        if (other.name === r.name) return;
        var shared = safeTopics(other.topics).filter(function (t) {
          return mine[t];
        });
        if (shared.length) near.push({ repo: other, shared: shared });
      });

      // Most-shared first, then by name, so the order does not shuffle between
      // two openings of the same dialog.
      // text() and not a bare .localeCompare: the cache is untrusted, and a
      // repository whose name came back as a number would throw here and take
      // the whole dialog with it.
      near.sort(function (a, b) {
        return b.shared.length - a.shared.length ||
               text(a.repo.name).localeCompare(text(b.repo.name));
      });

      if (!near.length) {
        /* Stated, not hidden. Nothing here is broken — the repositories simply
           are not tagged yet — but a row that silently vanishes teaches the
           reader nothing, and this one names the thing that would fill it. */
        td.appendChild(el("span", "hint", topics.length
          ? "No other repository shares these topics yet."
          : "No topics on GitHub yet — tagging repositories is what links them."));
        tr.appendChild(td);
        return tr;
      }

      near.forEach(function (entry, i) {
        if (i) td.appendChild(document.createTextNode(" · "));
        var btn = el("button", "related-btn", text(entry.repo.name));
        btn.type = "button";
        // Named for a screen reader, which otherwise hears a bare repository
        // name and no reason it is in this list.
        btn.appendChild(el("span", "sr-only",
          " — shares " + entry.shared.join(", ")));
        btn.addEventListener("click", function () { showRepo(entry.repo); });
        td.appendChild(btn);
      });

      tr.appendChild(td);
      return tr;
    }

    function syncCompareBtn() {
      if (!cmpBtn || !open) return;
      var inList = compare.indexOf(open.name) !== -1;
      cmpBtn.textContent = inList
        ? "Remove from comparison (" + compare.length + ")"
        : "Add to comparison" + (compare.length ? " (" + compare.length + ")" : "");
    }

    if (cmpBtn) {
      cmpBtn.addEventListener("click", function () {
        if (!open) return;
        var at = compare.indexOf(open.name);
        if (at === -1) compare.push(open.name);
        else compare.splice(at, 1);
        syncCompareBtn();
        syncCompareBar();
      });
    }
  }

  function detailRow(label, value) {
    var tr = el("tr");
    tr.appendChild(cell("th", label, "row"));
    tr.appendChild(cell("td", value));
    return tr;
  }

  /* ── Comparison ──────────────────────────────────────────
     The bar only exists once there is something to compare, so it never sits
     there as an empty promise. */
  function syncCompareBar() {
    var band = document.getElementById("featured-band");
    var host = document.getElementById("topic-chips");
    if (!host) return;

    var bar = document.getElementById("compare-bar");
    if (compare.length < 1) {
      if (bar) bar.remove();
      return;
    }
    if (!bar) {
      bar = document.createElement("p");
      bar.id = "compare-bar";
      bar.className = "compare-bar";
      host.parentNode.insertBefore(bar, host.nextSibling);
    }
    bar.textContent = "";

    var said = document.createElement("span");
    said.textContent =
      compare.length + (compare.length === 1 ? " project" : " projects") + " selected. ";
    bar.appendChild(said);

    var openBtn = document.createElement("button");
    openBtn.type = "button";
    openBtn.className = "retry-btn";
    openBtn.textContent = "Compare";
    openBtn.disabled = compare.length < 2;
    openBtn.addEventListener("click", showCompare);
    bar.appendChild(openBtn);

    var clr = document.createElement("button");
    clr.type = "button";
    clr.className = "retry-btn";
    clr.textContent = "Clear";
    clr.addEventListener("click", function () {
      compare = [];
      syncCompareBar();
    });
    bar.appendChild(clr);

    if (compare.length < 2 && band) {
      var need = document.createElement("span");
      need.className = "hint";
      need.textContent = " Pick one more to compare.";
      bar.appendChild(need);
    }
  }

  /* "Clear selection" sat in the compare dialog with no handler behind it: a
     labelled, focusable, perfectly convincing control that did nothing at all
     when clicked, and said nothing about why (Nielsen §1.3). Bound once here
     rather than inside showCompare(), which runs on every open and would stack
     a fresh listener each time. */
  (function bindCompareClear() {
    var btn = document.getElementById("compare-clear");
    var dialog = document.getElementById("compare-dialog");
    if (!btn) return;
    btn.addEventListener("click", function () {
      compare = [];
      syncCompareBar();
      if (dialog && dialog.open) dialog.close();
    });
  })();

  function showCompare() {
    var dialog = document.getElementById("compare-dialog");
    var head   = document.getElementById("compare-head");
    var body   = document.getElementById("compare-body");
    if (!dialog || !head || !body || typeof dialog.showModal !== "function") return;

    var picked = repos.filter(function (r) {
      return compare.indexOf(r.name) !== -1;
    });
    if (picked.length < 2) return;

    head.textContent = "";
    head.appendChild(cell("th", "Attribute", "col"));
    picked.forEach(function (r) {
      head.appendChild(cell("th", text(r.name), "col"));
    });

    // The union of every topic across the selection, so a row exists for each
    // attribute and a blank cell means "not this one" rather than "unknown".
    var topicSet = Object.create(null);   // keyed by remote topics
    picked.forEach(function (r) {
      safeTopics(r.topics).forEach(function (t) { topicSet[t] = 1; });
    });
    var topicList = Object.keys(topicSet).sort();

    body.textContent = "";

    body.appendChild(compareRow("Language", picked, function (r) {
      return cell("td", text(r.language) || "—");
    }));
    body.appendChild(compareRow("Created", picked, function (r) {
      return cell("td", r.created_at ? formatDate(r.created_at) : "—");
    }));
    body.appendChild(compareRow("Last updated", picked, function (r) {
      return cell("td", formatDate(r.updated_at));
    }));

    topicList.forEach(function (t) {
      body.appendChild(compareRow(t, picked, function (r) {
        // A tick alone would be colour-free but still symbol-only; the cell
        // carries a word for assistive tech behind it.
        var has = safeTopics(r.topics).indexOf(t) !== -1;
        var td = el("td");
        var mark = el("span", null, has ? "✓︎" : "·");
        mark.setAttribute("aria-hidden", "true");
        td.appendChild(mark);
        td.appendChild(el("span", "sr-only", has ? "yes" : "no"));
        return td;
      }));
    });

    dialog.showModal();
  }

  function compareRow(label, list, fn) {
    var tr = el("tr");
    tr.appendChild(cell("th", label, "row"));
    list.forEach(function (r) { tr.appendChild(fn(r)); });
    return tr;
  }

  /* ── Sorting the static tables ───────────────────────────
     The Projects table has had sortable headers since the start; the tables
     written by hand did not, which made the page inconsistent about what a
     column header does. This adds the same behaviour to any table marked
     data-sortable, working on DOM rows rather than on an array.

     Tables under three rows are skipped even if marked: a sort control over
     two rows is a control that cannot demonstrate it did anything. */
  var MONTHS = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
  };

  // A period cell reads "May 2024 – Aug 2027 (expected)". Sorted as text that
  // orders by month name, which is nonsense; the start date is what a reader
  // means by sorting a period, so it is what gets compared.
  function sortValue(raw) {
    var s = raw.replace(/\s+/g, " ").trim();
    if (s === "" || s === "—") return { n: -Infinity, s: "" };

    var m = s.match(/([A-Za-z]{3})[a-z]*\s+(\d{4})/);
    if (m && Object.prototype.hasOwnProperty.call(MONTHS, m[1].toLowerCase())) {
      return { n: Number(m[2]) * 12 + MONTHS[m[1].toLowerCase()], s: s.toLowerCase() };
    }

    var year = s.match(/^(\d{4})$/);
    if (year) return { n: Number(year[1]) * 12, s: s.toLowerCase() };

    var num = s.match(/^[^\d]*(\d+(?:\.\d+)?)/);
    if (num) return { n: Number(num[1]), s: s.toLowerCase() };

    return { n: null, s: s.toLowerCase() };
  }

  function initStaticSort() {
    var tables = document.querySelectorAll("table.grid-table[data-sortable]");

    [].forEach.call(tables, function (tbl) {
      var headRow = tbl.querySelector("thead tr");
      var body    = tbl.querySelector("tbody");
      if (!headRow || !body || body.rows.length < 3) return;

      var state = { index: -1, dir: "ascending" };
      var headers = [].slice.call(headRow.cells);
      var caption = tbl.querySelector("caption");   // names the table when its
                                                    // sort is announced

      headers.forEach(function (th, index) {
        var label = th.textContent.trim();
        th.setAttribute("aria-sort", "none");
        th.textContent = "";

        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "sort-btn";
        btn.textContent = label;
        th.appendChild(btn);

        btn.addEventListener("click", function () {
          if (state.index === index) {
            state.dir = state.dir === "ascending" ? "descending" : "ascending";
          } else {
            state.index = index;
            state.dir = "ascending";
          }
          apply();
        });
      });

      function cellOf(row, index) {
        // Sorting the Certificates "Verify" column would otherwise compare the
        // sr-only new-tab notes rather than the link text.
        return readableText(row.cells[index]);
      }

      function apply() {
        var rows = [].slice.call(body.rows);
        var factor = state.dir === "ascending" ? 1 : -1;

        rows.sort(function (a, b) {
          var av = sortValue(cellOf(a, state.index));
          var bv = sortValue(cellOf(b, state.index));

          // Numeric where both sides are numeric, text where they are not.
          // Mixed columns fall back to text rather than comparing a number
          // against NaN and returning an order that depends on input sequence.
          if (av.n !== null && bv.n !== null && av.n !== bv.n) {
            return (av.n - bv.n) * factor;
          }
          if (av.s !== bv.s) return av.s.localeCompare(bv.s) * factor;
          return 0;
        });

        rows.forEach(function (row) { body.appendChild(row); });

        // aria-sort is the single source of truth; the arrow is drawn from it.
        headers.forEach(function (th, i) {
          th.setAttribute("aria-sort", i === state.index ? state.dir : "none");
        });

        /* Said out loud, not only shown. aria-sort states what a header *is*,
           but a reader who has just activated it hears nothing about the twelve
           rows that reordered underneath. Every other control here announces its
           result; sorting was the one that changed the page silently.

           Polite, and one shared region: a live region per table would let two
           announcements collide. */
        /* First sentence of the caption only. A caption here also tells the
           reader the headers sort, so the whole thing spliced into a sentence
           read "Education history. Column headers sort the table. sorted by
           Qualification, ascending." The name is the first clause; the rest is
           instructions the reader has just finished acting on. */
        announceSort(
          (caption ? readableText(caption).split(". ")[0] : "Table") +
          " sorted by " + headers[state.index].textContent.trim() +
          ", " + state.dir + "."
        );
      }
    });
  }

  /* One sr-only region for every sortable table. Not the visible `.jump-note`:
     that line reports something the reader cannot see for themselves — a
     cleared filter, an abandoned view mode. A reordered table is already on
     screen, so repeating it in print would be noise for everyone who can see it
     and silence for everyone who cannot. */
  var sortSaid = null;

  function announceSort(message) {
    if (!sortSaid) {
      sortSaid = document.createElement("p");
      sortSaid.className = "sr-only";
      sortSaid.id = "sort-status";
      sortSaid.setAttribute("role", "status");
      document.body.appendChild(sortSaid);
    }
    sortSaid.textContent = message;
  }

  /* ── Certificate filters ─────────────────────────────────
     Three selects, built from the rows themselves so a new certificate joins
     the filter options with no second edit. Selects rather than a text box:
     the values are a closed set, and offering free text over a closed set
     invites a query that can only fail (Rulebook §1.5). */
  function initCertFilters() {
    var tbl = document.getElementById("cert-table");
    var box = document.getElementById("cert-filters");
    var statusLine = document.getElementById("cert-status");
    if (!tbl || !box || !statusLine) return;

    var body = tbl.querySelector("tbody");
    var rows = [].slice.call(body.rows);
    var yearSel   = document.getElementById("cert-year");
    var issuerSel = document.getElementById("cert-issuer");
    var typeSel   = document.getElementById("cert-type");
    var reset     = document.getElementById("cert-reset");

    function fill(select, index) {
      var seen = {};
      rows.forEach(function (row) {
        var v = row.cells[index] ? row.cells[index].textContent.trim() : "";
        if (v) seen[v] = 1;
      });
      Object.keys(seen).sort().forEach(function (v) {
        var opt = document.createElement("option");
        opt.value = v;
        opt.textContent = v;
        select.appendChild(opt);
      });
    }

    fill(yearSel, 0);
    fill(issuerSel, 2);
    fill(typeSel, 3);

    function apply() {
      var y = yearSel.value, i = issuerSel.value, t = typeSel.value;
      var passed = 0;

      rows.forEach(function (row) {
        var ok =
          (!y || row.cells[0].textContent.trim() === y) &&
          (!i || row.cells[2].textContent.trim() === i) &&
          (!t || row.cells[3].textContent.trim() === t);
        row.classList.toggle("filtered-out", !ok);
        if (ok) passed++;
      });

      /* Counted after the class is set, and by what the reader can actually
         see — not by what passed the filter. A view mode hides rows in CSS, so
         a row can pass every filter and still not be on the page: year 2024 in
         the Developer view left one match, all of it hidden, and the status
         line said "Showing 1 of 7" over a visibly empty table. A status that
         contradicts the page is worse than none. */
      var shown = 0;
      rows.forEach(function (row) {
        if (window.getComputedStyle(row).display !== "none") shown++;
      });

      var mode = VIEW_LABEL[viewMode] || "";

      // An empty result is a sentence with a way out of it, never a blank
      // table (Rulebook §1.9, and the same contract the Projects filter keeps).
      if (!y && !i && !t) {
        statusLine.textContent = shown === rows.length
          ? rows.length + " certificates. Filter by year, issuer or type."
          : shown + " of " + rows.length + " certificates — the " + mode +
            " view is hiding the rest. Filter by year, issuer or type.";
      } else if (shown === 0 && passed > 0) {
        /* The filter is not the thing in the way, so Reset would not fix it.
           Name the control that is actually hiding the row. */
        statusLine.textContent =
          passed + (passed === 1 ? " certificate matches" : " certificates match") +
          " those filters, but the " + mode +
          " view is hiding them. Select Everything to see them.";
      } else if (shown === 0) {
        statusLine.textContent =
          "No certificates match those filters. Select Reset to see all " +
          rows.length + ".";
      } else {
        statusLine.textContent =
          "Showing " + shown + " of " + rows.length + " certificates.";
      }

      syncNavEmpty();
    }

    /* A view mode changes what is visible without touching a filter, so the
       count has to be recomputed when one is chosen. Registered here rather
       than called from initViewModes() so the filter owns its own status
       sentence — the alternative is the view mode knowing how to phrase it. */
    document.addEventListener("viewmodechange", apply);

    [yearSel, issuerSel, typeSel].forEach(function (sel) {
      sel.addEventListener("change", apply);
    });

    function clear() {
      yearSel.value = "";
      issuerSel.value = "";
      typeSel.value = "";
      apply();
    }

    reset.addEventListener("click", clear);

    // Reset already existed; the register just borrows it, so the control the
    // reader would have clicked and the one a search jump clicks are the same
    // code and cannot drift apart.
    registerUndo(
      "the certificate filters",
      function (node) { return !!(node.closest && node.closest("#certificates")); },
      function () { return !!(yearSel.value || issuerSel.value || typeSel.value); },
      clear
    );

    apply();
  }

  /* ── Blocks a filter emptied ─────────────────────────────
     A filter can leave a table as a header row over nothing, standing under a
     sub-heading that names an affiliation which had no role that year. The
     print side already collapses that pair (collapseEmptyTables); this is the
     same rule on screen, so the year bar and the view modes cannot disagree
     about whether a block is still worth drawing.

     Two deliberate choices:
      - Only blocks introduced by a .subhead are collapsed. Projects and
        Certificates state their own empty result in words, and hiding a table
        that has already said "no matches" would remove the explanation.
      - Emptiness is each row's OWN computed display, not offsetParent. A
        closed fold hides rows without filtering any of them; reading that as
        emptiness would set .block-empty and leave the block hidden after the
        fold reopened. */
  function syncEmptyBlocks() {
    document.querySelectorAll(".table-wrap").forEach(function (wrap) {
      var head = wrap.previousElementSibling;
      if (!head || !head.classList.contains("subhead")) return;

      var body = wrap.querySelector("tbody");
      if (!body || body.rows.length === 0) return;

      var live = [].some.call(body.rows, function (row) {
        return window.getComputedStyle(row).display !== "none";
      });

      wrap.classList.toggle("block-empty", !live);
      head.classList.toggle("block-empty", !live);
    });
  }

  /* ── Sections nothing is currently showing in ────────────
     A view mode or a filter can take every row out of a section, and the nav
     then points at a heading over nothing. The item is MARKED rather than
     removed: a nav entry that disappears takes the reader's map with it and
     offers no reason, where a marked one says the section exists and nothing in
     it matches right now — and stays clickable, so nothing is gated behind
     undoing the control first (§3.8).

     Run from the filters as well as from the view modes, deliberately. Scoping
     it to view modes alone was the first build, and on this page's content no
     view mode empties a whole section, so the mark could never appear at all —
     a feature that is correct and unreachable is worse than one that is not
     built. Whatever emptied the section, the nav is answering the same
     question, and answering it from one place means the two causes cannot
     disagree.

     Only sections that have rows are judged. About and Links carry prose rather
     than a table, and "no visible rows" would call them empty when they are
     among the fullest things on the page. And emptiness is each row's own
     computed display for the third time in this file, for the third time
     because a closed fold must not be mistaken for a filter. */
  function syncNavEmpty() {
    [].forEach.call(document.querySelectorAll(".site-nav a"), function (link) {
      var section = document.getElementById(link.getAttribute("href").slice(1));
      if (!section) return;

      var rows = section.querySelectorAll("tbody tr");
      var empty = rows.length > 0 && ![].some.call(rows, function (row) {
        return window.getComputedStyle(row).display !== "none";
      });

      var note = link.querySelector(".sr-only");
      if (empty) {
        link.setAttribute("data-empty", "true");
        // A title attribute would be unreachable by keyboard and unread by a
        // screen reader that is walking links; a note inside the link is both.
        // readableText() strips .sr-only, so this cannot leak into the search
        // index or the JSON view.
        if (!note) {
          note = document.createElement("span");
          note.className = "sr-only";
          note.textContent = " — nothing to show here right now";
          link.appendChild(note);
        }
      } else {
        link.removeAttribute("data-empty");
        if (note) link.removeChild(note);
      }
    });
  }

  /* ── Experience by year ──────────────────────────────────
     A year index rather than a decorated timeline: the data is already a table
     with a Period column, so the years are read out of it instead of being
     written a second time. A role spanning 2024–2025 answers to both. */
  function initYearFilter() {
    var bar = document.getElementById("year-bar");
    var statusLine = document.getElementById("year-status");
    var section = document.getElementById("experience");
    if (!bar || !statusLine || !section) return;

    var rows = [].slice.call(section.querySelectorAll("tbody tr"));
    if (rows.length === 0) return;

    var thisYear = new Date().getFullYear();
    var seen = {};

    function yearsOf(row) {
      // The Period column is third in every Experience table on this page.
      var cell = row.cells[2];
      if (!cell) return [];
      var raw = cell.textContent;
      var found = raw.match(/\d{4}/g) || [];
      var from = found.length ? Number(found[0]) : null;
      var to = found.length > 1 ? Number(found[1]) : null;
      if (from === null) return [];
      if (to === null) to = /present/i.test(raw) ? thisYear : from;
      var out = [];
      for (var y = from; y <= to && y <= thisYear + 1; y++) out.push(y);
      return out;
    }

    rows.forEach(function (row) {
      yearsOf(row).forEach(function (y) { seen[y] = (seen[y] || 0) + 1; });
    });

    var years = Object.keys(seen).map(Number).sort(function (a, b) { return b - a; });
    if (years.length < 2) return;

    var active = null;

    function apply() {
      var passed = 0;
      rows.forEach(function (row) {
        var ok = active === null || yearsOf(row).indexOf(active) !== -1;
        row.classList.toggle("filtered-out", !ok);
        if (ok) passed++;
      });

      // Counted from the page, not from the filter — same reason as the
      // certificate filter: a view mode can hide a row that passed.
      var shown = 0;
      rows.forEach(function (row) {
        if (window.getComputedStyle(row).display !== "none") shown++;
      });

      [].forEach.call(bar.querySelectorAll(".chip"), function (btn) {
        var v = btn.getAttribute("data-year");
        var on = active === null ? v === "" : Number(v) === active;
        btn.setAttribute("aria-pressed", on ? "true" : "false");
      });

      var mode = VIEW_LABEL[viewMode] || "";

      statusLine.hidden = active === null;
      if (active !== null) {
        statusLine.textContent = (shown === 0 && passed > 0)
          ? passed + (passed === 1 ? " role ran" : " roles ran") + " during " +
            active + ", but the " + mode + " view is hiding them. Select " +
            "Everything to see them."
          : "Showing " + shown + " of " + rows.length +
            " roles running during " + active + ". Select “All years” to see them all.";
      } else {
        statusLine.textContent = "";
      }

      syncEmptyBlocks();
      syncNavEmpty();
    }

    document.addEventListener("viewmodechange", apply);

    function chip(value, label) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip";
      btn.setAttribute("data-year", value === null ? "" : String(value));
      btn.setAttribute("aria-pressed", "false");
      btn.textContent = label;
      btn.addEventListener("click", function () {
        active = value;
        apply();
      });
      bar.appendChild(btn);
    }

    chip(null, "All years");
    years.forEach(function (y) { chip(y, y + " (" + seen[y] + ")"); });

    // Undoing this one also has to run apply(), not merely reset the variable:
    // apply() is what clears .filtered-out, re-syncs the chips and calls
    // syncEmptyBlocks() to bring back any affiliation the filter had collapsed.
    registerUndo(
      "the Experience year filter",
      function (node) { return !!(node.closest && node.closest("#experience")); },
      function () { return active !== null; },
      function () { active = null; apply(); }
    );

    apply();
  }

  /* ── Site-wide search ────────────────────────────────────
     The index is read out of the page at load, so anything written into
     index.html is searchable without being registered anywhere: no second copy
     of the content, and nothing to forget to update.

     It searches headings, prose, table rows and links, and every result names
     the section it came from — a match with no context is a match the reader
     has to go and find twice. */
  /* Every entry carries the node it came from, not just the id of the section
     containing it. Without that a result for one row out of sixty-six can only
     scroll to the top of Experience and leave the reader to find it again by
     eye — which is the same work the search was supposed to do.

     Holding live nodes is safe here only because the index is rebuilt on every
     open. A node cached across a re-render would be an orphan pointing at a row
     that is no longer in the document. */
  function buildSearchIndex() {
    var entries = [];
    var sections = document.querySelectorAll("main .section[id]");

    [].forEach.call(sections, function (section) {
      var label = sectionLabel(section);

      function add(kind, node, textValue, lang) {
        var t = textValue === undefined ? readableText(node) : textValue;
        if (!t) return;
        entries.push({
          kind: kind,
          section: label,
          sectionId: section.id,
          node: node,
          text: t,
          hay: t.toLowerCase(),
          lang: lang || ""
        });
      }

      add("Section", section, label);

      [].forEach.call(section.querySelectorAll(".subhead"), function (node) {
        add("Heading", node);
      });

      [].forEach.call(section.querySelectorAll(".section-body > p"), function (node) {
        add("Text", node);
      });

      [].forEach.call(section.querySelectorAll("tbody tr"), function (row) {
        var t = [].map.call(row.cells, function (c) {
          return readableText(c);
        }).filter(Boolean).join(" · ");
        // data-lang is written by renderRows() from the API's own field, so
        // `lang:` filters on what GitHub reported rather than on whether the
        // word happens to appear in a description.
        add("Row", row, t, (row.getAttribute("data-lang") || "").toLowerCase());
      });
    });

    return entries;
  }

  /* ── Search syntax ───────────────────────────────────────
     `section:skills sql`, `type:row python`, `year:2026`, `lang:python`. An
     accelerator, documented in the ? reference rather than printed above the
     input: putting a manual in front of everyone who only wanted to type a word
     is the wrong trade.

     An unrecognised prefix is searched for literally and the status line says
     so. The strict alternative — reject the query and list the valid keys —
     punishes a colon typed in ordinary prose ("note: python") with a failure,
     and a search that fails on plain English is worse than one that ignores a
     prefix it does not know. */
  var QUERY_KEYS = { section: 1, type: 1, year: 1, lang: 1 };

  function parseQuery(raw) {
    var out = { terms: [], filters: {}, unknown: [] };

    raw.split(" ").forEach(function (word) {
      if (!word) return;
      var at = word.indexOf(":");
      // A colon at either end is punctuation, not a prefix.
      if (at > 0 && at < word.length - 1) {
        var key = word.slice(0, at);
        if (Object.prototype.hasOwnProperty.call(QUERY_KEYS, key)) {
          out.filters[key] = word.slice(at + 1);
          return;
        }
        if (out.unknown.indexOf(key) === -1) out.unknown.push(key);
      }
      out.terms.push(word);
    });

    return out;
  }

  function entryMatches(entry, parsed) {
    var f = parsed.filters;

    if (f.section &&
        entry.sectionId.indexOf(f.section) !== 0 &&
        entry.section.toLowerCase().indexOf(f.section) === -1) return false;

    if (f.type && entry.kind.toLowerCase().indexOf(f.type) !== 0) return false;
    if (f.year && entry.hay.indexOf(f.year) === -1) return false;
    if (f.lang && entry.lang.indexOf(f.lang) === -1) return false;

    for (var i = 0; i < parsed.terms.length; i++) {
      if (entry.hay.indexOf(parsed.terms[i]) === -1) return false;
    }
    return true;
  }

  /* ── Landing on the match ────────────────────────────────
     A hit can be inside a closed fold, behind a filter, or hidden by a view
     mode. Jumping to it regardless lands the reader on nothing and gives them
     no reason, so the jump clears what is in the way and states what it
     changed — the same contract the error paths keep, pointed the other way.

     Order matters. The fold is opened first because it is the cheapest and
     least surprising undo, and because opening it may be enough on its own; the
     view mode next; a filter last, since it is the one the reader most likely
     set on purpose. Each step re-tests whether the node is still hidden, so
     nothing is cleared that was not actually in the way. */
  var HIGHLIGHT_NAME = "search-hit-mark";
  var hitTimer = null;
  var flashedNode = null;

  function reducedMotion() {
    return !!(window.matchMedia &&
              window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  function stillHidden(node) {
    return node.getClientRects().length === 0;
  }

  function clearHit() {
    if (window.CSS && window.CSS.highlights) {
      window.CSS.highlights.delete(HIGHLIGHT_NAME);
    }
    if (flashedNode) {
      flashedNode.classList.remove("hit-flash");
      flashedNode = null;
    }
    if (hitTimer) {
      window.clearTimeout(hitTimer);
      hitTimer = null;
    }
  }

  /* The CSS Custom Highlight API paints a Range without inserting anything.
     That is the whole reason it is used: a <mark> wrapper would be read back
     out by readableText(), which feeds the search index, the JSON view and the
     résumé line budget — the exact bug family that has already cost three
     rounds here. Nothing inserted means nothing to unwrap and nothing to leak.

     Where the API is missing the row is flashed instead. Less precise, still an
     answer to "which one of these did I match". */
  function markHit(node, needle) {
    clearHit();
    var painted = false;

    if (needle && window.CSS && window.CSS.highlights &&
        typeof window.Highlight === "function") {
      var hl = new window.Highlight();
      var walk = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null);
      var t;
      while ((t = walk.nextNode())) {
        var hay = t.data.toLowerCase();
        var at = hay.indexOf(needle);
        while (at !== -1) {
          var range = document.createRange();
          range.setStart(t, at);
          range.setEnd(t, at + needle.length);
          hl.add(range);
          painted = true;
          at = hay.indexOf(needle, at + needle.length);
        }
      }
      if (painted) window.CSS.highlights.set(HIGHLIGHT_NAME, hl);
    }

    // Also the fallback when the term matched only the assembled row text: a
    // row's index entry joins its cells with " · ", a separator that exists in
    // no text node, so a query spanning two cells has nothing to paint.
    if (!painted) {
      node.classList.add("hit-flash");
      flashedNode = node;
    }

    hitTimer = window.setTimeout(clearHit, 2600);
  }

  function revealEntry(entry, needle, say) {
    var node = entry.node;
    var changed = [];

    if (focusId && entry.sectionId !== focusId && setFocusSection) {
      setFocusSection("");
      changed.push("left focus mode");
    }

    var fold = node.closest ? node.closest("details.section-fold") : null;
    if (fold && !fold.open) {
      fold.open = true;
      changed.push("opened the fold");
    }

    if (stillHidden(node) && viewMode && leaveViewMode) {
      changed.push("switched out of the " + (VIEW_LABEL[viewMode] || viewMode) + " view");
      leaveViewMode();
    }

    undoRegister.forEach(function (undoer) {
      if (!stillHidden(node)) return;
      if (!undoer.owns(node) || !undoer.active()) return;
      undoer.undo();
      changed.push("cleared " + undoer.name);
    });

    /* The list is passed alongside the sentence, not instead of it. Search wants
       the sentence and nothing else; the evidence links need to name the skill
       first and append what moved, and re-deriving that from a formatted string
       would be parsing our own prose. */
    if (say) {
      say(changed.length
        ? "Showing " + entry.section + " — " + changed.join(", ") + "."
        : "", changed);
    }

    /* Scrolled synchronously, deliberately. Every undo above is a synchronous
       DOM change and scrollIntoView flushes layout itself before it measures,
       so there is nothing a frame's delay would wait for. An earlier version
       did wrap this in requestAnimationFrame as belt and braces; rAF does not
       fire at all in a tab that is not compositing, which turned a needless
       precaution into a way for the jump to silently never happen.

       block:"center" rather than "start": a table row scrolled to the top of
       the viewport lands underneath the sticky header unless every row carries
       scroll-margin-top, and centring sidesteps the header instead of
       negotiating with it. See layout.md §2. */
    if (stillHidden(node)) return;   // something else owns it — do not scroll to nothing
    node.scrollIntoView({
      block: "center",
      behavior: reducedMotion() ? "auto" : "smooth"
    });
    markHit(node, needle);
  }

  /* ── Evidence links ──────────────────────────────────────
     The Skills table has always named where each skill was used. Those names
     were prose, so the claim "every level points at a row that exists" was
     true only for as long as someone kept checking it by eye — and nothing
     could reverse it to ask which skills a given row supports.

     They are real links now, and they go through revealEntry() rather than
     letting the browser follow the hash. The difference is everything a jump
     has to do here: a coursework row can be behind a closed fold, a year
     filter or a view mode, and the native hash jump would scroll to a row that
     is display:none and leave the reader looking at whatever happens to be
     there. Same path as search, so a filter that registers its undo once is
     reversible from both.

     The reverse direction — which skill sent you — is said in the existing
     `.jump-note`, deliberately not written into the row. Inserting a caption
     into a table cell is the bug family that has already cost three rounds:
     readableText() would read it straight back out into the search index, the
     JSON view and the résumé line budget. A sentence in the status line costs
     nothing and disappears on its own. */
  function initEvidenceLinks() {
    var skills = document.getElementById("skills");
    if (!skills) return;

    document.addEventListener("click", function (event) {
      var link = event.target.closest ? event.target.closest("a.ev-link") : null;
      if (!link) return;
      // Modified clicks belong to the browser: the href is a real href, so
      // open-in-new-tab has to keep working rather than being swallowed here.
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ||
          event.button !== 0) return;

      var id = (link.getAttribute("href") || "").slice(1);
      var target = id ? document.getElementById(id) : null;
      if (!target) return;           // a dead evidence link falls back to the
                                     // browser, which is honest about it

      // Some evidence names a cell rather than a row, because the name lives in
      // the second column. Flash and centre the whole row anyway — a lone lit
      // cell says "this word", and the answer is the row.
      var node = target.closest ? (target.closest("tr") || target) : target;
      var section = node.closest ? node.closest(".section") : null;
      if (!section) return;

      /* The skill is the row's first <td>, not its <th scope="row">: that header
         is the category ("Software", "Professional", "Language"), repeated down
         the group. Reading the header instead produced "Evidence for
         Professional", which names four rows and answers nothing. */
      var row = link.closest ? link.closest("tr") : null;
      var skillCell = row ? row.querySelector("td") : null;
      var skill = skillCell ? readableText(skillCell) : "";

      event.preventDefault();
      revealEntry(
        { node: node, sectionId: section.id, section: sectionLabel(section) },
        "",
        function (_sentence, changed) {
          var where = sectionLabel(section);
          var lead = skill
            ? "Evidence for " + skill + " — " + where
            : "Showing " + where;
          if (changed && changed.length) lead += ", " + changed.join(", ");
          if (sayJump) sayJump(lead + ".");
        }
      );
    });
  }

  initEvidenceLinks();

  /* ── Commands ────────────────────────────────────────────
     Built from the page, not from a list kept beside it. Section jumps come
     from the nav, and every other command wraps a control that already exists
     and clicks it — so the palette and the button do the same thing by
     construction rather than by anyone remembering to keep them in step, and a
     control added later joins the palette with no second edit.

     Two commands have no button anywhere: focusing a section and leaving focus.
     Those are the only ones written out by hand, and they are written here
     rather than drawn on the page because the palette is the whole point of
     focus mode having no chrome of its own.

     A control that is hidden or disabled is skipped. The keyboard-reference
     button is hidden on touch, so on a phone the palette correctly does not
     offer to open a list of keys the device does not have. */
  /* `.qr-btn` is named on its own because it is drawn as a `.copy-btn` — a small
     chip beside the address rather than a filled button — so it is not caught by
     `button.button`. The Copy buttons themselves are deliberately still absent:
     eight commands all reading "Copy" would say nothing about which address. */
  var COMMAND_SOURCES =
    "main button.button, main button.fold-toggle, main button.qr-btn, " +
    ".view-switch button, .site-footer button.button";

  function buildCommands() {
    var out = [];

    function add(group, label, run) {
      out.push({ group: group, label: label, hay: label.toLowerCase(), run: run });
    }

    [].forEach.call(document.querySelectorAll(".site-nav a"), function (link) {
      var id = link.getAttribute("href").slice(1);
      if (!document.getElementById(id)) return;
      add("Go to", "Go to " + readableText(link), function () {
        goToSection(id);
      });
    });

    if (setFocusSection) {
      if (focusId) {
        add("Focus", "Leave focus mode", function () { setFocusSection(""); });
      } else {
        var here = sectionToFocus();
        if (here) {
          add("Focus", "Focus one section — " + sectionLabel(here), function () {
            setFocusSection(here.id);
          });
        }
      }
    }

    [].forEach.call(document.querySelectorAll(COMMAND_SOURCES), function (btn) {
      if (btn.hidden || btn.disabled || (btn.closest && btn.closest("dialog"))) return;
      var label = readableText(btn);
      if (!label) return;
      // "Everything" / "Recruiter" / "Developer" name a state, not an action.
      // Beside a table of controls they read fine; in a list of commands they
      // have to say what pressing them does.
      if (btn.closest(".view-switch")) label = "Switch to the " + label + " view";
      add("Do", label, function () { btn.click(); });
    });

    /* Offered only when something is actually on. A permanent "Reset" in a page
       with nothing to reset is a control that does nothing the first time anyone
       tries it, which teaches them not to try again. */
    if (stateToReset().length) {
      add("Do", "Reset the view — " + stateToReset().join(", "), resetView);
    }

    return out;
  }

  /* ── Reset the view ──────────────────────────────────────
     Every state here is individually reversible; what was missing was one way
     out of all of them at once. A reader who has stacked a view mode, a year, a
     topic, a search and a sort has five separate controls to find, and the
     browser's Back button was doing the job by accident.

     Built from the undo register and the two hooks, not from its own list of
     things to clear. A hard-coded list is a list that silently misses the sixth
     filter — the same argument the register was created for. */
  function stateToReset() {
    var on = [];
    if (focusId) on.push("focus mode");
    if (viewMode) on.push("the " + (VIEW_LABEL[viewMode] || viewMode) + " view");
    undoRegister.forEach(function (u) {
      if (u.active()) on.push(u.name);
    });
    return on;
  }

  function resetView() {
    var cleared = stateToReset();
    if (!cleared.length) return;

    // Focus mode first: it hides the most, and leaving it may be all that was
    // wanted. Same order as a search jump, so the two cannot disagree about
    // what "undo everything" means.
    if (focusId && setFocusSection) setFocusSection("");
    if (viewMode && leaveViewMode) leaveViewMode();
    undoRegister.forEach(function (u) {
      if (u.active()) u.undo();
    });

    if (sayJump) sayJump("Reset — cleared " + cleared.join(", ") + ".");
  }

  function goToSection(id) {
    var target = document.getElementById(id);
    if (!target) return;
    var fold = target.querySelector("details.section-fold");
    if (fold && !fold.open) fold.open = true;
    window.location.hash = "#" + id;
  }

  function initSearch() {
    var dialog  = document.getElementById("search-dialog");
    var input   = document.getElementById("search-input");
    var results = document.getElementById("search-results");
    var statusLine = document.getElementById("search-status");
    if (!dialog || !input || !results || typeof dialog.showModal !== "function") return;

    var index = null;
    var MAX = 25;

    /* Where the page is told what a jump just changed under it. Created here
       rather than written into index.html because it has nothing to say until
       a search moves something, and an empty status line sitting under the
       header for every visitor who never searches is furniture.

       It is a real sentence on the page, not an sr-only one: the change it
       reports is visual — a filter cleared, a view switched — so a reader who
       can see the page is exactly who needs telling. */
    var note = document.createElement("p");
    note.className = "jump-note";
    note.id = "jump-note";
    note.setAttribute("role", "status");
    note.hidden = true;
    var noteTimer = null;
    document.body.appendChild(note);

    sayJump = say;

    function say(text) {
      if (noteTimer) window.clearTimeout(noteTimer);
      note.textContent = text;
      note.hidden = !text;
      if (text) {
        noteTimer = window.setTimeout(function () {
          note.hidden = true;
          note.textContent = "";
        }, 7000);
      }
    }

    function group(label) {
      var li = document.createElement("li");
      li.className = "search-group";
      li.textContent = label;
      results.appendChild(li);
    }

    function commandRow(cmd) {
      var li = document.createElement("li");
      li.className = "search-hit";

      var btn = document.createElement("button");
      btn.type = "button";           // inside <form method="dialog">, the
                                     // default would submit and close it

      var mark = document.createElement("span");
      mark.className = "search-cmd-mark";
      mark.textContent = "›";
      mark.setAttribute("aria-hidden", "true");

      var what = document.createElement("span");
      what.className = "search-what";
      what.textContent = cmd.label;

      btn.appendChild(mark);
      btn.appendChild(what);
      btn.addEventListener("click", function () {
        dialog.close();
        cmd.run();
      });

      li.appendChild(btn);
      results.appendChild(li);
    }

    /* A window around the match, not the first 160 characters.
       An About paragraph is longer than the window, so truncating from the start
       could report a hit whose matched word was not in the text shown — the
       result said "this matched" and then showed no evidence of it. Worst in the
       longest entries, which are exactly the ones needing a snippet.

       Returns plain text for textContent. Marking the matched characters would
       mean child nodes inside `.search-what`, and this string is also what a
       screen reader reads as the link's description — the highlight on the page
       itself already answers "which word", once you land. */
    function snippet(text, needle, max) {
      if (!text) return "";
      if (text.length <= max) return text;

      var at = needle ? text.toLowerCase().indexOf(needle.toLowerCase()) : -1;
      if (at === -1) return text.slice(0, max) + "…";

      // Roughly a quarter of the window ahead of the match, so the reader sees
      // what it was part of rather than the match sitting at the left edge.
      var lead = Math.floor(max / 4);
      var start = Math.max(0, at - lead);
      var end = Math.min(text.length, start + max);
      // Near the end of the string, spend the leftover window backwards.
      if (end === text.length) start = Math.max(0, end - max);

      return (start > 0 ? "…" : "") + text.slice(start, end).trim() +
             (end < text.length ? "…" : "");
    }

    function hitRow(entry, needle) {
      var li = document.createElement("li");
      li.className = "search-hit";

      var a = document.createElement("a");
      a.className = "text-link";
      a.href = "#" + entry.sectionId;

      var where = document.createElement("span");
      where.className = "search-where";
      where.textContent = entry.section + " · " + entry.kind;

      var what = document.createElement("span");
      what.className = "search-what";
      what.textContent = snippet(entry.text, needle, 160);

      a.appendChild(where);
      a.appendChild(what);

      /* preventDefault, then reveal. The href is kept so the result is a real
         link — middle-click, copy-link and the status bar all still work, and
         it degrades to the section anchor if this handler ever throws — but
         letting the browser follow it would scroll to the section instead of
         to the row, and would do it before the fold had opened. */
      a.addEventListener("click", function (event) {
        event.preventDefault();
        dialog.close();
        revealEntry(entry, needle, say);
      });

      li.appendChild(a);
      results.appendChild(li);
    }

    function run() {
      var raw = input.value.replace(/\s+/g, " ").trim();
      results.textContent = "";

      /* A leading ">" asks for the controls and nothing else. It is an
         accelerator, never a requirement: the same list is what the dialog
         shows before anything is typed, so nobody has to know the character
         exists to find a command. */
      var commandsOnly = raw.charAt(0) === ">";
      if (commandsOnly) raw = raw.slice(1).trim();

      var parsed = parseQuery(raw.toLowerCase());
      var filtered = Object.keys(parsed.filters).length > 0;

      // A prefixed query is a question about the page, so the controls stand
      // out of the way — "type:row export" is looking for a row, not a button.
      var commands = filtered ? [] : buildCommands().filter(function (cmd) {
        return parsed.terms.every(function (term) {
          return cmd.hay.indexOf(term) !== -1;
        });
      });

      /* Two characters before the page itself is searched: one letter matches
         most of the document and the list would be noise. An empty box searches
         it not at all — with no terms and no filters every entry matches, and
         opening the dialog would dump all 112 of them under the commands.

         Commands have no such floor. There are a couple of dozen, and the whole
         point is that they are visible from the first keystroke and from none
         at all. */
      var hits = (commandsOnly || !raw || raw.length < 2)
        ? []
        : index.filter(function (entry) { return entryMatches(entry, parsed); });

      var needle = parsed.terms.length ? parsed.terms[0] : "";

      if (commands.length) {
        group(hits.length ? "Commands" : "Commands — press Enter to run the first");
        commands.slice(0, MAX).forEach(commandRow);
      }

      if (hits.length) {
        if (commands.length) group("On this page");
        hits.slice(0, MAX).forEach(function (entry) { hitRow(entry, needle); });
      }

      // Every branch below states what was searched and what to do next; none
      // of them leaves the reader looking at an empty box (Rulebook §1.9).
      var unknown = parsed.unknown.length
        ? " There is no filter named “" + parsed.unknown[0] +
          "” — that word was searched for literally."
        : "";

      if (!commands.length && !hits.length) {
        statusLine.textContent = raw
          ? "Nothing on this page matches “" + raw + "”." + unknown +
            " Try a language, an organisation or a role."
          : "Type to search, or pick a command below.";
        return;
      }

      // The opening state says what the list is and what typing will do, rather
      // than counting commands nobody asked to have counted.
      if (!raw) {
        statusLine.textContent =
          "Type to search this page, or pick one of these " +
          commands.length + " commands.";
        return;
      }

      var parts = [];
      if (commands.length) {
        parts.push(commands.length + (commands.length === 1 ? " command" : " commands"));
      }
      if (hits.length) {
        parts.push(hits.length + (hits.length === 1 ? " match" : " matches") +
                   (hits.length > MAX ? ", showing the first " + MAX : ""));
      }
      statusLine.textContent =
        parts.join(" and ") + "." + unknown + " Enter opens the first.";
    }

    input.addEventListener("input", run);

    // Enter follows the first result rather than submitting the form, which
    // would only close the dialog and lose the search.
    input.addEventListener("keydown", function (event) {
      if (event.key !== "Enter") return;
      event.preventDefault();
      var first = results.querySelector("a, button");
      if (first) first.click();
    });

    // Arrow keys walk the list without reaching for the mouse. Commands are
    // buttons and content hits are links, so both have to be collected.
    dialog.addEventListener("keydown", function (event) {
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      var items = [].slice.call(results.querySelectorAll("a, button"));
      if (items.length === 0) return;
      event.preventDefault();
      var at = items.indexOf(document.activeElement);
      if (event.key === "ArrowDown") {
        items[at + 1 >= items.length ? 0 : at + 1].focus();
      } else if (at <= 0) {
        input.focus();
      } else {
        items[at - 1].focus();
      }
    });

    /* Closing the dialog leaves focus sitting in this input — the element is
       still in the document, merely inside a dialog that is no longer open.
       Every shortcut below stands down while focus is in a text field, so
       without this the first Escape out of the search box kills the keyboard
       for the rest of the visit, and nothing on screen says why. */
    dialog.addEventListener("close", function () {
      if (document.activeElement === input) input.blur();
    });

    window.__openSearch = function () {
      // Rebuilt on open rather than at load: the Projects rows do not exist
      // until the API answers, so an index built at load would quietly never
      // find a repository. Rebuilt on every open rather than once, because
      // sorting, filtering and the view modes all change what is in the page —
      // and once per open is cheap where once per keystroke would not be.
      index = buildSearchIndex();
      input.value = "";
      dialog.showModal();
      /* run() with an empty box, so the dialog opens showing every command
         rather than a blank prompt. This is the whole accommodation for readers
         who are not going to learn a syntax: a recruiter presses Search and is
         looking at "Switch to the Recruiter view" and "Build a PDF…" without
         having typed, read or known anything. */
      run();
      input.focus();
    };

    /* The header control. Unhidden only now, at the point where the dialog is
       known to exist and showModal() is known to work — a Search button that
       opens nothing is worse than no button (Nielsen §1.5). */
    var opener = document.getElementById("search-open");
    if (opener) {
      opener.hidden = false;
      opener.addEventListener("click", window.__openSearch);

      // The shortcut hint follows the same rule the ? reference does: a device
      // with no pointer is never told about a key it does not have.
      var hint = document.getElementById("search-key");
      if (hint && window.matchMedia && window.matchMedia("(hover: hover)").matches) {
        hint.hidden = false;
      }
    }
  }

  /* ── Keyboard shortcuts ──────────────────────────────────
     Installed only where a pointer can hover, on the same reasoning the filter
     shortcut already used: a phone has no key to press, so it is never told
     about one. Every handler stands down inside a text field and while a
     dialog is open, so it can never eat a character someone meant to type. */
  function initKeyboard() {
    if (!window.matchMedia || !window.matchMedia("(hover: hover)").matches) return;

    var keysBtn = document.getElementById("keys-open");
    var keysDlg = document.getElementById("keys-dialog");
    if (keysBtn && keysDlg && typeof keysDlg.showModal === "function") {
      keysBtn.hidden = false;
      keysBtn.addEventListener("click", function () { keysDlg.showModal(); });
    }

    var GO = {
      a: "about", e: "education", x: "experience", s: "skills",
      c: "certificates", p: "projects", l: "links", r: "resume"
    };

    var pendingG = false;
    var gTimer;

    function typing() {
      var el = document.activeElement;
      if (!el) return false;
      // A field inside a dialog that is closed is not a field anyone is typing
      // in — it is a field nobody can even see. Belt and braces alongside the
      // blur-on-close above: either alone fixes the dead-keyboard bug, and the
      // cost of holding both is one closest() call per keystroke.
      var box = el.closest && el.closest("dialog");
      if (box && !box.open) return false;
      return !!(el.tagName === "INPUT" || el.tagName === "TEXTAREA" ||
                el.tagName === "SELECT" || el.isContentEditable);
    }

    document.addEventListener("keydown", function (event) {
      if (event.altKey) return;

      // Ctrl+K / Cmd+K opens search even from inside a field — it is the one
      // shortcut whose whole purpose is to move focus somewhere else.
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        if (document.querySelector("dialog[open]")) return;
        event.preventDefault();
        if (window.__openSearch) window.__openSearch();
        return;
      }

      if (event.ctrlKey || event.metaKey) return;
      if (typing()) return;
      if (document.querySelector("dialog[open]")) return;

      if (event.key === "/") {
        event.preventDefault();
        if (window.__openSearch) window.__openSearch();
        return;
      }

      if (event.key === "?") {
        event.preventDefault();
        if (keysDlg && typeof keysDlg.showModal === "function") keysDlg.showModal();
        return;
      }

      // Escape leaves focus mode. It reaches here only with no dialog open —
      // the guards above see to that — so it can never steal the Escape that
      // was meant to close one.
      if (event.key === "Escape" && focusId && setFocusSection) {
        event.preventDefault();
        setFocusSection("");
        return;
      }

      if (pendingG) {
        pendingG = false;
        window.clearTimeout(gTimer);
        var id = GO[event.key.toLowerCase()];
        if (!id) return;
        var target = document.getElementById(id);
        if (!target) return;
        event.preventDefault();
        var fold = target.querySelector("details.section-fold");
        if (fold && !fold.open) fold.open = true;
        window.location.hash = "#" + id;
        return;
      }

      /* Focus the section being read. Checked after the chord, so `g` then `f`
         stays a chord that matches nothing rather than quietly becoming focus
         mode — a chord that sometimes does something else is worse than one
         that does nothing. */
      if (event.key.toLowerCase() === "f" && setFocusSection) {
        event.preventDefault();
        if (focusId) {
          setFocusSection("");
        } else {
          var here = sectionToFocus();
          if (here) setFocusSection(here.id);
        }
        return;
      }

      if (event.key.toLowerCase() === "g") {
        pendingG = true;
        // A chord left half-pressed forever would swallow the next keystroke
        // typed a minute later, so it expires.
        gTimer = window.setTimeout(function () { pendingG = false; }, 1200);
      }
    });
  }

  /* ── View modes ──────────────────────────────────────────
     Full is the default and stays the default: a reader who never touches the
     control must still see everything (§3.8). The modes hide marked rows, not
     whole sections, and the class does the work in CSS — JS only records which
     mode is on and writes it to the URL so the view is shareable. */
  function initViewModes() {
    var main = document.getElementById("main");
    if (!main) return;

    var bar = document.querySelector(".fold-controls");
    if (!bar) return;

    var group = document.createElement("span");
    group.className = "view-switch";
    group.setAttribute("role", "group");
    group.setAttribute("aria-label", "View mode");

    var label = document.createElement("span");
    label.className = "view-label";
    label.textContent = "View";
    group.appendChild(label);

    var said = document.createElement("span");
    said.className = "sr-only";
    said.setAttribute("role", "status");

    var MODES = [
      ["", "Everything", "the whole record"],
      ["recruiter", "Recruiter", "study, work and skills, without the co-curricular detail"],
      ["developer", "Developer", "technical work and projects, without the non-technical roles"]
    ];

    MODES.forEach(function (mode) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip";
      btn.setAttribute("data-mode", mode[0]);
      btn.setAttribute("aria-pressed", "false");
      btn.textContent = mode[1];
      btn.addEventListener("click", function () {
        viewMode = mode[0];
        apply();
        said.textContent =
          mode[0] === ""
            ? "Showing everything."
            : mode[1] + " view: " + mode[2] + ". Nothing is deleted — select Everything to restore it.";
        syncURL();
      });
      group.appendChild(btn);
    });

    group.appendChild(said);
    bar.appendChild(group);

    function apply() {
      document.body.classList.toggle("view-recruiter", viewMode === "recruiter");
      document.body.classList.toggle("view-developer", viewMode === "developer");
      [].forEach.call(group.querySelectorAll(".chip"), function (btn) {
        btn.setAttribute(
          "aria-pressed",
          btn.getAttribute("data-mode") === viewMode ? "true" : "false"
        );
      });

      // A view mode hides rows in CSS alone, so it can empty a block the year
      // filter left standing. Same rule, same helper.
      syncEmptyBlocks();
      syncNavEmpty();

      /* Anything that counts visible rows has to recount now. An event rather
         than a call list: a filter added later subscribes itself, where a list
         here would go quietly out of date the day it is forgotten — the same
         reasoning as the undo register. */
      document.dispatchEvent(new CustomEvent("viewmodechange"));
    }

    /* The way out of a mode, for a search jump that has landed on a row the
       mode is hiding. It is the same code path the Everything chip runs — the
       announcement and the URL write included — so the two cannot come to mean
       different things. */
    leaveViewMode = function () {
      viewMode = "";
      apply();
      said.textContent = "Showing everything.";
      syncURL();
    };

    apply();
  }

  /* ── Focus mode ──────────────────────────────────────────
     The third and last mechanism on this page that hides content, next to
     .filtered-out (filters) and data-hide-in (view modes). It gets a body class
     of its own rather than borrowing either, so no two of them ever contend
     over one attribute — the rule §2 of state-and-data.md exists to keep.

     It has no control anywhere on the page while it is off. The way in is the
     command palette, or `f`; the only thing focus mode ever draws is its own
     way out, and only while it is on. Reversed in the print block, because the
     Exit control lives in the header and the header does not print: a PDF taken
     while focused would otherwise be one section with nothing on the page to
     say the other seven were set aside. */
  function initFocusMode() {
    var tools = document.querySelector(".header-tools");
    if (!tools) return;

    var said = document.createElement("span");
    said.className = "sr-only";
    said.setAttribute("role", "status");

    var exit = document.createElement("button");
    exit.type = "button";
    exit.className = "focus-exit";
    exit.hidden = true;
    exit.addEventListener("click", function () { setFocusSection(""); });

    tools.appendChild(exit);
    tools.appendChild(said);

    setFocusSection = function (id) {
      var target = id ? document.getElementById(id) : null;
      // Same check the URL reader makes, because this is also reached from the
      // palette and from a nav click, and one validated path is not three.
      if (id && (!target || !target.classList.contains("section"))) return;

      [].forEach.call(document.querySelectorAll(".focus-target"), function (node) {
        node.classList.remove("focus-target");
      });

      focusId = target ? id : "";
      document.body.classList.toggle("focus-mode", !!focusId);

      if (target) {
        target.classList.add("focus-target");
        var label = sectionLabel(target);
        exit.textContent = "Leave focus · " + label;
        said.textContent = label + " is the only section on screen. Nothing is " +
          "deleted — leave focus to see the rest.";
        // A collapsed fold inside the only section being shown would leave the
        // page as a heading over an empty screen.
        var fold = target.querySelector("details.section-fold");
        if (fold && !fold.open) fold.open = true;
        window.scrollTo(0, 0);
      } else {
        said.textContent = "Left focus mode. Showing the whole page.";
      }

      exit.hidden = !focusId;
      syncURL();
    };

    /* While focused, the nav switches what is focused rather than scrolling to
       a section that is not being rendered. Without this every nav item is a
       link to a blank screen the moment focus mode is on — the nav is the one
       piece of chrome focus mode deliberately keeps, so it has to keep working. */
    document.addEventListener("click", function (event) {
      if (!focusId) return;
      var link = event.target.closest && event.target.closest('.site-nav a[href^="#"]');
      if (!link) return;
      var id = link.getAttribute("href").slice(1);
      if (!document.getElementById(id)) return;
      event.preventDefault();
      setFocusSection(id);
    });

    // A ?focus= that survived a reload. Applied through the same setter, so a
    // restored focus and a fresh one cannot end up in different states.
    if (focusId) {
      var restore = focusId;
      focusId = "";
      setFocusSection(restore);
    }
  }

  /* ── Density ─────────────────────────────────────────────
     A preference about how the reader wants to read, so it is remembered.
     Distinct from fold state, which §3.8 keeps unremembered on purpose:
     forgetting a density resets a preference, forgetting a fold hides content
     behind a click the reader made once and does not remember making. */
  function initDensity() {
    var bar = document.querySelector(".fold-controls");
    if (!bar) return;

    var KEY = "table-density";
    var compact = false;
    try {
      compact = window.localStorage.getItem(KEY) === "compact";
    } catch (e) { /* private mode: default density, no error */ }

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "fold-toggle";

    function sync() {
      document.body.classList.toggle("density-compact", compact);
      btn.textContent = compact ? "Comfortable rows" : "Compact rows";
      btn.setAttribute("aria-pressed", compact ? "true" : "false");
    }

    btn.addEventListener("click", function () {
      compact = !compact;
      sync();
      try {
        window.localStorage.setItem(KEY, compact ? "compact" : "comfortable");
      } catch (e) { /* not remembering it is not a reason to not do it */ }
    });

    sync();
    bar.appendChild(btn);
  }

  /* ── The page as JSON ────────────────────────────────────
     Read out of the DOM when the dialog opens, not stored beside it. A second
     copy would be a second thing to keep true, and the first time they
     disagreed the machine-readable one would be the one nobody noticed. */
  function initJSON() {
    var openBtn = document.getElementById("json-open");
    var dialog  = document.getElementById("json-dialog");
    var out     = document.getElementById("json-out");
    var copyBtn = document.getElementById("json-copy");
    if (!openBtn || !dialog || !out || typeof dialog.showModal !== "function") {
      if (openBtn) openBtn.remove();
      return;
    }

    function build() {
      var data = {
        name: "'Affan Najiy bin Rusdi",
        role: "Computer Science Undergraduate",
        source: window.location.origin + window.location.pathname,
        generated: new Date().toISOString(),
        sections: []
      };

      [].forEach.call(document.querySelectorAll("main .section[id]"), function (section) {
        var entry = {
          id: section.id,
          title: sectionLabel(section),
          prose: [],
          tables: []
        };

        [].forEach.call(section.querySelectorAll(".section-body > p"), function (p) {
          if (p.classList.contains("hint")) return;
          var t = readableText(p);
          if (t) entry.prose.push(t);
        });

        [].forEach.call(section.querySelectorAll("table.grid-table"), function (tbl) {
          var headCells = tbl.querySelectorAll("thead th");
          var columns = [].map.call(headCells, function (th) {
            return readableText(th);
          });
          var rows = [].map.call(tbl.querySelectorAll("tbody tr"), function (tr) {
            return [].map.call(tr.cells, function (c) {
              return readableText(c);
            });
          });
          if (rows.length) entry.tables.push({ columns: columns, rows: rows });
        });

        data.sections.push(entry);
      });

      return JSON.stringify(data, null, 2);
    }

    openBtn.addEventListener("click", function () {
      out.textContent = build();
      dialog.showModal();
    });

    if (copyBtn) {
      var timer;
      copyBtn.addEventListener("click", function () {
        if (!navigator.clipboard || !navigator.clipboard.writeText) {
          copyBtn.textContent = "Select the text and press Ctrl+C";
          return;
        }
        navigator.clipboard.writeText(out.textContent).then(
          function () { copyBtn.textContent = "Copied"; },
          function () { copyBtn.textContent = "Press Ctrl+C"; }
        );
        window.clearTimeout(timer);
        timer = window.setTimeout(function () {
          copyBtn.textContent = "Copy JSON";
        }, 2500);
      });
    }
  }

  /* ── System panel ────────────────────────────────────────
     Every value here is measured, not typed. document.lastModified is the
     Last-Modified header GitHub Pages sends for this file, so the date cannot
     go stale the way a hand-written one does — which is the whole reason a
     "last updated" line is worth having. */
  function setApiState(value) {
    var el = document.getElementById("sys-api");
    if (el) el.textContent = value;
  }

  function initSystemInfo() {
    var updated = document.getElementById("sys-updated");
    if (updated) {
      var when = new Date(document.lastModified);
      updated.textContent = isNaN(when)
        ? "Unknown — the server sent no date"
        : when.toISOString().slice(0, 10) + " (from the server, not typed here)";
    }

    var net = document.getElementById("sys-net");
    if (net) {
      var say = function () {
        net.textContent = navigator.onLine
          ? "Online"
          : "Offline — the Projects table will show its cached copy";
      };
      say();
      window.addEventListener("online", say);
      window.addEventListener("offline", say);
    }
  }

  /* ── Copy a link to a section ────────────────────────────
     So a reader can send somebody to the Projects table rather than to the top
     of the page and an instruction to scroll. */
  function initSectionLinks() {
    if (!navigator.clipboard || !navigator.clipboard.writeText) return;

    [].forEach.call(document.querySelectorAll("main .section[id]"), function (section) {
      var title = section.querySelector(".section-title");
      if (!title) return;

      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "anchor-btn";
      btn.textContent = "#";
      btn.setAttribute("aria-label", "Copy a link to this section");

      var said = document.createElement("span");
      said.className = "sr-only";
      said.setAttribute("role", "status");

      var timer;
      btn.addEventListener("click", function () {
        var url =
          window.location.origin + window.location.pathname + "#" + section.id;
        navigator.clipboard.writeText(url).then(
          function () {
            btn.classList.add("is-done");
            said.textContent = "Link to this section copied.";
          },
          function () {
            said.textContent = "Could not copy the link.";
          }
        );
        window.clearTimeout(timer);
        timer = window.setTimeout(function () {
          btn.classList.remove("is-done");
          said.textContent = "";
        }, 2500);
      });

      /* Not into the title. The title is the <summary>'s only child, and
         interactive content inside a <summary> is disallowed — the browser owns
         that element's activation, so a button nested in it is not consistently
         reachable by keyboard or by assistive tech. Chrome reported it for all
         eight sections. It goes into the `.section` instead, positioned back into
         the heading band by CSS.

         **First child**, so a keyboard pass meets the button before the heading
         it belongs to rather than after everything the section holds. */
      section.insertBefore(said, section.firstChild);
      section.insertBefore(btn, section.firstChild);
    });
  }

  /* ── QR code ─────────────────────────────────────────────
     The button is markup but starts `hidden`, and is revealed only once the
     dialog is known to open — the same rule the header Search control follows.
     A visible control whose dialog cannot open is worse than no control: the
     address it would have shown is already printed as text in the same row, so
     nothing is lost by the button staying away.

     Nothing here builds or validates the image. It is a committed file on this
     origin, allowed by `img-src 'self'`, and `download` on a same-origin href
     needs no scripting at all. */
  function initQR() {
    var btn = document.getElementById("qr-open");
    var dialog = document.getElementById("qr-dialog");
    if (!btn || !dialog || typeof dialog.showModal !== "function") return;

    btn.hidden = false;
    btn.addEventListener("click", function () {
      if (!dialog.open) dialog.showModal();
    });
  }

  /* ── Console note ────────────────────────────────────────
     For the one reader in a hundred who opens the console. Free, and it says
     something true about the page rather than being a joke at their expense. */
  function greet() {
    if (!window.console || !console.log) return;
    console.log(
      "This page: 4 files, 0 dependencies, 0 build steps.\n" +
      "Source: https://github.com/affannajiy/affannajiy.github.io\n" +
      "The only network call allowed is api.github.com — see the CSP in the head."
    );
  }

  loadProjects();
  initScrollSpy();
  initRepoDialog();
  initStaticSort();
  initCertFilters();
  initYearFilter();
  initSearch();
  initKeyboard();
  initDensity();
  initViewModes();
  // After initViewModes, which is what marks the nav, and after initSearch,
  // which builds the header row this puts its Exit control into.
  initFocusMode();
  initJSON();
  initSystemInfo();
  initSectionLinks();
  // Order-independent: buildCommands() runs on every palette render, not once at
  // init, so the button only has to be revealed before anyone opens the palette.
  initQR();

  // After initStaticSort, which replaces each header's text with a button — the
  // labels are read through readableText() either way, but a header rewritten
  // after they were taken would leave them describing the old markup.
  labelAllCells();

  /* Last, and after every control that can change a table's width has been
     built. A closed fold reports a clientWidth of 0, so this also runs whenever
     one opens or closes — otherwise a table would be judged overflowing while
     its section was shut. */
  syncScrollableTables();
  [].forEach.call(document.querySelectorAll("details.section-fold"), function (d) {
    d.addEventListener("toggle", syncScrollableTables);
  });

  greet();
})();
