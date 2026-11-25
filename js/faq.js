// Buddies Spa — FAQ page.
// Renders data/faq.json as one section per service, each split into
// Before / During / After your visit, with search and a Book button.

(() => {
  const Buddies = window.Buddies;
  const { el, getJSON, getServices, richText, bookLink, showError } = Buddies;

  // Service groups read Before → During → After, then anything general.
  const SECTIONS = [
    ["before", "Before your visit"],
    ["during", "During your visit"],
    ["after", "After your visit"],
    ["general", null]
  ];

  const questionId = (groupId, index) => `${groupId}-q${index + 1}`;

  const item = (group, question, index) => el("details", {
    id: questionId(group.id, index),
    dataset: { search: `${question.q} ${question.a}`.toLowerCase() }
  },
    el("summary", {}, question.q, question.placeholder ? el("span", { class: "ph-tag faq-ph" }, "Placeholder") : null),
    el("div", { class: "accordion__body" }, richText(question.a))
  );

  const groupSection = (group, category) => {
    const withIndex = group.items.map((question, index) => ({ question, index }));
    return el("section", { class: "faq-group", id: group.id, "aria-labelledby": `${group.id}-title` },
      el("header", { class: "faq-group__head" },
        el("div", {},
          el("h2", { id: `${group.id}-title` }, group.name),
          group.intro ? el("p", { class: "muted" }, group.intro) : null
        ),
        category ? bookLink(category.id, `Book ${category.name}`, "btn btn--sm") : null
      ),
      SECTIONS.map(([key, label]) => {
        const items = withIndex.filter(({ question }) => (question.section || "general") === key);
        if (!items.length) {
          return null;
        }
        return el("div", { class: "faq-section" },
          label ? el("h3", { class: "faq-section__title" }, label) : (key === "general" && group.service ? el("h3", { class: "faq-section__title" }, "Good to know") : null),
          el("div", { class: "accordion" }, items.map(({ question, index }) => item(group, question, index)))
        );
      })
    );
  };

  const setUpSearch = () => {
    const input = document.querySelector("[data-faq-search]");
    const results = document.querySelector("[data-faq-results]");
    document.querySelector("[data-faq-search-form]")?.addEventListener("submit", (event) => event.preventDefault());

    input?.addEventListener("input", () => {
      const query = input.value.trim().toLowerCase();
      let matches = 0;
      document.querySelectorAll(".faq-group").forEach((group) => {
        let groupMatches = 0;
        group.querySelectorAll("details").forEach((details) => {
          const match = !query || details.dataset.search.includes(query);
          details.hidden = !match;
          details.open = Boolean(query && match);
          groupMatches += match ? 1 : 0;
        });
        group.querySelectorAll(".faq-section").forEach((section) => {
          section.hidden = ![...section.querySelectorAll("details")].some((details) => !details.hidden);
        });
        group.hidden = groupMatches === 0;
        matches += groupMatches;
      });
      results.textContent = query
        ? (matches ? `${matches} matching question${matches === 1 ? "" : "s"}` : "No matches. Try another word, or call (202) 926-7178.")
        : "";
    });
  };

  const openFromHash = () => {
    const target = window.location.hash && document.getElementById(window.location.hash.slice(1));
    if (!target) {
      return;
    }
    if (target.tagName === "DETAILS") {
      target.open = true;
    }
    target.scrollIntoView();
  };

  document.addEventListener("buddies:ready", async () => {
    const container = document.querySelector("[data-faq]");
    const toc = document.querySelector("[data-faq-toc]");
    try {
      const [faq, categories] = await Promise.all([getJSON("data/faq.json"), getServices()]);
      const categoriesById = new Map(categories.map((category) => [category.id, category]));

      container.replaceChildren(...faq.groups.map((group) => groupSection(group, categoriesById.get(group.service))));
      toc.replaceChildren(...faq.groups.map((group) =>
        el("li", {}, el("a", { href: `#${group.id}` }, group.name))));

      Buddies.resolveBookLinks?.(container);
      setUpSearch();
      openFromHash();
      window.addEventListener("hashchange", openFromHash);
    } catch (error) {
      console.error(error);
      showError(container, "The FAQ is loading slowly. Please refresh, or call (202) 926-7178.");
    }
  });
})();
