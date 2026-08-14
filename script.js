/* ─────────────────────────────────────────────────────────────
   Projects table + nav scrollspy.

   The Projects list is never hardcoded: it is fetched from the GitHub REST
   API on every load. If the API is unreachable the failure is shown in the
   table — there is no stale baked-in fallback to hide behind.
   ───────────────────────────────────────────────────────────── */

(function () {
  "use strict";

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

  /* ── Helpers ─────────────────────────────────────────── */

  // Repo text is remote data, so it is untrusted input.
  function escapeHTML(value) {
    var div = document.createElement("div");
    div.textContent = value == null ? "" : String(value);
    return div.innerHTML;
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

  // Remote JSON is not guaranteed to type its own fields. Coerce before it
  // reaches innerHTML, so a non-numeric star count cannot carry markup.
  function safeCount(value) {
    var n = Number(value);
    return isFinite(n) && n >= 0 ? String(Math.floor(n)) : "0";
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

  /* ── Loading state ───────────────────────────────────────
     Shape-matched skeleton rows rather than a spinner: they say what is
     coming, not merely that something is. */
  // Bar widths come from the stylesheet, not an inline style attribute: the
  // Content-Security-Policy forbids inline styles, and that is worth keeping.
  function renderSkeleton(rows) {
    var cells = "";
    for (var c = 0; c < 5; c++) cells += '<td><span class="skeleton-bar"></span></td>';

    var html = "";
    for (var r = 0; r < rows; r++) html += '<tr class="skeleton-row">' + cells + "</tr>";
    tbody.innerHTML = html;
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
      case "stars":    return Number(repo.stargazers_count) || 0;
      case "updated":  return text(repo.updated_at);
      default:         return "";
    }
  }

  // Filter first, then sort what survived.
  function applyFilter() {
    var q = query.trim().toLowerCase();
    if (!q) {
      view = repos.slice();
      return;
    }
    view = repos.filter(function (r) {
      return (
        text(r.name).toLowerCase().indexOf(q) !== -1 ||
        text(r.description).toLowerCase().indexOf(q) !== -1 ||
        text(r.language).toLowerCase().indexOf(q) !== -1
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

  function renderRows() {
    if (view.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="5">No repositories match “' +
        escapeHTML(query) +
        '”.</td></tr>';
      return;
    }

    var html = "";
    for (var i = 0; i < view.length; i++) {
      var r = view[i];
      html +=
        "<tr>" +
        '<td><a class="text-link" href="' +
        escapeHTML(safeRepoURL(r.html_url)) +
        '" target="_blank" rel="noopener noreferrer">' +
        escapeHTML(r.name) +
        "</a></td>" +
        "<td>" + (escapeHTML(r.description) || "—") + "</td>" +
        "<td>" + (escapeHTML(r.language) || "—") + "</td>" +
        "<td>" + safeCount(r.stargazers_count) + "</td>" +
        "<td>" + formatDate(r.updated_at) + "</td>" +
        "</tr>";
    }
    tbody.innerHTML = html;
  }

  // One sentence covering count, filter and sort — the whole state of the table.
  function describeState() {
    if (repos.length === 0) return "No public repositories found.";

    var sortLabel = { name: "name", language: "language", stars: "stars", updated: "last updated" }[sortKey];
    var direction = sortDir === "ascending" ? "ascending" : "descending";

    if (query.trim() === "") {
      return (
        repos.length +
        " public " +
        (repos.length === 1 ? "repository" : "repositories") +
        ", live from the GitHub API. Sorted by " + sortLabel + ", " + direction +
        ". Select a column header to sort."
      );
    }
    return (
      "Showing " + view.length + " of " + repos.length +
      " repositories matching “" + query.trim() + "”" +
      (view.length === 0 ? ". Clear the filter to see them all." :
        ", sorted by " + sortLabel + ", " + direction + ".")
    );
  }

  function refresh() {
    applyFilter();
    sortRepos();
    syncSortIndicators();
    renderRows();
    setStatus(describeState());
    syncURL();
  }

  function renderError(message) {
    tbody.innerHTML =
      '<tr><td colspan="5">Could not load repositories.</td></tr>';

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

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "retry-btn";
    btn.textContent = "Retry";
    btn.addEventListener("click", function () {
      btn.disabled = true;
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

  function readCache() {
    try {
      var raw = window.localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.repos) || !parsed.time) return null;
      if (Date.now() - parsed.time > CACHE_MAX_AGE) return null;

      // localStorage is writable by anything running on this origin, so what
      // comes back out is input, not state. Entries that are not plain objects
      // with a usable name are dropped rather than rendered; if that empties
      // the list, the cache is treated as absent and the API answers instead.
      parsed.repos = parsed.repos.filter(function (r) {
        return r && typeof r === "object" && text(r.name) !== "";
      });
      if (parsed.repos.length === 0) return null;

      return parsed;
    } catch (err) {
      return null;                 // private mode, quota, or corrupt JSON
    }
  }

  /* The API returns roughly 80 fields per repo and the table renders six of
     them. Storing the raw payload costs ~116KB and a JSON.parse of the same
     size on every load — which is the wait we are trying to remove. Keeping
     only the rendered fields cuts it to a few KB. */
  function slim(list) {
    return list.map(function (r) {
      return {
        name: r.name,
        description: r.description,
        language: r.language,
        stargazers_count: r.stargazers_count,
        updated_at: r.updated_at,
        html_url: r.html_url,
        fork: false
      };
    });
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
    }

    fetch(API_URL, { headers: { Accept: "application/vnd.github+json" } })
      .then(function (res) {
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

        repos = data.filter(function (r) {
          return r && typeof r === "object" && !r.fork;
        });

        if (repos.length === 0) {
          tbody.innerHTML =
            '<tr><td colspan="5">No public repositories found.</td></tr>';
          setStatus("No public repositories found.");
          return;
        }

        writeCache(repos);
        if (filterEl) filterEl.disabled = false;
        refresh();
      })
      .catch(function (err) {
        // With nothing on screen the failure is the whole story. With a cached
        // table on screen it is a caveat about that table — but it is still said.
        if (cached) {
          setStatus(
            repos.length +
              " public repositories, from a copy saved " +
              describeAge(cached.time) +
              ". GitHub could not be reached just now (" +
              err.message +
              "), so this list may be out of date.",
            "error"
          );
        } else {
          renderError(err.message);
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
  var SORT_KEYS = { name: 1, language: 1, stars: 1, updated: 1 };

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

    var q = params.get("q");
    if (q) {
      query = q;
      if (filterEl) filterEl.value = q;
    }
  }

  function syncURL() {
    if (!window.history || !window.history.replaceState) return;
    var params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
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

  /* ── "/" focuses the filter ──────────────────────────────
     An accelerator for the fluent that costs the occasional reader nothing
     (Nielsen §1.7) — but only where there is a keyboard to press it with, so
     the hint is revealed from the same test that installs the handler. */
  function initFilterShortcut() {
    if (!filterEl) return;
    if (!window.matchMedia || !window.matchMedia("(hover: hover)").matches) {
      return;                       // touch-only: no key to press, no promise
    }

    var hint = document.getElementById("filter-key");
    if (hint) hint.hidden = false;

    document.addEventListener("keydown", function (event) {
      if (event.key !== "/") return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      // Never steal the key from someone typing it, and never from a modal.
      var el = document.activeElement;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" ||
                 el.tagName === "SELECT" || el.isContentEditable)) return;
      if (document.querySelector("dialog[open]")) return;

      var fold = filterEl.closest("details.section-fold");
      if (fold && !fold.open) fold.open = true;   // focusing a hidden field is
                                                 // a dead end, so open it first
      event.preventDefault();
      filterEl.focus();
      filterEl.select();
    });
  }

  initFilterShortcut();

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
      var title = section.querySelector(".section-title");
      var label = title
        ? title.textContent.replace(/^\s*\d+\s*—\s*/, "").trim()
        : section.id;

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
          if (curated && !p.hasAttribute("data-resume")) return;
          total += linesFor(p.textContent) + 1;
        });

        section.querySelectorAll("table.grid-table").forEach(function (table) {
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
            rowLines += linesFor(row.textContent);
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
  function revealTarget(hash) {
    if (!hash || hash.length < 2) return;
    var target;
    try {
      target = document.querySelector(hash);
    } catch (e) {
      return;                       // a malformed hash is not a selector
    }
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

    var marked;
    function update() {
      var current = currentId();
      if (current === marked) return;
      marked = current;
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

    var links = document.querySelectorAll('a[href^="mailto:"]');
    [].forEach.call(links, function (link) {
      var address = link.getAttribute("href").slice(7).split("?")[0];
      if (!address || link.classList.contains("button")) return;

      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "copy-btn";
      btn.textContent = "Copy";
      // The button repeats a label already on screen, so the accessible name
      // has to carry what it is copying.
      btn.setAttribute("aria-label", "Copy email address " + address);

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
            said.textContent = "Email address copied.";
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
     the same bargain the tables already make with .scroll-hint — and the
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

  loadProjects();
  initScrollSpy();
})();
