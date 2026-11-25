// Buddies Spa — Home: "What's coming up" (M-Events), partner logos and
// Google reviews. Specials are js/specials-spotlight.js, the welcome doors
// js/intro.js.

(() => {
  const Buddies = window.Buddies;
  const { el, img, getEvents, getJSON, formatDate, showError, config } = Buddies;
  const MAX_EVENTS = 3;

  // First sentence of an event description, for the one-line summary.
  const summary = (text) => {
    const plain = String(text || "").replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
    const sentence = plain.match(/^.*?[.!?](\s|$)/);
    return (sentence ? sentence[0] : plain).trim();
  };

  const eventRow = (event) => el("div", { class: `event-row${event.placeholder ? " ph" : ""}` },
    el("p", { class: "event-row__date" },
      el("time", { datetime: event.start }, formatDate(event.start, { month: "short", day: "numeric", weekday: "short" }))
    ),
    el("div", { class: "event-row__main" },
      el("h3", {}, Buddies.inline(event.title)),
      el("p", {}, Buddies.inline(summary(event.description)))
    ),
    el("a", { class: "link-arrow", href: "events.html#upcoming" }, "Details")
  );

  const renderEvents = async () => {
    const list = document.querySelector("[data-home-events]");
    if (!list) {
      return;
    }
    try {
      const { upcoming } = await getEvents();
      if (!upcoming.length) {
        list.replaceChildren(el("p", { class: "empty-state" },
          "New events are announced here and on ",
          el("a", { href: config.social.instagram, target: "_blank", rel: "noopener noreferrer" }, "Instagram"),
          ". Planning a celebration? ",
          el("a", { href: "events.html#host" }, "Throw an event with Buddies"),
          "."
        ));
        return;
      }
      list.replaceChildren(...upcoming.slice(0, MAX_EVENTS).map(eventRow));
    } catch (error) {
      console.error(error);
      showError(list, "Events are loading slowly. See the Events page for what's coming up.");
    }
  };

  const renderPartners = async () => {
    const row = document.querySelector("[data-home-partners]");
    if (!row) {
      return;
    }
    try {
      const { partners } = await getJSON("data/partners.json");
      row.replaceChildren(...partners.map((partner) =>
        el("div", { class: "logo-tile" }, img(partner.logo, partner.name, { width: 240, height: 96 }))));
    } catch (error) {
      console.error(error);
      row.replaceChildren();
    }
  };

  const stars = (rating) => {
    const full = Math.round(Number(rating) || 0);
    return el("span", { class: "stars", "aria-label": `${rating} out of 5 stars` }, "★".repeat(full) + "☆".repeat(5 - full));
  };

  const reviewsPlaceholder = (container) => {
    container.replaceChildren(
      el("div", { class: "empty-state ph" },
        el("span", { class: "ph-tag" }, "Placeholder"),
        el("p", {}, "Google reviews appear here automatically once the site is deployed with GOOGLE_PLACES_API_KEY and GOOGLE_PLACE_ID set (see DEPLOYMENT.md)."),
        config.social.googleReviews
          ? el("a", { class: "btn btn--outline", href: config.social.googleReviews, target: "_blank", rel: "noopener noreferrer" }, "Read our reviews on Google")
          : null
      )
    );
  };

  const renderReviews = async () => {
    const container = document.querySelector("[data-reviews]");
    if (!container) {
      return;
    }
    try {
      const data = await getJSON(config.feeds.reviewsUrl);
      if (!data?.ok || !data.reviews?.length) {
        reviewsPlaceholder(container);
        return;
      }
      const googleUrl = Buddies.safeUrl(data.googleMapsUri || config.social.googleReviews);
      container.replaceChildren(
        el("div", { class: "reviews__summary" },
          el("span", { class: "reviews__score" }, Number(data.rating).toFixed(1)),
          el("div", {},
            stars(data.rating),
            el("div", { class: "muted" }, `${data.userRatingCount} reviews on Google`)
          )
        ),
        el("div", { class: "review-grid" }, data.reviews.map((review) =>
          el("figure", { class: "review reveal" },
            stars(review.rating),
            el("blockquote", {}, review.text),
            el("figcaption", {},
              review.authorUri
                ? el("a", { href: Buddies.safeUrl(review.authorUri), target: "_blank", rel: "noopener noreferrer" }, el("strong", {}, review.author))
                : el("strong", {}, review.author),
              review.relativeTime ? ` · ${review.relativeTime}` : ""
            )
          )
        )),
        el("p", { class: "reviews__footer" },
          "Reviews from Google. ",
          googleUrl ? el("a", { href: googleUrl, target: "_blank", rel: "noopener noreferrer" }, "See all reviews on Google") : null
        )
      );
      Buddies.observeReveal?.();
    } catch {
      // Expected in Live Server previews (no serverless functions) and before
      // the Google key is set; show the placeholder.
      reviewsPlaceholder(container);
    }
  };

  document.addEventListener("buddies:ready", () => {
    renderEvents();
    renderPartners();
    renderReviews();
  });
})();
