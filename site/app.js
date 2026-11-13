(() => {
  const { repo, groups } = window.CATALOG;
  const sectionsEl = document.getElementById("sections");
  const countEl = document.getElementById("result-count");
  const copyViewEl = document.getElementById("copy-view");
  const searchEl = document.getElementById("search");
  const searchForm = searchEl.form;
  const dialog = document.getElementById("detail");

  const announcer = document.createElement("div");
  announcer.className = "visually-hidden";
  announcer.setAttribute("role", "status");
  document.body.append(announcer);

  // ---------------------------------------------------------------------------
  // Theme: light, dark, or follow the system (the default). The head script in
  // index.html applies the saved choice before first paint; this keeps the
  // switch, the browser's theme-color, and system changes in sync afterwards.
  // ---------------------------------------------------------------------------

  const THEME_KEY = "pp-theme";
  const systemDark = matchMedia("(prefers-color-scheme: dark)");
  const themeColor = document.getElementById("theme-color");
  const themeButtons = [...document.querySelectorAll("[data-theme-choice]")];

  function savedTheme() {
    try {
      const value = localStorage.getItem(THEME_KEY);
      return value === "light" || value === "dark" ? value : "system";
    } catch {
      return "system";
    }
  }

  function applyTheme(choice) {
    const dark = choice === "system" ? systemDark.matches : choice === "dark";
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    themeColor.content = getComputedStyle(document.documentElement).getPropertyValue("--color-bg").trim();
    for (const button of themeButtons) button.setAttribute("aria-pressed", String(button.dataset.themeChoice === choice));
  }

  let themeChoice = savedTheme();

  function chooseTheme(choice) {
    themeChoice = choice;
    try {
      if (choice === "system") localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, choice);
    } catch {
      // Storage is blocked; the choice still applies for this visit.
    }
    applyTheme(choice);
  }

  for (const button of themeButtons) button.addEventListener("click", () => chooseTheme(button.dataset.themeChoice));
  systemDark.addEventListener("change", () => {
    if (themeChoice === "system") applyTheme("system");
  });
  applyTheme(themeChoice);

  const esc = (value) =>
    String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const slug = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const items = new Map();
  for (const group of groups) {
    for (const category of group.categories) {
      for (const item of category.items) items.set(item.id, { item, category, group });
    }
  }
  const total = items.size;

  const templateGroup = groups.find((g) => g.id === "templates");
  const templateEntries = templateGroup.categories.flatMap((category) => category.items.map((item) => items.get(item.id)));
  const kindIds = templateGroup.categories.map((c) => c.id);
  const publishers = [...new Set(templateEntries.map((e) => e.item.publisher).filter(Boolean))].sort();

  const byline = publishers.length === 1 ? `published by ${publishers[0]}` : `from ${publishers.length} publishers`;
  document.getElementById("hero-proof").textContent = `${total} templates, ${byline} under the MIT license.`;

  // ---------------------------------------------------------------------------
  // Shareable URL state
  //
  // Catalog view:  ?q=upload&type=spa&publisher=Microsoft#templates
  // Open entry:    ?item=311-portal&page=map&view=mobile
  // Query strings work on GitHub Pages because every URL serves index.html.
  // The first release used #item=<id>; readUrl still accepts it so old links work.
  // ---------------------------------------------------------------------------

  const view = { q: "", type: "all", publisher: "all" };
  let detail = null; // { id, page, view }
  let detailPushed = false;
  let closingFromHistory = false;

  function readUrl() {
    const params = new URLSearchParams(location.search);
    const legacy = location.hash.match(/^#item=(.+)$/);
    view.q = (params.get("q") || "").trim();
    view.type = kindIds.includes(params.get("type")) ? params.get("type") : "all";
    view.publisher = publishers.includes(params.get("publisher")) ? params.get("publisher") : "all";
    const id = params.get("item") || (legacy ? decodeURIComponent(legacy[1]) : null);
    detail = id && items.has(id)
      ? { id, page: params.get("page") || "", view: params.get("view") === "mobile" ? "mobile" : "desktop" }
      : null;
  }

  function sectionHash() {
    return location.hash && !location.hash.startsWith("#item=") ? location.hash : "";
  }

  function viewUrl() {
    const params = new URLSearchParams();
    if (view.q) params.set("q", view.q);
    if (view.type !== "all") params.set("type", view.type);
    if (view.publisher !== "all") params.set("publisher", view.publisher);
    const query = params.toString();
    return `${location.pathname}${query ? `?${query}` : ""}${sectionHash()}`;
  }

  function itemHref(id) {
    return `?item=${encodeURIComponent(id)}`;
  }

  function detailUrl() {
    const params = new URLSearchParams({ item: detail.id });
    if (detail.page) params.set("page", detail.page);
    if (detail.view === "mobile") params.set("view", "mobile");
    return `${location.pathname}?${params}`;
  }

  const absolute = (url) => new URL(url, location.href).href;

  const isFiltered = () => Boolean(view.q) || view.type !== "all" || view.publisher !== "all";

  async function copyText(text, button, { done = "Link copied", announce = "Link copied to clipboard" } = {}) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard API needs a secure context; fall back for http previews.
      const field = Object.assign(document.createElement("textarea"), { value: text });
      document.body.append(field);
      field.select();
      document.execCommand("copy");
      field.remove();
    }
    const label = button.querySelector("[data-label]") || button;
    const original = label.textContent;
    button.dataset.copied = "true";
    label.textContent = done;
    announcer.textContent = announce;
    setTimeout(() => {
      button.dataset.copied = "false";
      label.textContent = original;
    }, 2000);
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  // Repository SPA previews need a screen frame; non-SPA preview images include their own.
  const imgClass = (entry) => (entry.item.deviceFrames ? "" : "screen");

  // The manifest allows a template without preview images while screenshots are pending.
  const noPreview = () =>
    `<div class="no-preview"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="14" rx="2"/><path d="m3.5 15 4.5-4.5 4 4 3-3 5 5"/></svg>No preview yet.</div>`;

  function cardHtml(entry, level) {
    const { item, category } = entry;
    const image = item.images[0];
    const mat = image
      ? `<img class="${imgClass(entry)}" src="${esc(image.src)}" alt="" loading="lazy" />`
      : noPreview();
    const tags = [
      ...(category.tag ? [`<li class="kind mat-${category.mat}">${esc(category.tag)}</li>`] : []),
      ...item.tags.map((t) => `<li>${esc(t)}</li>`)
    ].join("");
    return `
      <li>
        <article class="card">
          <div class="card-mat mat-${category.mat}">${mat}</div>
          <h${level} class="card-title"><a class="card-link" href="${itemHref(item.id)}" data-id="${esc(item.id)}">${esc(item.name)}</a></h${level}>
          <p class="card-desc">${esc(item.desc)}</p>
          <ul class="tags" aria-label="Tags">${tags}</ul>
        </article>
      </li>`;
  }

  const anchor = (id, name) => `<a class="anchor" href="#${id}" aria-label="Link to the ${esc(name)} section">#</a>`;

  function matches(item, query) {
    if (!query) return true;
    const hay = [item.name, item.desc, item.publisher || "", ...item.tags, ...(item.features || [])].join(" ").toLowerCase();
    return query.toLowerCase().split(/\s+/).every((word) => hay.includes(word));
  }

  function templatesSection() {
    const searched = templateEntries.filter((e) => matches(e.item, view.q));
    const byPublisher = searched.filter((e) => view.publisher === "all" || e.item.publisher === view.publisher);
    const visible = byPublisher.filter((e) => view.type === "all" || e.category.id === view.type);

    const kindCount = (id) => byPublisher.filter((e) => id === "all" || e.category.id === id).length;
    const kindButton = (id, label) =>
      `<button type="button" data-filter="type" data-value="${id}" aria-pressed="${view.type === id}">${esc(label)}<span class="count">${kindCount(id)}</span></button>`;

    const filtersHtml = `
      <div class="filters">
        <div class="filter" role="group" aria-labelledby="filter-type-label">
          <span class="filter-label" id="filter-type-label">Type</span>
          <div class="segmented">
            ${kindButton("all", "All")}
            ${templateGroup.categories.map((c) => kindButton(c.id, c.tag)).join("")}
          </div>
        </div>
        <div class="filter">
          <label class="filter-label" for="filter-publisher">Publisher</label>
          <select id="filter-publisher" data-filter="publisher">
            <option value="all">All publishers</option>
            ${publishers.map((p) => `<option value="${esc(p)}"${view.publisher === p ? " selected" : ""}>${esc(p)}</option>`).join("")}
          </select>
        </div>
      </div>`;

    const kindNote = view.type === "all" ? "" : templateGroup.categories.find((c) => c.id === view.type).blurb;
    const body = visible.length
      ? `<ul class="grid" role="list">${visible.map((e) => cardHtml(e, 3)).join("")}</ul>`
      : `<div class="empty"><p>No templates match these filters.</p><button class="button" type="button" data-clear-filters>Clear filters</button></div>`;

    const html = searched.length
      ? `
        <section class="group" id="templates" aria-labelledby="templates-title">
          <header class="group-head">
            <div class="heading-row"><h2 id="templates-title">${esc(templateGroup.name)}</h2>${anchor("templates", templateGroup.name)}</div>
            <p>${esc(templateGroup.intro)}</p>
          </header>
          ${filtersHtml}
          ${kindNote ? `<p class="filter-note">${esc(kindNote)}</p>` : ""}
          ${body}
        </section>`
      : "";

    return { html, count: visible.length };
  }

  function render() {
    // Sections are re-rendered wholesale, so remember which control had focus.
    const active = document.activeElement;
    const focusKey = sectionsEl.contains(active) && active.dataset.filter
      ? `[data-filter="${active.dataset.filter}"]${active.dataset.value ? `[data-value="${active.dataset.value}"]` : ""}`
      : null;

    const templates = templatesSection();
    let sectionsHtml = templates.html;

    if (!sectionsHtml) {
      sectionsHtml = `
        <div class="empty">
          <h2>Nothing matches “${esc(view.q)}”</h2>
          <p>Try a framework like React, or a feature like registration, invoices, or maps.</p>
          <button class="button" type="button" data-clear-search>Clear search</button>
        </div>`;
    }

    sectionsEl.innerHTML = sectionsHtml;
    countEl.textContent = isFiltered() ? `Showing ${templates.count} of ${total} templates` : `${total} templates`;
    // The hero already states the total, so the status row only appears for a filtered view.
    document.getElementById("status").hidden = !isFiltered();
    if (focusKey) sectionsEl.querySelector(focusKey)?.focus({ preventScroll: true });
  }

  function updateView(changes) {
    Object.assign(view, changes);
    history.replaceState(null, "", viewUrl());
    render();
  }

  // ---------------------------------------------------------------------------
  // Detail panel
  // ---------------------------------------------------------------------------

  function openDetail({ push }) {
    const entry = items.get(detail.id);
    const { item, category } = entry;
    const pageIndex = () => Math.max(0, item.images.findIndex((img) => slug(img.label) === detail.page));

    const stageHtml = () => {
      if (!item.images.length) return noPreview();
      const image = item.images[pageIndex()];
      const mobile = detail.view === "mobile" && image.mobile;
      const src = mobile ? image.mobile : image.src;
      return `<img class="${imgClass(entry)}" src="${esc(src)}" alt="${esc(item.name)}, ${esc(image.label)}${mobile ? " on mobile" : ""}" />`;
    };

    const thumbsHtml = () =>
      item.images.length > 1
        ? `<div class="thumbs" role="group" aria-label="Pages">${item.images
            .map((img, i) => `<button type="button" data-page="${slug(img.label)}" aria-pressed="${i === pageIndex()}">${esc(img.label)}</button>`)
            .join("")}</div>`
        : "<span></span>";

    const devicesHtml = () =>
      item.devices
        ? `<div class="segmented" role="group" aria-label="Device">
            <button type="button" data-device="desktop" aria-pressed="${detail.view === "desktop"}">Desktop</button>
            <button type="button" data-device="mobile" aria-pressed="${detail.view === "mobile"}">Mobile</button>
          </div>`
        : "";

    const features = item.features?.length
      ? `<div><h3>${esc(item.featuresTitle || "What’s included")}</h3><ul class="features">${item.features.map((f) => `<li>${esc(f)}</li>`).join("")}</ul></div>`
      : "<div></div>";

    dialog.innerHTML = `
      <div class="detail">
        <div class="detail-top">
          <span class="chip mat-${category.mat}">${esc(category.short)}</span>
          <button class="text-button" type="button" data-copy-detail>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1"/><path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"/></svg>
            <span data-label>Copy link</span>
          </button>
          <button class="close" type="button" aria-label="Close">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
          </button>
        </div>
        <div class="detail-body">
          <h2 id="detail-title" tabindex="-1">${esc(item.name)}</h2>
          <p class="detail-lede">${esc(item.desc)}</p>
          ${item.publisher ? `<p>Published by ${esc(item.publisher)}</p>` : ""}
          <div class="stage mat-${category.mat}">
            <div class="stage-frame" data-stage>${stageHtml()}</div>
            ${item.images.length ? `<div class="stage-controls" data-controls>${thumbsHtml()}${devicesHtml()}</div>` : ""}
          </div>
          ${item.prompt ? `
          <section class="prompt-block" aria-labelledby="prompt-title">
            <div class="prompt-head">
              <h3 id="prompt-title">Create it with the Power Pages plugin</h3>
              <button class="text-button" type="button" data-copy-prompt>
                <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8.5" y="8.5" width="12" height="12" rx="2"/><path d="M15.5 8.5V5.5a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3"/></svg>
                <span data-label>Copy prompt</span>
              </button>
            </div>
            <p>Paste this into GitHub Copilot CLI or Claude Code with the Power Pages plugin installed. It picks this template and fills in the details, so you only confirm your environment and a few settings. Change the site name first if you like.</p>
            <pre class="prompt"><code>${esc(item.prompt)}</code></pre>
            <p class="prompt-foot">Don’t have the plugin? <a href="https://aka.ms/ppskills">Get it at aka.ms/ppskills</a></p>
          </section>` : ""}
          <div class="detail-columns">
            ${features}
            <div>
              <h3>Set it up yourself</h3>
              <p>${esc(item.howTo || category.howTo)}</p>
            </div>
          </div>
          <div class="detail-actions">
            <a class="button primary" href="${repo}${esc(item.path)}">Open on GitHub</a>
          </div>
          <p class="path">${esc(item.path)}</p>
        </div>
      </div>`;

    const refresh = () => {
      dialog.querySelector("[data-stage]").innerHTML = stageHtml();
      const controls = dialog.querySelector("[data-controls]");
      if (controls) controls.innerHTML = thumbsHtml() + devicesHtml();
      history.replaceState(null, "", detailUrl());
    };

    dialog.onclick = (event) => {
      if (event.target === dialog || event.target.closest(".close")) return dialog.close();
      const copy = event.target.closest("[data-copy-detail]");
      if (copy) return copyText(absolute(detailUrl()), copy);
      const copyPrompt = event.target.closest("[data-copy-prompt]");
      if (copyPrompt) return copyText(item.prompt, copyPrompt, { done: "Copied", announce: "Prompt copied to clipboard" });
      const page = event.target.closest("[data-page]");
      if (page) {
        detail.page = page.dataset.page;
        refresh();
        dialog.querySelector(`[data-page="${detail.page}"]`)?.focus({ preventScroll: true });
      }
      const device = event.target.closest("[data-device]");
      if (device) {
        detail.view = device.dataset.device;
        refresh();
        dialog.querySelector(`[data-device="${detail.view}"]`)?.focus({ preventScroll: true });
      }
    };

    if (push) {
      history.pushState(null, "", detailUrl());
      detailPushed = true;
    } else {
      history.replaceState(null, "", detailUrl());
    }
    document.title = `${item.name} - Power Pages templates`;
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
    // Start screen readers at the entry's name rather than on the close button.
    dialog.querySelector("#detail-title").focus();
  }

  dialog.addEventListener("close", () => {
    document.title = "Power Pages templates";
    if (closingFromHistory) {
      closingFromHistory = false;
      return;
    }
    detail = null;
    if (detailPushed) {
      detailPushed = false;
      history.back();
    } else {
      history.replaceState(null, "", viewUrl());
    }
  });

  // ---------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------

  sectionsEl.addEventListener("click", (event) => {
    const card = event.target.closest(".card-link");
    if (card) {
      // Let the browser handle new-tab and new-window clicks on the real link.
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      detail = { id: card.dataset.id, page: "", view: "desktop" };
      return openDetail({ push: true });
    }
    const filter = event.target.closest("button[data-filter]");
    if (filter) return updateView({ [filter.dataset.filter]: filter.dataset.value });
    if (event.target.closest("[data-clear-filters]")) return updateView({ type: "all", publisher: "all" });
    if (event.target.closest("[data-clear-search]")) {
      searchEl.value = "";
      updateView({ q: "" });
      searchEl.focus();
    }
  });

  sectionsEl.addEventListener("change", (event) => {
    if (event.target.matches("select[data-filter]")) updateView({ [event.target.dataset.filter]: event.target.value });
  });

  searchEl.addEventListener("input", () => updateView({ q: searchEl.value.trim() }));

  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    document.getElementById("catalog").scrollIntoView();
  });

  copyViewEl.addEventListener("click", () => copyText(absolute(viewUrl()), copyViewEl));

  window.addEventListener("popstate", () => {
    readUrl();
    searchEl.value = view.q;
    render();
    detailPushed = false;
    if (detail) {
      openDetail({ push: false });
    } else if (dialog.open) {
      closingFromHistory = true;
      dialog.close();
    }
  });

  // ---------------------------------------------------------------------------
  // Start
  // ---------------------------------------------------------------------------

  readUrl();
  searchEl.value = view.q;
  render();
  if (detail) {
    openDetail({ push: false });
  } else if (sectionHash()) {
    // The catalog renders after load, so the browser's own jump to the anchor
    // has already missed it; scroll once the sections exist.
    requestAnimationFrame(() => document.getElementById(decodeURIComponent(sectionHash().slice(1)))?.scrollIntoView());
  }
})();
