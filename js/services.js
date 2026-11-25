// Buddies Spa — Services page.
// Categories come from data/services.json; "Available with" chips come from
// M-Staff (staff whose services[] include the category).

(() => {
  const Buddies = window.Buddies;
  const { el, img, getServices, getStaff, bookLink, showError } = Buddies;

  const faqGroupFor = (category) => `faq.html#${category.faq}`;

  const priceRow = (item) => el("li", { class: `price-row${item.placeholder ? " is-placeholder" : ""}` },
    el("span", { class: "price-row__name" }, item.name),
    el("span", { class: "price-row__price" }, item.price || (item.placeholder ? "Price TBD" : "")),
    item.duration ? el("span", { class: "price-row__meta" }, item.duration) : null
  );

  const block = (category, staff, index) => {
    const people = staff.filter((person) => person.services?.includes(category.id));
    const hasPlaceholders = category.menu?.some((item) => item.placeholder);

    return el("section", { class: `service-block reveal${index % 2 ? " service-block--flip" : ""}`, id: category.id, "aria-labelledby": `${category.id}-title` },
      el("div", { class: "service-block__media" },
        img(category.image, category.imageAlt, { width: 1200, height: 1200 })
      ),
      el("div", { class: "service-block__body" },
        el("p", { class: "card__kicker" }, category.short),
        el("h2", { id: `${category.id}-title` }, category.name),
        el("p", { class: "service-block__desc" }, category.description),

        category.menu?.length
          ? el("div", { class: `service-block__menu${hasPlaceholders ? " ph" : ""}` },
            hasPlaceholders ? el("span", { class: "ph-tag" }, "Placeholder prices") : null,
            el("h3", { class: "service-block__label" }, "Menu highlights"),
            el("ul", { class: "price-list" }, category.menu.map(priceRow))
          )
          : null,

        el("div", { class: "service-block__staff" },
          el("h3", { class: "service-block__label" }, "Available with"),
          people.length
            ? el("ul", { class: "chips" }, people.map((person) =>
              el("li", {}, el("a", { class: "chip", href: `staff.html#${person.id}` }, person.name))))
            : el("p", { class: "ph-text" }, "[Placeholder: confirm which team members perform this service]")
        ),

        el("div", { class: "btn-row" },
          bookLink(category.id, `Book ${category.name}`),
          el("a", { class: "link-arrow", href: faqGroupFor(category) }, "What to expect")
        )
      )
    );
  };

  const buildNav = (categories) => {
    const nav = document.querySelector("[data-cat-nav]");
    if (!nav) {
      return;
    }
    nav.replaceChildren(...categories.map((category) =>
      el("a", { href: `#${category.id}` }, category.name)));

    // Highlight the category currently on screen.
    const links = new Map([...nav.querySelectorAll("a")].map((link) => [link.hash.slice(1), link]));
    // Leaving sections are handled before entering ones, so scrolling back
    // above the first category clears the highlight.
    const observer = new IntersectionObserver((entries) => {
      [...entries].sort((a, b) => Number(a.isIntersecting) - Number(b.isIntersecting)).forEach((entry) => {
        const link = links.get(entry.target.id);
        if (!entry.isIntersecting) {
          link?.removeAttribute("aria-current");
          return;
        }
        links.forEach((item) => item.removeAttribute("aria-current"));
        link?.setAttribute("aria-current", "true");
        nav.scrollTo({ left: link.offsetLeft - nav.clientWidth / 2 + link.offsetWidth / 2, behavior: "smooth" });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    document.querySelectorAll(".service-block").forEach((section) => observer.observe(section));
  };

  document.addEventListener("buddies:ready", async () => {
    const container = document.querySelector("[data-services]");
    try {
      const [categories, staff] = await Promise.all([getServices(), getStaff().catch(() => [])]);
      container.replaceChildren(...categories.map((category, index) => block(category, staff, index)));
      buildNav(categories);
      Buddies.observeReveal?.();
      // Re-apply a #category in the URL now that the sections exist.
      if (window.location.hash) {
        document.getElementById(window.location.hash.slice(1))?.scrollIntoView();
      }
    } catch (error) {
      console.error(error);
      showError(container, "Our services are loading slowly. Call (202) 926-7178 or book online to see the full menu.");
    }
  });
})();
