// Contact address used by the email link, the enquiry form and the Meet invite. Change it here.
const CONTACT_EMAIL = "cloudadvisorygroup@gmail.com";
// Optional. Paste a Formspree endpoint (https://formspree.io/f/xxxx) to send enquiries
// straight from the page. Leave empty to open the visitor's email app instead.
const FORM_ENDPOINT = "";

document.getElementById("year").textContent = new Date().getFullYear();

document.querySelectorAll("[data-email]").forEach((a) => {
  a.href = `mailto:${CONTACT_EMAIL}`;
  a.textContent = CONTACT_EMAIL;
});

// Mobile menu
const toggle = document.querySelector(".nav__toggle");
const links = document.getElementById("nav-links");
toggle.addEventListener("click", () => {
  const open = links.classList.toggle("is-open");
  toggle.setAttribute("aria-expanded", String(open));
});
links.addEventListener("click", (e) => {
  if (e.target.closest("a")) {
    links.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
  }
});

// GitHub Pages has no server. With FORM_ENDPOINT set the enquiry is posted to it,
// otherwise the form opens a pre-filled email.
const form = document.getElementById("contact-form");
const note = form.querySelector(".form__note");
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!form.checkValidity()) {
    note.textContent = "Please add your name, email and a short message.";
    form.reportValidity();
    return;
  }
  const d = new FormData(form);
  if (FORM_ENDPOINT) {
    note.textContent = "Sending...";
    try {
      const res = await fetch(FORM_ENDPOINT, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: d,
      });
      if (!res.ok) throw new Error(res.status);
      form.reset();
      note.textContent = "Thanks. We'll reply within one business day.";
    } catch {
      note.textContent = `Sorry, that did not send. Please email ${CONTACT_EMAIL}.`;
    }
    return;
  }
  const subject = `Enquiry: ${d.get("topic")} (${d.get("name")})`;
  const body = [
    `Name: ${d.get("name")}`,
    `Organisation: ${d.get("org") || "-"}`,
    `Email: ${d.get("email")}`,
    `Area of interest: ${d.get("topic")}`,
    "",
    d.get("message"),
  ].join("\n");
  window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  note.textContent = "Your email app should now open with your enquiry ready to send.";
});

// Meet request: opens Google Calendar with the event filled in and the firm invited.
const meet = document.getElementById("meet-form");
const meetNote = meet.querySelector(".form__note");
const stamp = (dt) => dt.getFullYear() + String(dt.getMonth() + 1).padStart(2, "0") + String(dt.getDate()).padStart(2, "0")
  + "T" + String(dt.getHours()).padStart(2, "0") + String(dt.getMinutes()).padStart(2, "0") + "00";
meet.date.min = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
meet.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!meet.checkValidity()) {
    meetNote.textContent = "Please add your name, email, date and start time.";
    meet.reportValidity();
    return;
  }
  const d = new FormData(meet);
  const start = new Date(`${d.get("date")}T${d.get("time")}`);
  const end = new Date(start.getTime() + Number(d.get("length")) * 60000);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `Cloud Advisory Group: ${d.get("topic")} (${d.get("name")})`,
    dates: `${stamp(start)}/${stamp(end)}`,
    ctz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    details: `Name: ${d.get("name")}\nEmail: ${d.get("email")}\nArea of interest: ${d.get("topic")}`,
    add: CONTACT_EMAIL,
  });
  window.open(`https://calendar.google.com/calendar/render?${params}`, "_blank", "noopener");
  meetNote.textContent = "Google Calendar has opened. Choose Add Google Meet video conferencing, then Save to send the invite.";
});
