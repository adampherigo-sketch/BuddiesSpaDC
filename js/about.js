// Buddies Spa — About: compact team grid from M-Staff.

(() => {
  const Buddies = window.Buddies;
  const { el, img, getStaff, showError } = Buddies;

  document.addEventListener("buddies:ready", async () => {
    const grid = document.querySelector("[data-about-team]");
    if (!grid) {
      return;
    }
    try {
      const staff = await getStaff();
      grid.replaceChildren(...staff.map((person) =>
        el("a", { class: "about-person reveal", href: `staff.html#${person.id}` },
          img(person.photo, `${person.name}`, { width: 300, height: 300 }),
          el("span", { class: "about-person__name" }, person.name),
          Buddies.isPlaceholderText(person.title) ? null : el("span", { class: "about-person__title" }, person.title)
        )
      ));
      Buddies.observeReveal?.();
    } catch (error) {
      console.error(error);
      showError(grid, "Meet the team on our Our Team page.");
    }
  });
})();
