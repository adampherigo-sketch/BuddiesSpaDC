// Buddies Spa — Partners page: spotlight, filterable logo grid.

(() => {
  const Buddies = window.Buddies;
  const { el, img, getJSON, safeUrl, showError } = Buddies;

  const CATEGORY_NAMES = {
    wellness: "Wellness",
    community: "Community",
    business: "Business",
    nightlife: "Nightlife",
    nonprofit: "Nonprofits",
    retail: "Retail"
  };

  const visit = (partner, className = "link-arrow", label = "Visit website") => {
    const url = safeUrl(partner.url);
    return url
      ? el("a", {
        class: className,
        href: url,
        target: "_blank",
        rel: "noopener noreferrer",
        "aria-label": `Visit ${partner.name} (opens in a new tab)`
      }, label)
      : el("span", { class: "ph-text" }, "[Placeholder: website link]");
  };

  const tile = (partner) => el("article", { class: "partner-tile reveal", dataset: { category: partner.category } },
    el("div", { class: "partner-tile__logo" }, img(partner.logo, `${partner.name} logo`, { width: 600, height: 400 })),
    el("div", { class: "partner-tile__body" },
      el("p", { class: "card__kicker" }, CATEGORY_NAMES[partner.category] || partner.category),
      el("h3", {}, partner.name),
      el("p", { class: "partner-tile__blurb" }, partner.blurb),
      visit(partner)
    )
  );

  const spotlight = (featured, partner) => el("div", { class: "spotlight" },
    el("div", { class: "spotlight__logo" }, img(partner.logo, `${partner.name} logo`, { width: 600, height: 600 })),
    el("div", { class: "spotlight__body" },
      el("p", { class: "eyebrow" }, "Partner spotlight"),
      el("h2", { id: "spotlight-heading" }, partner.name),
      el("p", { class: "lead" }, featured.story),
      featured.quote
        ? el("figure", { class: "spotlight__quote" },
          el("blockquote", {}, `“${featured.quote}”`),
          el("figcaption", {}, featured.quoteBy || partner.name))
        : null,
      visit(partner, "btn btn--outline", `Visit ${partner.name}`)
    )
  );

  const setUpFilters = (partners) => {
    const bar = document.querySelector("[data-partner-filters]");
    const present = Object.keys(CATEGORY_NAMES).filter((key) => partners.some((partner) => partner.category === key));
    const buttons = ["all", ...present].map((key) => el("button", {
      class: "filter-btn",
      type: "button",
      "aria-pressed": String(key === "all"),
      dataset: { filter: key }
    }, key === "all" ? "All partners" : CATEGORY_NAMES[key]));
    bar.replaceChildren(...buttons);

    bar.addEventListener("click", (event) => {
      const button = event.target.closest("[data-filter]");
      if (!button) {
        return;
      }
      buttons.forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
      document.querySelectorAll(".partner-tile").forEach((tileElement) => {
        tileElement.hidden = button.dataset.filter !== "all" && tileElement.dataset.category !== button.dataset.filter;
      });
    });
  };

  document.addEventListener("buddies:ready", async () => {
    const grid = document.querySelector("[data-partner-grid]");
    const spot = document.querySelector("[data-partner-spotlight]");
    try {
      const data = await getJSON("data/partners.json");
      const featured = data.partners.find((partner) => partner.id === data.featured?.id);
      if (featured) {
        spot.replaceChildren(spotlight(data.featured, featured));
      } else {
        spot.closest("section").hidden = true;
      }
      grid.replaceChildren(...data.partners.map(tile));
      setUpFilters(data.partners);
      Buddies.observeReveal?.();
    } catch (error) {
      console.error(error);
      showError(grid, "Partners are loading slowly. Please refresh the page.");
      spot.replaceChildren();
    }
  });
})();
