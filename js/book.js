// Buddies Spa — Book Now: branded hand-off to Square.
// Category quick links and "book with" links. If a visitor arrives with a
// category (book.html#nails), that card is highlighted.

(() => {
  const Buddies = window.Buddies;
  const { el, img, getServices, getStaff, showError } = Buddies;

  const categoryCard = (category) => el("a", {
    class: "book-card",
    id: category.id,
    href: Buddies.bookingUrl(category.id)
  },
    img(category.image, "", { width: 400, height: 400 }),
    el("span", { class: "book-card__body" },
      el("span", { class: "book-card__name" }, category.name),
      el("span", { class: "book-card__short" }, category.short),
      el("span", { class: "book-card__cta" }, "Book →")
    )
  );

  const personLink = (person) => el("a", {
    class: "person-chip",
    href: Buddies.safeUrl(person.bookingUrl) || Buddies.bookingUrl(person.services?.[0])
  },
    img(person.photo, "", { width: 96, height: 96 }),
    el("span", {},
      el("strong", {}, person.name),
      Buddies.isPlaceholderText(person.title) ? null : el("small", {}, person.title)
    )
  );

  // book.html#nails or book.html?service=nails (used by the home page
  // specials); "skin-care" maps to the facials category.
  const SERVICE_ALIASES = { "skin-care": "facials", skin: "facials" };
  const requestedCategory = () => {
    const service = new URLSearchParams(window.location.search).get("service") || "";
    return window.location.hash.slice(1) || SERVICE_ALIASES[service] || service;
  };

  const highlightFromHash = () => {
    const id = requestedCategory();
    document.querySelectorAll(".book-card").forEach((card) => card.classList.toggle("is-selected", card.id === id));
    const selected = id ? document.getElementById(id) : null;
    if (selected?.classList.contains("book-card")) {
      selected.scrollIntoView({ block: "center" });
    }
  };

  document.addEventListener("buddies:ready", async () => {
    // The main button always goes straight to Square.
    document.querySelectorAll("[data-book-always]").forEach((link) => {
      link.href = Buddies.bookingUrl(link.dataset.book);
    });

    const grid = document.querySelector("[data-book-categories]");
    const people = document.querySelector("[data-book-staff]");

    try {
      const categories = await getServices();
      grid.replaceChildren(...categories.map(categoryCard));
      highlightFromHash();
      window.addEventListener("hashchange", highlightFromHash);
    } catch (error) {
      console.error(error);
      showError(grid, "Use the Book Your Appointment button above to see every service.");
    }

    try {
      const staff = await getStaff();
      people.replaceChildren(...staff.map(personLink));
    } catch (error) {
      console.error(error);
      people.replaceChildren();
    }
  });
})();
