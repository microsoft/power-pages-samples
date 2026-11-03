(() => {
  const { repo, groups } = window.CATALOG;
  const asset = (path) => path;
  const sectionsEl = document.getElementById("sections");
  const navEl = document.getElementById("index-nav");
  const countEl = document.getElementById("result-count");
  const searchEl = document.getElementById("search");
  const dialog = document.getElementById("detail");

  const esc = (value) =>
    String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  const items = new Map();
  for (const group of groups) {
    for (const category of group.categories) {
      for (const item of category.items) items.set(item.id, { item, category, group });
    }
  }
  const total = items.size;

  // Non-SPA template previews already ship inside device frames, so only raw
  // screenshots get the thin screen outline.
  const imgClass = (entry) => (entry.item.devices ? "" : "screen");

  const noPreview = (item) =>
    item.planned
      ? `<div class="no-preview"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>Planned. Not built yet.</div>`
      : `<div class="no-preview"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 8-4 4 4 4M16 8l4 4-4 4"/></svg>Runs on the server. No screen to preview.</div>`;

  function cardHtml(entry) {
    const { item, category } = entry;
    const image = item.images[0];
    const mat = image
      ? `<img class="${imgClass(entry)}" src="${asset(image.src)}" alt="" loading="lazy" />`
      : noPreview(item);
    const tags = [
      ...(category.tag ? [`<li class="kind mat-${category.mat}">${esc(category.tag)}</li>`] : []),
      ...(item.planned ? [`<li class="planned">Planned</li>`] : []),
      ...item.tags.map((t) => `<li>${esc(t)}</li>`)
    ].join("");
    return `
      <li>
        <button class="card" type="button" data-id="${esc(item.id)}" aria-label="${esc(item.name)}: ${esc(item.desc)}">
          <div class="card-mat mat-${category.mat}">${mat}</div>
          <div class="card-body">
            <h4>${esc(item.name)}</h4>
            <p>${esc(item.desc)}</p>
            <ul class="tags">${tags}</ul>
          </div>
        </button>
      </li>`;
  }

  function matches(item, query) {
    if (!query) return true;
    const hay = [item.name, item.desc, item.publisher || "", ...item.tags, ...(item.features || [])].join(" ").toLowerCase();
    return query.split(/\s+/).every((word) => hay.includes(word));
  }

  // Templates render as one catalog with type and publisher filters.
  const filters = { kind: "all", publisher: "all" };
  const templateGroup = groups.find((g) => g.id === "templates");
  const templateEntries = templateGroup.categories.flatMap((category) =>
    category.items.map((item) => ({ item, category }))
  );
  const publishers = [...new Set(templateEntries.map((e) => e.item.publisher).filter(Boolean))].sort();

  function templatesSection(query) {
    const searched = templateEntries.filter((e) => matches(e.item, query));
    const byPublisher = searched.filter((e) => filters.publisher === "all" || e.item.publisher === filters.publisher);
    const visible = byPublisher.filter((e) => filters.kind === "all" || e.category.id === filters.kind);

    const kindCount = (id) => byPublisher.filter((e) => id === "all" || e.category.id === id).length;
    const kindButton = (id, label) =>
      `<button type="button" data-filter="kind" data-value="${id}" aria-pressed="${filters.kind === id}">${esc(label)} <span class="count">${kindCount(id)}</span></button>`;

    const filtersHtml = `
      <div class="filters">
        <div class="filter" role="group" aria-labelledby="filter-kind-label">
          <span class="filter-label" id="filter-kind-label">Type</span>
          <div class="segmented">
            ${kindButton("all", "All")}
            ${templateGroup.categories.map((c) => kindButton(c.id, c.tag)).join("")}
          </div>
        </div>
        <div class="filter">
          <label class="filter-label" for="filter-publisher">Publisher</label>
          <select id="filter-publisher" data-filter="publisher">
            <option value="all">All publishers</option>
            ${publishers.map((p) => `<option value="${esc(p)}"${filters.publisher === p ? " selected" : ""}>${esc(p)}</option>`).join("")}
          </select>
        </div>
      </div>`;

    const kindNote = filters.kind === "all" ? "" : templateGroup.categories.find((c) => c.id === filters.kind).blurb;
    const body = visible.length
      ? `<ul class="grid" role="list">${visible.map(cardHtml).join("")}</ul>`
      : `<div class="empty inline"><p>No templates match these filters.</p><button class="button" type="button" data-clear-filters>Clear filters</button></div>`;

    const html = searched.length
      ? `
        <section class="group" id="templates" aria-labelledby="templates-title">
          <header class="group-head">
            <h2 id="templates-title">${esc(templateGroup.name)}</h2>
            <p>${esc(templateGroup.intro)}</p>
          </header>
          ${filtersHtml}
          ${kindNote ? `<p class="filter-note">${esc(kindNote)}</p>` : ""}
          ${body}
        </section>`
      : "";

    const nav = `
      <div class="index-group">
        <a href="#templates" data-filter="kind" data-value="all">${esc(templateGroup.name)}<span class="count">${searched.length}</span></a>
        <ul>${templateGroup.categories
          .map((c) => {
            const n = searched.filter((e) => e.category.id === c.id).length;
            return `<li class="${n ? "" : "is-empty"}"><a href="#templates" data-filter="kind" data-value="${c.id}"><span class="swatch mat-${c.mat}"></span>${esc(c.name)}<span class="count">${n}</span></a></li>`;
          })
          .join("")}</ul>
      </div>`;

    return { html, nav, count: visible.length };
  }

  function render() {
    const query = searchEl.value.trim().toLowerCase();
    // Sections are re-rendered wholesale, so remember which control had focus.
    const active = document.activeElement;
    const focusKey = active?.dataset?.filter ? `[data-filter="${active.dataset.filter}"]${active.dataset.value ? `[data-value="${active.dataset.value}"]` : ""}` : null;
    const focusInSections = sectionsEl.contains(active);

    const templates = templatesSection(query);
    let shown = templates.count;
    let sectionsHtml = templates.html;
    let navHtml = templates.nav;

    for (const group of groups) {
      if (group === templateGroup) continue;
      let groupCount = 0;
      let categoriesHtml = "";
      let navItems = "";

      for (const category of group.categories) {
        const visible = category.items.filter((item) => matches(item, query));
        groupCount += visible.length;
        navItems += `
          <li class="${visible.length ? "" : "is-empty"}">
            <a href="#${category.id}"><span class="swatch mat-${category.mat}"></span>${esc(category.name)}<span class="count">${visible.length}</span></a>
          </li>`;
        if (!visible.length) continue;
        categoriesHtml += `
          <section class="category" id="${category.id}" aria-labelledby="${category.id}-title">
            <div class="category-head">
              <h3 id="${category.id}-title"><span class="swatch mat-${category.mat}"></span>${esc(category.name)}</h3>
              <p>${esc(category.blurb)}</p>
            </div>
            <ul class="grid" role="list">
              ${visible.map((item) => cardHtml(items.get(item.id))).join("")}
            </ul>
          </section>`;
      }

      shown += groupCount;
      navHtml += `
        <div class="index-group">
          <a href="#${group.id}">${esc(group.name)}<span class="count">${groupCount}</span></a>
          <ul>${navItems}</ul>
        </div>`;
      if (groupCount) {
        sectionsHtml += `
          <section class="group" id="${group.id}" aria-labelledby="${group.id}-title">
            <header class="group-head">
              <h2 id="${group.id}-title">${esc(group.name)}</h2>
              <p>${esc(group.intro)}</p>
            </header>
            ${categoriesHtml}
          </section>`;
      }
    }

    if (!sectionsHtml) {
      sectionsHtml = `
        <div class="empty">
          <h2>Nothing matches “${esc(searchEl.value.trim())}”</h2>
          <p>Try a framework like React or Vue, or a capability like upload, sign-in, or localization.</p>
        </div>`;
    }

    sectionsEl.innerHTML = sectionsHtml;
    navEl.innerHTML = navHtml;
    const filtered = query || filters.kind !== "all" || filters.publisher !== "all";
    countEl.textContent = filtered ? `${shown} of ${total} shown` : `${total} templates and samples`;
    if (focusKey && focusInSections) sectionsEl.querySelector(focusKey)?.focus({ preventScroll: true });
  }

  function setFilter(name, value) {
    filters[name] = value;
    render();
  }

  sectionsEl.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-filter]");
    if (button) return setFilter(button.dataset.filter, button.dataset.value);
    if (event.target.closest("[data-clear-filters]")) {
      filters.kind = "all";
      filters.publisher = "all";
      render();
    }
  });

  sectionsEl.addEventListener("change", (event) => {
    if (event.target.matches("select[data-filter]")) setFilter(event.target.dataset.filter, event.target.value);
  });

  navEl.addEventListener("click", (event) => {
    const link = event.target.closest("a[data-filter]");
    if (link) setFilter(link.dataset.filter, link.dataset.value);
  });

  function openDetail(id, { push = true } = {}) {
    const entry = items.get(id);
    if (!entry) return;
    const { item, category, group } = entry;
    let index = 0;
    let device = "desktop";

    const stageHtml = () => {
      if (!item.images.length) return noPreview(item);
      const image = item.images[index];
      const src = device === "mobile" && image.mobile ? image.mobile : image.src;
      return `<img class="${imgClass(entry)}" src="${asset(src)}" alt="${esc(item.name)}, ${esc(image.label)}${device === "mobile" ? " on mobile" : ""}" />`;
    };

    const thumbsHtml = () =>
      item.images.length > 1
        ? `<div class="thumbs" role="group" aria-label="Pages">${item.images
            .map((img, i) => `<button type="button" data-page="${i}" aria-pressed="${i === index}">${esc(img.label)}</button>`)
            .join("")}</div>`
        : "<span></span>";

    const devicesHtml = () =>
      item.devices
        ? `<div class="segmented" role="group" aria-label="Device">
            <button type="button" data-device="desktop" aria-pressed="${device === "desktop"}">Desktop</button>
            <button type="button" data-device="mobile" aria-pressed="${device === "mobile"}">Mobile</button>
          </div>`
        : "";

    const features = item.features?.length
      ? `<div><h3>What’s included</h3><ul class="features">${item.features.map((f) => `<li>${esc(f)}</li>`).join("")}</ul></div>`
      : `<div><h3>Built with</h3><ul class="features">${item.tags.map((f) => `<li>${esc(f)}</li>`).join("")}</ul></div>`;

    dialog.innerHTML = `
      <div class="detail">
        <div class="detail-top">
          <span class="chip mat-${category.mat}">${esc(category.short)}</span>
          <button class="close" type="button" aria-label="Close">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
          </button>
        </div>
        <div class="detail-body">
          <h2 id="detail-title">${esc(item.name)}</h2>
          <p class="detail-lede">${esc(item.desc)}</p>
          <div class="stage mat-${category.mat}">
            <div class="stage-frame" data-stage>${stageHtml()}</div>
            ${item.images.length ? `<div class="stage-controls" data-controls>${thumbsHtml()}${devicesHtml()}</div>` : ""}
          </div>
          <div class="detail-columns">
            ${features}
            <div>
              <h3>How to use it</h3>
              <p>${esc(category.howTo)}</p>
              <div class="recommend">
                <h4>Recommended: use the Power Pages plugin</h4>
                <p>Install the Power Pages plugin for GitHub Copilot CLI or Claude Code, then let an AI agent help you set up, customize, and deploy this ${group.id === "templates" ? "template" : "sample"}.</p>
                <a href="https://aka.ms/ppskills" target="_blank" rel="noopener">Get the plugin at aka.ms/ppskills</a>
              </div>
            </div>
          </div>
          <div class="detail-actions">
            <a class="button primary" href="${repo}${item.path}" target="_blank" rel="noopener">Open on GitHub</a>
          </div>
          <p class="path">${esc(item.path)}</p>
        </div>
      </div>`;

    const refresh = () => {
      dialog.querySelector("[data-stage]").innerHTML = stageHtml();
      const controls = dialog.querySelector("[data-controls]");
      if (controls) controls.innerHTML = thumbsHtml() + devicesHtml();
    };

    dialog.onclick = (event) => {
      if (event.target === dialog || event.target.closest(".close")) return dialog.close();
      const page = event.target.closest("[data-page]");
      if (page) {
        index = Number(page.dataset.page);
        refresh();
        dialog.querySelector(`[data-page="${index}"]`)?.focus({ preventScroll: true });
      }
      const dev = event.target.closest("[data-device]");
      if (dev) {
        device = dev.dataset.device;
        refresh();
        dialog.querySelector(`[data-device="${device}"]`)?.focus({ preventScroll: true });
      }
    };

    if (!dialog.open) dialog.showModal();
    dialog.querySelector(".close").focus();
    if (push) history.pushState(null, "", `#item=${encodeURIComponent(id)}`);
  }

  dialog.addEventListener("close", () => {
    if (location.hash.startsWith("#item=")) history.pushState(null, "", location.pathname);
  });

  sectionsEl.addEventListener("click", (event) => {
    const card = event.target.closest(".card");
    if (card) openDetail(card.dataset.id);
  });

  searchEl.addEventListener("input", render);

  const fromHash = () => {
    const match = location.hash.match(/^#item=(.+)$/);
    if (match) openDetail(decodeURIComponent(match[1]), { push: false });
    else if (dialog.open) dialog.close();
  };
  window.addEventListener("popstate", fromHash);

  render();
  fromHash();
})();
