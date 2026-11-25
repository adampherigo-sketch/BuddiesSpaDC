// Buddies Spa — Services: expanding columns (home page).
//
// Hovering or focusing a column opens it (.is-active) and closes the rest.
// Leaving keeps the last one open. Waxing is open in the markup, so without
// this script the section still shows one open column and every link works.
// Phones show every card open via CSS, so this only matters on wider screens.

(() => {
  document.querySelectorAll("[data-bs-svc]").forEach((row) => {
    const columns = [...row.querySelectorAll(".bs-svc__col")];
    if (!columns.length) {
      return;
    }

    const open = (column) => {
      if (column.classList.contains("is-active")) {
        return;
      }
      columns.forEach((item) => item.classList.toggle("is-active", item === column));
    };

    columns.forEach((column) => {
      column.addEventListener("mouseenter", () => open(column));
      column.addEventListener("focus", () => open(column));
    });
  });
})();
