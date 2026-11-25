// Buddies Spa — first-visit welcome on the home page (from the homepage design).
//
// Two wood doors cover the screen with the sign: a black disc with "Welcome
// to", the rainbow neon "Buddies Spa" and "The Queer Spa DC". Scrolling the first
// screen-height opens the doors; the seal shrinks smoothly into the header
// and the nav fades in. Once fully open,
// the spacer is removed (keeping the hero exactly where it is) and the intro
// is remembered in localStorage, so it shows once per browser. "Replay
// welcome" in the footer shows it again.
//
// js/intro-gate.js decides before first paint whether to show it at all.
// Everything here only sets CSS custom properties and classes (the strict
// CSP allows CSSOM changes); the look lives in css/home.css.

(() => {
  // ---- Tuning ---------------------------------------------------------------
  // Edit these to change how the doors open. "Ranges" are [start, end] as a
  // fraction of the opening: 0 = doors closed, 1 = fully open. The opening is
  // eased (slow start and end), except the scroll cue, which follows the
  // scroll directly. Colors, fonts and door decoration live in css/home.css.
  // Preview every change with index.html?intro (or `npm run dev`).
  const TUNING = {
    doorTravel: 101,            // % of its own width each door slides out
    textFade: [0.1, 0.45],      // "Welcome to" (inside the sign) fades out
    headerBackground: [0.55, 1],// header background fades in (to 96%)
    headerLine: [0.7, 1],       // gold hairline under the header fades in
    headerLinks: [0.75, 1],     // nav links and Book now fade in
    headerUsableAt: 0.9,        // nav becomes clickable after this point
    cueFade: [0, 0.2],          // "Scroll to open" fades out
    sealStart: 440,             // px diameter of the black disc at the start
    sealWidthShare: 0.5,        // …at most this share of the screen width (the neon runs wider)
    sealHeightShare: 0.56,      // …and of the screen height
    sealEnd: 92,                // px once docked in the header (desktop)
    sealEndPhone: 64,           // …below 980px wide (matches css/mobile-nav.css)
    subtitleFade: [0.55, 0.85], // the sign recenters as it gets small
    smoothing: 0.07,            // 0–1: lower = floatier, higher = snappier
    catchUp: 0.2,               // …used once you've scrolled past the doors, so they finish promptly
    doorScroll: 1.8,            // screen-heights of scrolling to open the doors fully
    enterDuration: 2400         // ms for "Scroll to open" / logo click to open them
  };
  // ---------------------------------------------------------------------------

  const KEY = "buddies-intro-seen";
  const VARS = ["--intro-dx", "--intro-text", "--med-top", "--med-scale", "--door-scroll", "--cue", "--nav-bg", "--nav-line", "--nav-links", "--logo-small"];

  const root = document.documentElement;
  const intro = document.querySelector("[data-intro]");
  const spacer = document.querySelector("[data-intro-spacer]");
  const cue = document.querySelector("[data-intro-cue]");
  if (!intro || !spacer || !cue) {
    return;
  }

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let active = false;
  let frame = 0;

  const clamp01 = (value) => Math.min(1, Math.max(0, value));
  const ramp = (value, from, to) => clamp01((value - from) / (to - from));
  // Gentle ease: no lunge in the middle, soft start and finish.
  const easeInOutSine = (p) => -(Math.cos(Math.PI * p) - 1) / 2;
  const headerMiddle = () => (parseFloat(getComputedStyle(root).getPropertyValue("--header-h")) || 80) / 2;
  const doorHeight = () => spacer.offsetHeight || window.innerHeight;

  const remember = () => {
    try {
      window.localStorage.setItem(KEY, "1");
    } catch {
      // Storage blocked: nothing to remember.
    }
  };

  // The header's links can't be reached until the doors are nearly open.
  const setHeaderReachable = (reachable) => {
    document.querySelectorAll(".primary-nav, .nav-toggle, .header-book").forEach((element) => {
      element.inert = !reachable;
    });
  };

  const setMedallionLabel = (opening) => {
    document.querySelector("[data-medallion]")?.setAttribute("aria-label", opening ? "Enter Buddies Spa" : "Buddies Spa home");
  };

  // The seal is drawn at 420px (css/style.css .medallion) and scaled down.
  const SEAL_BOX = 420;
  const startDiameter = () => Math.min(TUNING.sealStart, window.innerWidth * TUNING.sealWidthShare, window.innerHeight * TUNING.sealHeightShare);

  const render = (p) => {
    const e = easeInOutSine(p);
    const start = startDiameter();
    const end = window.innerWidth < 980 ? TUNING.sealEndPhone : TUNING.sealEnd;
    const diameter = start + (end - start) * e;
    const top = (window.innerHeight / 2) * (1 - e) + headerMiddle() * e;
    const values = {
      "--med-scale": (diameter / SEAL_BOX).toFixed(4),
      "--med-top": `${top.toFixed(1)}px`,
      "--logo-small": ramp(e, ...TUNING.subtitleFade).toFixed(3),
      "--intro-dx": (e * TUNING.doorTravel).toFixed(2),
      "--intro-text": (1 - ramp(e, ...TUNING.textFade)).toFixed(3),
      "--cue": (1 - ramp(p, ...TUNING.cueFade)).toFixed(3),
      "--nav-bg": (0.96 * ramp(e, ...TUNING.headerBackground)).toFixed(3),
      "--nav-line": (0.6 * ramp(e, ...TUNING.headerLine)).toFixed(3),
      "--nav-links": ramp(e, ...TUNING.headerLinks).toFixed(3)
    };
    for (const [name, value] of Object.entries(values)) {
      root.style.setProperty(name, value);
    }
    const live = p > TUNING.headerUsableAt;
    root.classList.toggle("intro-nav-live", live);
    setHeaderReachable(live);
    cue.classList.toggle("is-faded", p >= TUNING.cueFade[1] * 0.75);
    setMedallionLabel(p < 0.5);
  };

  const finish = () => {
    // Where the hero sits on screen now. Hiding the spacer shifts it, and some
    // browsers (Chrome, Firefox: "scroll anchoring") correct for that on their
    // own while others (Safari) don't, so measure and correct only what's left.
    const hero = spacer.nextElementSibling;
    const heroTop = hero ? hero.getBoundingClientRect().top : 0;
    active = false;
    remember();
    root.classList.remove("intro-active", "intro-nav-live");
    intro.hidden = true;
    cue.hidden = true;
    spacer.hidden = true;
    VARS.forEach((name) => root.style.removeProperty(name));
    setHeaderReachable(true);
    setMedallionLabel(false);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onScroll);
    // Keep the hero exactly where it was. Usually 0 in Chrome/Firefox (no
    // scroll at all, so wheel and trackpad momentum carry on untouched).
    const shift = hero ? hero.getBoundingClientRect().top - heroTop : 0;
    if (Math.abs(shift) >= 1) {
      window.scrollBy({ top: shift, behavior: "instant" });
    }
  };

  // The shown progress glides toward the scroll position each frame, so the
  // motion stays fluid even when a mouse wheel scrolls in jumps.
  let shown = 0;
  const update = () => {
    frame = 0;
    if (!active) {
      return;
    }
    const target = clamp01(window.scrollY / doorHeight());
    // Once scrolled past the doors, glide the rest of the way faster so the
    // intro wraps up promptly instead of trailing behind the page.
    const ease = target >= 0.999 ? TUNING.catchUp : TUNING.smoothing;
    shown += (target - shown) * (reducedMotion ? 1 : ease);
    if (Math.abs(target - shown) < 0.0008) {
      shown = target;
    }
    if (target >= 0.999 && shown >= 0.995) {
      finish();
      return;
    }
    render(shown);
    if (shown !== target) {
      frame = window.requestAnimationFrame(update);
    }
  };

  function onScroll() {
    if (!frame) {
      frame = window.requestAnimationFrame(update);
    }
  }

  const start = () => {
    active = true;
    root.classList.add("intro-active");
    intro.hidden = false;
    cue.hidden = false;
    spacer.hidden = false;
    root.style.setProperty("--door-scroll", String(TUNING.doorScroll));
    window.scrollTo({ top: 0, behavior: "instant" });
    shown = 0;
    render(0);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
  };

  // Opens the doors with a slow, even scroll (the browser's own smooth
  // scroll is quick and fixed). Any wheel, touch or key input takes over.
  let entering = 0;
  const enter = () => {
    const from = window.scrollY;
    const to = doorHeight();
    if (reducedMotion) {
      window.scrollTo({ top: to, behavior: "instant" });
      return;
    }
    const startTime = performance.now();
    const stop = () => {
      cancelAnimationFrame(entering);
      entering = 0;
      ["wheel", "touchstart", "keydown"].forEach((type) => window.removeEventListener(type, stop));
    };
    ["wheel", "touchstart", "keydown"].forEach((type) => window.addEventListener(type, stop, { passive: true }));
    const step = (now) => {
      const t = Math.min(1, (now - startTime) / TUNING.enterDuration);
      window.scrollTo({ top: from + (to - from) * easeInOutSine(t), behavior: "instant" });
      if (t < 1 && active) {
        entering = requestAnimationFrame(step);
      } else {
        stop();
      }
    };
    cancelAnimationFrame(entering);
    entering = requestAnimationFrame(step);
  };

  cue.addEventListener("click", enter);

  // The medallion opens the doors during the intro, and afterwards takes you
  // back to the top of the home page instead of reloading it.
  document.addEventListener("click", (event) => {
    if (!event.target.closest("[data-medallion]")) {
      return;
    }
    event.preventDefault();
    if (active) {
      enter();
      return;
    }
    document.querySelector('.nav-toggle[aria-expanded="true"]')?.click();
    window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
  });

  window.Buddies = window.Buddies || {};
  window.Buddies.intro = {
    replay: () => {
      if (!active) {
        start();
      }
    }
  };

  if ("scrollRestoration" in window.history) {
    window.history.scrollRestoration = root.classList.contains("intro-active") ? "manual" : window.history.scrollRestoration;
  }

  if (root.classList.contains("intro-active")) {
    start();
  }
})();
