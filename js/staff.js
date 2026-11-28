// Buddies Spa — Our Team page (M-Staff).
// Cards with photo, title, bio, specialties and the services each person
// performs, a Book button ("Book with …" when they have their own Square
// link), and filters by service.

(() => {
  const Buddies = window.Buddies;
  const { el, img, getStaff, getServices, showError } = Buddies;

  // "Book with {first name}" or "Book now": see personBooking() in js/feeds.js.
  const bookButton = (person) => {
    const { href, label } = Buddies.personBooking(person);
    return el("a", { class: "btn btn--sm", href }, label);
  };

  const card = (person, categoriesById) => {
    const placeholderTitle = Buddies.isPlaceholderText(person.title);
    return el("article", {
      class: `card staff-card reveal${person.placeholder ? " ph" : ""}`,
      id: person.id,
      dataset: { services: (person.services || []).join(" ") }
    },
      el("div", { class: "card__media" },
        img(person.photo, `Portrait of ${person.name}`, { width: 800, height: 1000 })
      ),
      el("div", { class: "card__body" },
        person.placeholder ? Buddies.phTag() : null,
        el("h2", { class: "card__title" }, person.name),
        el("p", { class: "staff-card__title" }, placeholderTitle ? Buddies.inline(person.title) : person.title),
        el("p", { class: "card__text" }, person.bio),
        person.specialties?.length
          ? el("ul", { class: "chips", "aria-label": "Specialties" }, person.specialties.map((item) => el("li", { class: "chip" }, item)))
          : null,
        person.services?.length
          ? el("p", { class: "staff-card__services" },
            el("span", {}, "Services: "),
            ...person.services.flatMap((id, index) => {
              const category = categoriesById.get(id);
              const link = el("a", { href: `services.html#${id}` }, category ? category.name : id);
              return index ? [", ", link] : [link];
            }))
          : el("p", { class: "ph-text" }, "[Placeholder: services performed]"),
        el("div", { class: "btn-row" }, bookButton(person))
      )
    );
  };

  const setUpFilters = (categories, staff) => {
    const bar = document.querySelector("[data-staff-filters]");
    const count = document.querySelector("[data-staff-count]");
    const offered = categories.filter((category) => staff.some((person) => person.services?.includes(category.id)));
    const buttons = [{ id: "all", name: "Everyone" }, ...offered].map((category) =>
      el("button", { class: "filter-btn", type: "button", "aria-pressed": String(category.id === "all"), dataset: { filter: category.id } }, category.name));
    bar.replaceChildren(...buttons);

    bar.addEventListener("click", (event) => {
      const button = event.target.closest("[data-filter]");
      if (!button) {
        return;
      }
      const filter = button.dataset.filter;
      buttons.forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
      let shown = 0;
      document.querySelectorAll(".staff-card").forEach((cardElement) => {
        const match = filter === "all" || cardElement.dataset.services.split(" ").includes(filter);
        cardElement.hidden = !match;
        shown += match ? 1 : 0;
      });
      count.textContent = `${shown} team members shown`;
    });
  };

  document.addEventListener("buddies:ready", async () => {
    const grid = document.querySelector("[data-staff]");
    try {
      const [staff, categories] = await Promise.all([getStaff(), getServices()]);
      const categoriesById = new Map(categories.map((category) => [category.id, category]));
      grid.replaceChildren(...staff.map((person) => card(person, categoriesById)));
      setUpFilters(categories, staff);
      Buddies.observeReveal?.();
      if (window.location.hash) {
        document.getElementById(window.location.hash.slice(1))?.scrollIntoView();
      }
    } catch (error) {
      console.error(error);
      showError(grid, "Our team is loading slowly. Please refresh, or call (202) 926-7178.");
    }
  });
})();
