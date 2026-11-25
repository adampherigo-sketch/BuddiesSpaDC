// Buddies Spa — shared page behavior.
//
// The header and footer HTML live in partials/. The production build writes
// them into every page, so the published site works without JavaScript.
// This script:
//   1. fills in the header/footer when previewing unbuilt source files
//      (VS Code Live Server), by fetching the partials;
//   2. marks the current page in the menu (the build does the same);
//   3. runs the mobile menu, the footer's "Replay welcome" and reveal-on-scroll;
//   4. points Book buttons at Square and fills in hours, "open now" and the year.

document.documentElement.classList.add("has-js");

(() => {
  const Buddies = window.Buddies;
  const DESKTOP_MIN = 980; // matches css/mobile-nav.css
  const INTRO_KEY = "buddies-intro-seen"; // shared with js/intro.js

  const loadPartial = async (container, name) => {
    if (!container || container.children.length) {
      return;
    }
    try {
      const response = await fetch(`partials/${name}.html`);
      if (response.ok) {
        container.innerHTML = (await response.text()).replace(/^<!--[\s\S]*?-->\s*/, "");
      }
    } catch {
      // Offline or blocked: the page still renders without the partial.
    }
  };

  const currentPage = () => window.location.pathname.split("/").pop() || "index.html";

  // Keep in sync with markActiveLinks() in scripts/build-site.js.
  const markActiveLinks = (header, footer) => {
    const page = currentPage().replace(/^(?!.*\.html$)(.+)$/, "$1.html");
    header?.querySelectorAll(".primary-nav a:not(.btn)").forEach((link) => {
      if (link.getAttribute("href") === page) {
        link.setAttribute("aria-current", "page");
      }
    });
    footer?.querySelectorAll(".footer-col a").forEach((link) => {
      if (link.getAttribute("href") === page) {
        link.setAttribute("aria-current", "page");
      }
    });
  };

  const setUpMenu = (header) => {
    const toggle = header?.querySelector(".nav-toggle");
    const nav = header?.querySelector(".primary-nav");
    if (!toggle || !nav) {
      return;
    }

    const isOpen = () => toggle.getAttribute("aria-expanded") === "true";
    const setOpen = (open) => {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.textContent = open ? "Close" : "Menu";
      header.classList.toggle("nav-open", open);
      nav.classList.toggle("is-open", open);
      document.body.classList.toggle("nav-locked", open);
    };

    toggle.addEventListener("click", () => setOpen(!isOpen()));
    nav.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => setOpen(false)));

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && isOpen()) {
        setOpen(false);
        toggle.focus();
      }
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth >= DESKTOP_MIN && isOpen()) {
        setOpen(false);
      }
    });
  };

  // "Replay welcome" in the footer: forget the intro and show it again
  // (in place on the home page, otherwise by going home).
  const setUpReplay = () => {
    document.querySelectorAll("[data-replay-intro]").forEach((button) => {
      button.addEventListener("click", () => {
        try {
          window.localStorage.removeItem(INTRO_KEY);
        } catch {
          // Storage blocked: the intro simply shows again on the home page.
        }
        if (Buddies?.intro?.replay) {
          Buddies.intro.replay();
        } else {
          window.location.href = "index.html";
        }
      });
    });
  };

  // Book buttons with data-book="<category>" go straight to Square when the
  // config says so; their href in the HTML (book.html#…) is the fallback.
  const resolveBookLinks = (root = document) => {
    if (!Buddies?.config?.booking?.serviceButtonsGoDirect) {
      return;
    }
    root.querySelectorAll("a[data-book]").forEach((link) => {
      link.href = Buddies.bookingUrl(link.dataset.book);
    });
  };

  // Current time in Washington, DC.
  const nowInDC = () => {
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      weekday: "long",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    }).formatToParts(new Date()).map((part) => [part.type, part.value]));
    return { day: parts.weekday, time: `${parts.hour}:${parts.minute}` };
  };

  const formatTime = (value) => {
    const [hours, minutes] = value.split(":").map(Number);
    const suffix = hours >= 12 ? "PM" : "AM";
    const hour = hours % 12 || 12;
    return minutes ? `${hour}:${String(minutes).padStart(2, "0")} ${suffix}` : `${hour} ${suffix}`;
  };

  const fillHours = () => {
    const hours = Buddies?.config?.hours;
    if (!hours) {
      return;
    }
    const now = nowInDC();
    const today = hours.find((entry) => entry.day === now.day);
    const open = Boolean(today && now.time >= today.open && now.time < today.close);

    document.querySelectorAll("[data-open-status]").forEach((element) => {
      element.dataset.open = String(open);
      element.textContent = open
        ? `Open now · until ${formatTime(today.close)}`
        : "Closed now";
    });

    // Full week, starting Monday, with today highlighted.
    document.querySelectorAll("[data-hours-full]").forEach((list) => {
      const week = [...hours.slice(1), hours[0]];
      list.replaceChildren(...week.flatMap((entry) => {
        const dt = document.createElement("dt");
        const dd = document.createElement("dd");
        dt.textContent = entry.day;
        dd.textContent = `${formatTime(entry.open)} – ${formatTime(entry.close)}`;
        if (entry.day === now.day) {
          dt.classList.add("is-today");
          dd.classList.add("is-today");
        }
        return [dt, dd];
      }));
    });
  };

  const setUpReveal = () => {
    const items = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) {
      items.forEach((item) => item.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    items.forEach((item) => observer.observe(item));
  };

  document.addEventListener("DOMContentLoaded", async () => {
    const header = document.querySelector("[data-site-header]");
    const footer = document.querySelector("[data-site-footer]");

    await Promise.all([loadPartial(header, "header"), loadPartial(footer, "footer")]);

    markActiveLinks(header, footer);
    setUpMenu(header);
    setUpReplay();
    resolveBookLinks();
    fillHours();
    setUpReveal();

    document.querySelectorAll("[data-current-year]").forEach((element) => {
      element.textContent = String(new Date().getFullYear());
    });

    document.dispatchEvent(new CustomEvent("buddies:ready"));
  });

  if (Buddies) {
    Buddies.resolveBookLinks = resolveBookLinks;
    Buddies.observeReveal = setUpReveal;
  }
})();
