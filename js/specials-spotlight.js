// Buddies Spa — Monthly Specials: Spotlight (home page).
//
// Enhances every <section data-bs-spotlight> into accessible tabs (WAI-ARIA
// tabs pattern). Without this script the tab list stays hidden and all
// panels show stacked (see css/specials-spotlight.css).
//
// Settings on the section:
//   data-default="nails"       tab shown on load (matches a tab's data-key)
//   data-expires="2026-11-30"  hide the section after 23:59:59 local time
// Deep links: #special-<key> (e.g. #special-massage) selects that tab and
// scrolls to the section, on load and on hash change.

(() => {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const narrow = window.matchMedia("(max-width: 860px)");

  const isExpired = (value) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
    if (!match) {
      return false;
    }
    const lastMoment = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 23, 59, 59, 999);
    return Date.now() > lastMoment.getTime();
  };

  const setUp = (section) => {
    if (isExpired(section.dataset.expires)) {
      section.hidden = true;
      return null;
    }

    const tablist = section.querySelector('[role="tablist"]');
    const tabs = [...section.querySelectorAll('[role="tab"]')];
    const panels = tabs.map((tab) => section.querySelector(`#${CSS.escape(tab.getAttribute("aria-controls"))}`));
    if (!tablist || !tabs.length || panels.some((panel) => !panel)) {
      return null;
    }

    // Keep the selected chip visible inside the swipeable row (narrow
    // screens) without scrolling the page itself.
    const revealChip = (tab) => {
      if (!narrow.matches) {
        return;
      }
      const left = tab.offsetLeft - (tablist.clientWidth - tab.offsetWidth) / 2;
      tablist.scrollTo({ left: Math.max(0, left), behavior: reducedMotion.matches ? "auto" : "smooth" });
    };

    const replayEntrance = (panel) => {
      if (reducedMotion.matches) {
        return;
      }
      panel.classList.remove("is-entering");
      void panel.offsetWidth; // restart the CSS animation
      panel.classList.add("is-entering");
    };

    const select = (index, { focus = false, animate = true } = {}) => {
      tabs.forEach((tab, i) => {
        const selected = i === index;
        tab.setAttribute("aria-selected", String(selected));
        tab.tabIndex = selected ? 0 : -1;
        panels[i].hidden = !selected;
      });
      if (focus) {
        tabs[index].focus();
      }
      if (animate) {
        replayEntrance(panels[index]);
      }
      revealChip(tabs[index]);
    };

    const indexOfKey = (key) => tabs.findIndex((tab) => tab.dataset.key === key);
    const indexOfPanelId = (id) => panels.findIndex((panel) => panel.id === id);

    tablist.addEventListener("click", (event) => {
      const tab = event.target.closest('[role="tab"]');
      if (tab) {
        select(tabs.indexOf(tab));
      }
    });

    tablist.addEventListener("keydown", (event) => {
      const current = tabs.indexOf(document.activeElement);
      if (current < 0) {
        return;
      }
      const last = tabs.length - 1;
      const next = {
        ArrowRight: current === last ? 0 : current + 1,
        ArrowDown: current === last ? 0 : current + 1,
        ArrowLeft: current === 0 ? last : current - 1,
        ArrowUp: current === 0 ? last : current - 1,
        Home: 0,
        End: last
      }[event.key];
      if (next === undefined) {
        return;
      }
      event.preventDefault();
      select(next, { focus: true });
    });

    section.classList.add("is-enhanced");

    const fromHash = (scroll) => {
      const index = indexOfPanelId(window.location.hash.slice(1));
      if (index < 0) {
        return false;
      }
      select(index);
      if (scroll) {
        section.scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth", block: "start" });
      }
      return true;
    };

    if (!fromHash(true)) {
      const fallback = indexOfKey(section.dataset.default);
      select(fallback >= 0 ? fallback : 0, { animate: false });
    }

    return () => fromHash(true);
  };

  const onHashChange = [];
  document.querySelectorAll("[data-bs-spotlight]").forEach((section) => {
    const handler = setUp(section);
    if (handler) {
      onHashChange.push(handler);
    }
  });

  if (onHashChange.length) {
    window.addEventListener("hashchange", () => onHashChange.forEach((handler) => handler()));
  }
})();
