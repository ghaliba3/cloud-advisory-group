// Contact address used by the email link and the enquiry form. Change it here.
const CONTACT_EMAIL = "cloudadvisorygroup@gmail.com";

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

// GitHub Pages has no server, so the form opens a pre-filled email.
const form = document.getElementById("contact-form");
const note = form.querySelector(".form__note");
form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!form.checkValidity()) {
    note.textContent = "Please add your name, email and a short message.";
    form.reportValidity();
    return;
  }
  const d = new FormData(form);
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
