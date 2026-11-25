// Buddies Spa — Careers: role cards from data/careers.json. "Apply" fills in
// the Position dropdown and jumps to the form.

(() => {
  const Buddies = window.Buddies;
  const { el, getJSON, inline, showError } = Buddies;

  const choose = (title) => {
    const select = document.querySelector("[data-position-select]");
    if (select) {
      select.value = title;
      select.setAttribute("aria-invalid", "false");
    }
    document.getElementById("apply")?.scrollIntoView();
    window.setTimeout(() => document.getElementById("ap-name")?.focus({ preventScroll: true }), 400);
  };

  const card = (role) => el("article", { class: `role reveal${role.placeholder ? " ph" : ""}` },
    role.placeholder ? Buddies.phTag() : null,
    el("h3", {}, role.title),
    el("p", { class: "role__type" }, inline(role.type)),
    el("p", { class: "role__summary" }, role.summary),
    role.requirements?.length ? el("ul", { class: "role__reqs" }, role.requirements.map((item) => el("li", {}, inline(item)))) : null,
    el("button", { class: "btn btn--sm btn--outline", type: "button", dataset: { role: role.title } }, "Apply for this role")
  );

  document.addEventListener("buddies:ready", async () => {
    const grid = document.querySelector("[data-roles]");
    try {
      const { roles } = await getJSON("data/careers.json");
      grid.replaceChildren(...roles.map(card));
      grid.addEventListener("click", (event) => {
        const button = event.target.closest("[data-role]");
        if (button) {
          choose(button.dataset.role);
        }
      });
      Buddies.observeReveal?.();
    } catch (error) {
      console.error(error);
      showError(grid, "Roles are loading slowly. You can still apply with the form below.");
    }
  });
})();
