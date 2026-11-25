// Buddies Spa — shared form handling.
//
// Any <form data-form="contact|application|private-event|partnership"> posts
// JSON to the contact function, tagged with its form type and the page it
// came from. The function emails it through Resend; nothing is stored here.
//
// Markup contract:
//   <form data-form="contact" data-success="Thanks!" novalidate>
//     … fields named as in netlify/functions/contact.js …
//     <div class="hp-field" aria-hidden="true"><input name="website" tabindex="-1" autocomplete="off"></div>
//     <p class="form-status" role="status" data-form-status></p>
//   </form>

(() => {
  const Buddies = window.Buddies;

  const currentPage = () => {
    const name = window.location.pathname.split("/").pop() || "index.html";
    return /\.html$/.test(name) ? name : `${name}.html`;
  };

  const serialize = (form) => {
    const data = new FormData(form);
    const payload = {};
    for (const [key, value] of data.entries()) {
      if (typeof value !== "string") {
        continue;
      }
      if (key.endsWith("[]")) {
        (payload[key] ||= []).push(value);
      } else if (value.trim() !== "" || key === "website") {
        payload[key] = value;
      }
    }
    payload.form_type = form.dataset.form;
    payload.page = currentPage();
    return payload;
  };

  const setStatus = (form, state, message) => {
    const status = form.querySelector("[data-form-status]");
    if (status) {
      status.dataset.state = state;
      status.textContent = message;
    }
  };

  const markInvalid = (form) => {
    let first = null;
    form.querySelectorAll("input, select, textarea").forEach((field) => {
      if (field.name === "website") {
        return;
      }
      const invalid = !field.checkValidity();
      field.setAttribute("aria-invalid", String(invalid));
      if (invalid && !first) {
        first = field;
      }
    });
    return first;
  };

  const setUp = (form) => {
    form.addEventListener("input", (event) => {
      if (event.target.getAttribute("aria-invalid") === "true" && event.target.checkValidity()) {
        event.target.setAttribute("aria-invalid", "false");
      }
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const firstInvalid = markInvalid(form);
      if (firstInvalid) {
        setStatus(form, "error", "Please check the highlighted fields.");
        firstInvalid.focus();
        return;
      }

      const button = form.querySelector("[type=submit]");
      button.disabled = true;
      setStatus(form, "pending", "Sending…");

      try {
        const response = await fetch(Buddies.config.feeds.contactUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(serialize(form))
        });
        const result = await response.json().catch(() => ({}));

        if (response.ok && result.ok) {
          form.reset();
          setStatus(form, "success", form.dataset.success || "Thank you! We'll be in touch soon.");
        } else if (response.status === 429) {
          setStatus(form, "error", "Too many messages at once. Please wait a minute and try again.");
        } else if (result.error === "validation_error") {
          setStatus(form, "error", "Something in the form looks off. Please check your entries and try again.");
        } else {
          throw new Error("delivery failed");
        }
      } catch {
        setStatus(form, "error", `We couldn't send that just now. Please call ${Buddies.config.business.phone} or email ${Buddies.config.business.email}.`);
      } finally {
        button.disabled = false;
      }
    });
  };

  document.addEventListener("buddies:ready", () => {
    document.querySelectorAll("form[data-form]").forEach(setUp);
  });
})();
