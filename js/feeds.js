// Buddies Spa — data feeds and small DOM helpers shared by page scripts.
//
// Promos and events come from M-Events, staff from M-Staff. Until those feeds
// are configured in js/site-config.js (feeds.eventsUrl / feeds.staffUrl), the
// seed files in data/ are used. Page scripts never care which one answered.
//
// All rendering uses DOM APIs (never innerHTML with data), because feed
// content will eventually be typed by staff in the M-Events/M-Staff admin.

(() => {
  const Buddies = window.Buddies;
  const config = Buddies.config;
  const cache = new Map();

  const getJSON = (url) => {
    if (!cache.has(url)) {
      cache.set(url, fetch(url, { headers: { Accept: "application/json" } }).then((response) => {
        if (!response.ok) {
          throw new Error(`Request failed (${response.status}) for ${url}`);
        }
        return response.json();
      }));
    }
    return cache.get(url);
  };

  const listFrom = (payload, key) => {
    if (Array.isArray(payload)) {
      return payload;
    }
    return Array.isArray(payload?.[key]) ? payload[key] : [];
  };

  const forTenant = (item) => !item.tenantId || item.tenantId === config.feeds.tenantId;
  const isPublished = (item) => !item.status || item.status === "published";
  const isPromo = (item) => String(item.category || "").toLowerCase() === "promo";

  // Today's date in Washington, DC as YYYY-MM-DD, so events move to "past"
  // at local midnight no matter where the visitor is.
  const todayInDC = () => new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());

  const dateOnly = (value) => String(value || "").slice(0, 10);

  const loadEventFeed = async () => {
    if (config.feeds.eventsUrl) {
      const all = listFrom(await getJSON(config.feeds.eventsUrl), "events");
      return all.filter(forTenant).filter(isPublished);
    }
    return listFrom(await getJSON("data/events.json"), "events")
      .filter(forTenant)
      .filter(isPublished);
  };

  // Events, split into upcoming (soonest first) and past
  // (most recent first).
  const getEvents = async () => {
    const today = todayInDC();
    // M-Events also carries promos; those belong to Monthly Specials, not here.
    const events = (await loadEventFeed()).filter((item) => !isPromo(item));
    const lastDay = (event) => dateOnly(event.end || event.start);
    const upcoming = events
      .filter((event) => lastDay(event) >= today)
      .sort((a, b) => String(a.start).localeCompare(String(b.start)));
    const past = events
      .filter((event) => lastDay(event) < today)
      .sort((a, b) => String(b.start).localeCompare(String(a.start)));
    return { upcoming, past };
  };

  const getStaff = async () => {
    const source = config.feeds.staffUrl || "data/staff.json";
    return listFrom(await getJSON(source), "staff")
      .filter(forTenant)
      .filter(isPublished)
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  };

  const getServices = async () => listFrom(await getJSON("data/services.json"), "categories");

  // ---- DOM helpers -------------------------------------------------------

  // el("a", { class: "btn", href: "#" }, "Text", childNode)
  const el = (tag, attributes = {}, ...children) => {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attributes)) {
      if (value === undefined || value === null || value === false) {
        continue;
      }
      if (key === "class") {
        node.className = value;
      } else if (key === "dataset") {
        Object.assign(node.dataset, value);
      } else {
        node.setAttribute(key, value === true ? "" : String(value));
      }
    }
    for (const child of children.flat()) {
      if (child === undefined || child === null || child === false) {
        continue;
      }
      node.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
    return node;
  };

  // Only http(s), mailto, tel and same-site relative links are ever rendered.
  const safeUrl = (value) => {
    const url = String(value || "").trim();
    if (!url) {
      return "";
    }
    if (/^(https?:|mailto:|tel:)/i.test(url) || /^[a-z0-9][a-z0-9/_.-]*(\.html)?(#[\w-]*)?$/i.test(url)) {
      return url;
    }
    return "";
  };

  const isPlaceholderText = (text) => /\[Placeholder/i.test(String(text || ""));

  // Inline text: **bold** and [Placeholder: …] markers.
  const inline = (text) => {
    const nodes = [];
    const pattern = /\*\*(.+?)\*\*|(\[Placeholder[^\]]*\])/g;
    let last = 0;
    let match;
    while ((match = pattern.exec(text))) {
      if (match.index > last) {
        nodes.push(document.createTextNode(text.slice(last, match.index)));
      }
      nodes.push(match[1] ? el("strong", {}, match[1]) : el("span", { class: "ph-text" }, match[2]));
      last = pattern.lastIndex;
    }
    if (last < text.length) {
      nodes.push(document.createTextNode(text.slice(last)));
    }
    return nodes;
  };

  // Paragraphs separated by blank lines; "- " lines become a list.
  const richText = (text) => {
    const fragment = document.createDocumentFragment();
    for (const block of String(text || "").split(/\n\s*\n/)) {
      const lines = block.split("\n").filter((line) => line.trim());
      if (!lines.length) {
        continue;
      }
      if (lines.every((line) => line.trim().startsWith("- "))) {
        fragment.append(el("ul", {}, lines.map((line) => el("li", {}, inline(line.trim().slice(2))))));
      } else {
        fragment.append(el("p", {}, inline(lines.join(" "))));
      }
    }
    return fragment;
  };

  const phTag = () => el("span", { class: "ph-tag" }, "Placeholder");

  const img = (src, alt, attributes = {}) => {
    const url = safeUrl(src);
    return url ? el("img", { src: url, alt: alt || "", loading: "lazy", decoding: "async", ...attributes }) : null;
  };

  // A Book link for a service category: straight to Square, or book.html.
  const bookLink = (category, label, className = "btn") => {
    const direct = config.booking.serviceButtonsGoDirect;
    return el("a", {
      class: className,
      href: direct ? Buddies.bookingUrl(category) : `book.html#${category}`,
      dataset: { book: category }
    }, label);
  };

  const formatDate = (value, options) => {
    const text = String(value || "");
    if (!text) {
      return "";
    }
    // Dates without a time are read as local calendar days.
    const date = /^\d{4}-\d{2}-\d{2}$/.test(text) ? new Date(`${text}T12:00:00`) : new Date(text);
    if (Number.isNaN(date.getTime())) {
      return "";
    }
    return new Intl.DateTimeFormat("en-US", options).format(date);
  };

  const showError = (container, message) => {
    container.classList.remove("is-loading");
    container.replaceChildren(el("p", { class: "empty-state" }, message));
  };

  Object.assign(Buddies, {
    getJSON,
    getEvents,
    getStaff,
    getServices,
    todayInDC,
    el,
    safeUrl,
    inline,
    richText,
    phTag,
    img,
    bookLink,
    formatDate,
    showError,
    isPlaceholderText
  });
})();
