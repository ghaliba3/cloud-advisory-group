// Guided enquiry chat. Asks which practice areas a client needs, then sends a
// summary through Formspree. Scripted, not AI: every question is fixed below.
(() => {
  // Formspree form that delivers to support@cloudadvisory.au. Change it here.
  const CHAT_ENDPOINT = "https://formspree.io/f/xyezrzyw";

  const AREAS = ["AWS", "Microsoft Azure", "Google Cloud", "Salesforce", "APIs and integration", "AI & ML"];
  const NEEDS = ["New build or migration", "Architecture review", "Cost optimisation", "Security and compliance", "Ongoing support", "Something else"];
  const TIMING = ["As soon as possible", "Within 3 months", "3 to 6 months", "Just exploring"];

  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };

  const launcher = el("button", "chat__launcher", "Talk to us");
  launcher.type = "button";
  launcher.setAttribute("aria-haspopup", "dialog");
  const panel = el("section", "chat");
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Enquiry chat");
  panel.hidden = true;
  panel.innerHTML = `
    <header class="chat__head"><strong>Cloud Advisory Group</strong><button class="chat__close" type="button" aria-label="Close chat">×</button></header>
    <div class="chat__log" aria-live="polite"></div>
    <div class="chat__input"></div>`;
  document.body.append(launcher, panel);
  const log = panel.querySelector(".chat__log");
  const input = panel.querySelector(".chat__input");

  const answers = { areas: [], need: "", details: "", timing: "", name: "", company: "", email: "" };
  let started = false;

  const say = (text, who = "bot") => {
    const m = el("p", `chat__msg chat__msg--${who}`, text);
    log.append(m);
    log.scrollTop = log.scrollHeight;
  };

  function chips(options, { multi = false, skip = null } = {}) {
    return new Promise((resolve) => {
      input.replaceChildren();
      const wrap = el("div", "chat__chips");
      const picked = new Set();
      const done = el("button", "chat__send", multi ? "Continue" : "");
      done.type = "button";
      options.forEach((o) => {
        const b = el("button", "chat__chip", o);
        b.type = "button";
        b.addEventListener("click", () => {
          if (!multi) return finish([o]);
          picked.has(o) ? picked.delete(o) : picked.add(o);
          b.classList.toggle("is-on");
          b.setAttribute("aria-pressed", picked.has(o));
          done.disabled = picked.size === 0;
        });
        wrap.append(b);
      });
      input.append(wrap);
      if (multi) {
        done.disabled = true;
        done.addEventListener("click", () => finish([...picked]));
        input.append(done);
      }
      if (skip) {
        const s = el("button", "chat__skip", skip);
        s.type = "button";
        s.addEventListener("click", () => finish([]));
        input.append(s);
      }
      function finish(v) {
        say(v.length ? v.join(", ") : skip, "user");
        input.replaceChildren();
        resolve(v);
      }
    });
  }

  function ask({ placeholder, type = "text", required = true, multiline = false, check }) {
    return new Promise((resolve) => {
      input.replaceChildren();
      const f = el("form", "chat__form");
      f.noValidate = true;
      const field = el(multiline ? "textarea" : "input", "chat__field");
      if (!multiline) field.type = type;
      field.placeholder = placeholder;
      field.setAttribute("aria-label", placeholder);
      if (multiline) field.rows = 3;
      const send = el("button", "chat__send", "Send");
      send.type = "submit";
      const err = el("p", "chat__err");
      f.append(field, send);
      if (!required) {
        const s = el("button", "chat__skip", "Skip");
        s.type = "button";
        s.addEventListener("click", () => done(""));
        f.append(s);
      }
      f.append(err);
      f.addEventListener("submit", (e) => {
        e.preventDefault();
        const v = field.value.trim();
        if (required && !v) return (err.textContent = "Please add an answer, or close the chat.");
        if (v && check && !check(v)) return (err.textContent = "That doesn't look right. Please check it.");
        done(v);
      });
      input.append(f);
      field.focus();
      function done(v) {
        say(v || "Skipped", "user");
        input.replaceChildren();
        resolve(v);
      }
    });
  }

  async function run() {
    say("Hi. I'll ask a few quick questions, then pass your enquiry to our team at support@cloudadvisory.au.");
    say("Which areas do you need help with? Choose all that apply.");
    answers.areas = await chips([...AREAS, "Not sure yet"], { multi: true });
    say("What kind of help are you after?");
    answers.need = (await chips(NEEDS))[0];
    say("Tell us a little about it: your systems, goals or the problem you're facing.");
    answers.details = await ask({ placeholder: "A few sentences is plenty", multiline: true, required: false });
    say("When would you like to start?");
    answers.timing = (await chips(TIMING))[0];
    say("Great. What's your name?");
    answers.name = await ask({ placeholder: "Your name" });
    say("Which organisation are you with?");
    answers.company = await ask({ placeholder: "Organisation", required: false });
    say("And the best email to reach you on?");
    answers.email = await ask({ placeholder: "you@company.com", type: "email", check: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) });
    await submit();
  }

  async function submit() {
    say("Sending your enquiry…");
    const body = new FormData();
    body.append("_subject", `Website chat: ${answers.areas.join(", ") || "General"} (${answers.name})`);
    body.append("_replyto", answers.email);
    body.append("email", answers.email);
    body.append("name", answers.name);
    body.append("organisation", answers.company || "-");
    body.append("areas", answers.areas.join(", "));
    body.append("help_needed", answers.need);
    body.append("timing", answers.timing);
    body.append("details", answers.details || "-");
    body.append("source", "Website chat");
    try {
      const res = await fetch(CHAT_ENDPOINT, { method: "POST", headers: { Accept: "application/json" }, body });
      if (!res.ok) throw new Error(res.status);
      say(`Thanks, ${answers.name}. Your enquiry is with our team, and we'll reply to ${answers.email} within one business day.`);
    } catch {
      say("Sorry, that didn't send. Your answers are below so you can try again, or email support@cloudadvisory.au.");
      const retry = el("button", "chat__send", "Try again");
      retry.type = "button";
      retry.addEventListener("click", () => {
        input.replaceChildren();
        submit();
      });
      input.replaceChildren(retry);
    }
  }

  const open = () => {
    panel.hidden = false;
    launcher.hidden = true;
    if (!started) {
      started = true;
      run();
    }
  };
  const close = () => {
    panel.hidden = true;
    launcher.hidden = false;
    launcher.focus();
  };
  launcher.addEventListener("click", open);
  panel.querySelector(".chat__close").addEventListener("click", close);
  document.addEventListener("keydown", (e) => e.key === "Escape" && !panel.hidden && close());
  document.querySelectorAll("[data-open-chat]").forEach((a) =>
    a.addEventListener("click", (e) => {
      e.preventDefault();
      open();
    })
  );
})();
