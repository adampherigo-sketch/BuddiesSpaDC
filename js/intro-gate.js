// Buddies Spa — decides, before the first paint, whether the home page shows
// the welcome doors. Loaded as a small blocking script in <head> so a
// first-time visitor never sees the page flash first. js/intro.js runs them.
//
// No intro when: it was already seen in this browser, storage is blocked
// (it couldn't be remembered), the visitor arrived on a #section link, or
// they prefer reduced motion. Add ?intro to the URL to force it.

(() => {
  // SHOW_EVERY_TIME: true shows the doors on every load of the home page
  // (handy while designing). Set it to false before launch so each visitor
  // sees them once.
  const SHOW_EVERY_TIME = true;

  // Preview switch: index.html?intro shows the doors on every load, for
  // editing them (also used by `npm run dev`).
  if (new URLSearchParams(window.location.search).has("intro")) {
    document.documentElement.classList.add("intro-active");
    return;
  }
  if (!SHOW_EVERY_TIME) {
    try {
      if (window.localStorage.getItem("buddies-intro-seen") === "1") {
        return;
      }
    } catch {
      return;
    }
  }
  if (window.location.hash || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }
  document.documentElement.classList.add("intro-active");
})();
