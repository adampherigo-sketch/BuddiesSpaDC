// Buddies Spa — site configuration (single source of truth)
//
// Every page reads business details, hours and booking links from here, so a
// phone number, an hour or a Square link is changed in ONE place.
//
// Anything marked TODO is waiting on the client. See docs/CLIENT-QUESTIONS.md.

window.Buddies = window.Buddies || {};

window.Buddies.config = {
  business: {
    name: "Buddies Spa",
    legalName: "Buddies Spa LLC",
    tagline: "The Queer Spa DC",
    founded: 2022,
    founder: "Kris Otto",
    phone: "(202) 926-7178",
    phoneHref: "tel:+12029267178",
    email: "buddiesmensspa@gmail.com",
    address: {
      street: "317 H St NW",
      city: "Washington",
      region: "DC",
      postalCode: "20001",
      neighborhood: "Mount Vernon Triangle"
    },
    // Google Maps search link; replace with the exact Google Business Profile
    // link once the client shares it (TODO).
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Buddies+Spa+317+H+St+NW+Washington+DC+20001",
    appleMapsUrl: "https://maps.apple.com/?q=Buddies+Spa&address=317+H+St+NW,+Washington,+DC+20001"
  },

  // 0 = Sunday. Times are 24h "HH:MM", Eastern time.
  hours: [
    { day: "Sunday", open: "10:00", close: "18:00" },
    { day: "Monday", open: "10:00", close: "20:00" },
    { day: "Tuesday", open: "10:00", close: "20:00" },
    { day: "Wednesday", open: "10:00", close: "20:00" },
    { day: "Thursday", open: "10:00", close: "20:00" },
    { day: "Friday", open: "10:00", close: "20:00" },
    { day: "Saturday", open: "10:00", close: "20:00" }
  ],

  social: {
    instagram: "https://www.instagram.com/buddies_spa/",
    facebook: "https://www.facebook.com/buddiesmensspa",
    // TODO: Google Business Profile review link ("See all reviews on Google").
    googleReviews: ""
  },

  booking: {
    // Main Square Appointments booking site (the hero "Booking Now" location
    // on the current Square Online site, location L69140BN2KPWP).
    // TODO: confirm with the client that this is the live booking link.
    main: "https://book.squareup.com/appointments/n5shnx2b0xm4kh/location/L69140BN2KPWP/services",
    giftCards: "https://app.squareup.com/gift/MLPP8AGD8S4DY/order",

    // Per-category deep links. Empty = use `main`.
    // TODO: Ask client whether Square supports per-category and per-staff
    // booking links, i.e. whether a Square link can open on a specific team
    // member (this question was on book.html under "Have a favorite?").
    // Per-staff links go in data/staff.json "bookingUrl"; with one set, the
    // Our Team card says "Book with {first name}", otherwise "Book now".
    categories: {
      "mens-waxing": "",
      "womens-waxing": "",
      "trans-waxing": "",
      massage: "",
      facials: "",
      nails: "",
      hair: "",
      "lashes-brows": ""
    },

    // Service and staff Book buttons skip book.html and go straight to Square.
    // The header "Book Now" always opens book.html (gift cards, policies).
    serviceButtonsGoDirect: true
  },

  // Live data sources. While these are empty the site reads the seed files in
  // data/. When M-Events (promos + events) and M-Staff are live for the
  // buddies-spa tenant, set the URLs and nothing else needs to change.
  feeds: {
    tenantId: "buddies-spa",
    eventsUrl: "",   // M-Events public feed (promos and events)
    staffUrl: "",    // M-Staff public feed
    reviewsUrl: "/.netlify/functions/reviews",
    contactUrl: "/.netlify/functions/contact"
  }
};

// Resolve the Square link for a category key ("main" or unknown -> main).
window.Buddies.bookingUrl = (category) => {
  const { booking } = window.Buddies.config;
  return (category && booking.categories[category]) || booking.main;
};
