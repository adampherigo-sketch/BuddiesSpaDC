// Buddies Spa — Events page (M-Events, tenant buddies-spa).
// Upcoming events soonest first; past events most recent first. Promos never
// appear here (they're filtered by category in js/feeds.js).

(() => {
  const Buddies = window.Buddies;
  const { el, img, getEvents, richText, formatDate, safeUrl, showError } = Buddies;

  const dateBadge = (event) => el("div", { class: "event-date", "aria-hidden": "true" },
    el("span", { class: "event-date__month" }, formatDate(event.start, { month: "short" })),
    el("span", { class: "event-date__day" }, formatDate(event.start, { day: "numeric" }))
  );

  const when = (event) => {
    const date = formatDate(event.start, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    const time = !event.allDay && /T\d/.test(event.start)
      ? formatDate(event.start, { hour: "numeric", minute: "2-digit" })
      : "";
    return time ? `${date} · ${time}` : date;
  };

  const card = (event, past) => {
    const link = safeUrl(event.registrationUrl);
    const label = event.ticketLabel || "Get tickets";
    return el("article", { class: `event-card reveal${event.placeholder ? " ph" : ""}` },
      el("div", { class: "event-card__media" },
        img(event.image, event.imageAlt, { width: 1080, height: 1080 }) || el("div", { class: "event-card__noimg" }, dateBadge(event))
      ),
      el("div", { class: "event-card__body" },
        event.placeholder ? Buddies.phTag() : null,
        el("p", { class: "card__kicker" }, event.category || "Event"),
        el("h3", { class: "event-card__title" }, Buddies.inline(event.title)),
        el("p", { class: "event-card__when" }, el("time", { datetime: event.start }, when(event))),
        event.location?.name ? el("p", { class: "event-card__where" }, [event.location.name, event.location.address].filter(Boolean).join(" · ")) : null,
        el("div", { class: "event-card__desc" }, richText(event.description)),
        past
          ? null
          : el("div", { class: "btn-row" },
            link
              ? el("a", { class: "btn btn--sm", href: link, target: "_blank", rel: "noopener noreferrer" }, label)
              : el("span", { class: "event-card__free" }, event.placeholder ? "[Placeholder: Partiful or ticket link]" : label))
      )
    );
  };

  const fill = (container, events, past, emptyText) => {
    container.classList.remove("is-loading");
    if (!events.length) {
      container.replaceChildren(el("div", { class: "empty-state" },
        el("p", {}, emptyText),
        el("a", { class: "link-arrow", href: Buddies.config.social.instagram, target: "_blank", rel: "noopener noreferrer" }, "Follow @buddies_spa")
      ));
      return;
    }
    container.replaceChildren(...events.map((event) => card(event, past)));
  };

  document.addEventListener("buddies:ready", async () => {
    const upcoming = document.querySelector("[data-events-upcoming]");
    const past = document.querySelector("[data-events-past]");
    try {
      const events = await getEvents();
      fill(upcoming, events.upcoming, false, "New events are announced here first. Check back soon.");
      fill(past, events.past, true, "Past events will appear here.");
      Buddies.observeReveal?.();
    } catch (error) {
      console.error(error);
      showError(upcoming, "Events are loading slowly. Follow @buddies_spa on Instagram for the latest.");
      past.replaceChildren();
    }
  });
})();
