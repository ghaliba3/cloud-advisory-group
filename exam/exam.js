// Practice exam: loads tests.json, runs one test at a time and scores it.
// Progress is kept in sessionStorage so a refresh does not lose answers.
(() => {
  const $ = (id) => document.getElementById(id);
  const PASS_MARK = 0.68;
  let data, test, idx, answers, checked, practice, reviewing = false;

  const CLIENT_ID = document.querySelector('meta[name="google-client-id"]').content;

  // ---- Google sign-in -------------------------------------------------------
  // The page shows nothing until a Google ID token for this client is held.
  // The token is kept for the browser tab only (sessionStorage).
  const claims = (jwt) => {
    try {
      const b = jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      return JSON.parse(decodeURIComponent(escape(atob(b))));
    } catch {
      return null;
    }
  };
  const validToken = (jwt) => {
    const c = jwt && claims(jwt);
    return !!c && c.aud === CLIENT_ID && /accounts\.google\.com$/.test(c.iss) && c.exp * 1000 > Date.now() && c.email_verified;
  };

  function signedIn(jwt) {
    sessionStorage.setItem("exam-id-token", jwt);
    $("exam-signin").hidden = true;
    $("exam-user").hidden = false;
    $("user-email").textContent = claims(jwt).email;
    loadTests();
  }

  function showSignIn(message) {
    sessionStorage.removeItem("exam-id-token");
    ["exam-user", "exam-start", "exam-run", "exam-result"].forEach((v) => ($(v).hidden = true));
    $("exam-signin").hidden = false;
    $("signin-error").hidden = !message;
    $("signin-error").textContent = message || "";
    const render = () => {
      google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: (r) => (validToken(r.credential) ? signedIn(r.credential) : showSignIn("That sign-in could not be used. Try again.")),
      });
      google.accounts.id.renderButton($("google-button"), { theme: "filled_black", size: "large", shape: "pill", text: "signin_with" });
    };
    if (window.google?.accounts?.id) render();
    else window.addEventListener("load", () => (window.google?.accounts?.id ? render() : ($("signin-error").hidden = false, $("signin-error").textContent = "Google sign-in could not load. Check your connection or ad blocker, then refresh.")));
  }

  $("btn-signout").addEventListener("click", (e) => {
    e.preventDefault();
    sessionStorage.removeItem("exam-state");
    window.google?.accounts?.id?.disableAutoSelect();
    showSignIn();
  });

  const token = sessionStorage.getItem("exam-id-token");
  if (validToken(token)) signedIn(token);
  else showSignIn();

  const save = () => sessionStorage.setItem("exam-state", JSON.stringify({ test: test.n, idx, answers, checked, practice }));
  const show = (view) => ["exam-start", "exam-run", "exam-result"].forEach((v) => ($(v).hidden = v !== view));

  function loadTests() {
  if (data) return;
  fetch("tests.json")
    .then((r) => r.json())
    .then((d) => {
      data = d;
      $("test-list").innerHTML = d.tests
        .map((t, n) => `<button class="exam__test" type="button" data-n="${n}"><strong>Test ${n + 1}</strong><span>${t.length} questions</span></button>`)
        .join("");
      $("test-list").addEventListener("click", (e) => {
        const b = e.target.closest("[data-n]");
        if (b) start(Number(b.dataset.n));
      });
      const saved = JSON.parse(sessionStorage.getItem("exam-state") || "null");
      if (saved && d.tests[saved.test]) resume(saved);
    })
    .catch(() => {
      $("test-list").innerHTML = "<p>The questions could not be loaded. Refresh the page to try again.</p>";
    });
  $("exam-start").hidden = false;
  }

  function start(n) {
    test = { n, qs: data.tests[n] };
    idx = 0;
    answers = test.qs.map(() => []);
    checked = test.qs.map(() => false);
    practice = $("practice-mode").checked;
    reviewing = false;
    save();
    show("exam-run");
    render();
  }

  function resume(s) {
    test = { n: s.test, qs: data.tests[s.test] };
    ({ idx, answers, checked, practice } = s);
    show("exam-run");
    render();
  }

  const isRight = (i) => {
    const want = test.qs[i].correct, got = answers[i];
    return got.length === want.length && want.every((c) => got.includes(c));
  };

  function render() {
    const q = test.qs[idx];
    const done = checked[idx] || reviewing;
    $("progress-text").textContent = `Test ${test.n + 1} · Question ${idx + 1} of ${test.qs.length}`;
    const marked = checked.filter(Boolean).length;
    $("score-text").textContent = practice && marked ? `${checked.filter((c, i) => c && isRight(i)).length} / ${marked} correct` : "";
    $("progress-fill").style.width = `${((idx + 1) / test.qs.length) * 100}%`;
    $("q-domain").textContent = q.domain;
    $("q-text").innerHTML = q.q;
    $("q-hint").textContent = q.multi ? `Choose ${q.correct.length}.` : "Choose one.";
    const type = q.multi ? "checkbox" : "radio";
    $("q-options").innerHTML = q.options
      .map((o, i) => {
        let cls = "";
        if (done) cls = q.correct.includes(i) ? "is-correct" : answers[idx].includes(i) ? "is-wrong" : "";
        return `<li class="exam__option ${cls}"><label><input type="${type}" name="opt" value="${i}" ${answers[idx].includes(i) ? "checked" : ""} ${done ? "disabled" : ""}><span class="exam__letter">${String.fromCharCode(65 + i)}</span><span class="exam__opt">${o.html}</span></label>${done ? `<p class="exam__why">${o.why}</p>` : ""}</li>`;
      })
      .join("");
    $("q-feedback").hidden = !done;
    if (done) {
      const ok = isRight(idx);
      $("q-feedback").className = `exam__feedback ${ok ? "is-correct" : "is-wrong"}`;
      $("q-feedback").innerHTML = `<p class="exam__verdict">${ok ? "Correct" : answers[idx].length ? "Not quite" : "Not answered"}</p>${q.explain}`;
    }
    $("btn-prev").disabled = idx === 0;
    $("btn-check").hidden = !practice || done;
    $("btn-next").textContent = idx === test.qs.length - 1 ? (reviewing ? "Back to results" : "Finish test") : "Next";
    window.scrollTo({ top: $("exam").offsetTop - 70, behavior: "smooth" });
  }

  $("q-options").addEventListener("change", () => {
    answers[idx] = [...document.querySelectorAll('#q-options input:checked')].map((i) => Number(i.value));
    save();
  });
  $("btn-check").addEventListener("click", () => {
    checked[idx] = true;
    save();
    render();
  });
  $("btn-prev").addEventListener("click", () => {
    idx--;
    save();
    render();
  });
  $("btn-next").addEventListener("click", () => {
    if (practice && !checked[idx] && !reviewing) checked[idx] = true;
    if (idx < test.qs.length - 1) {
      idx++;
      save();
      render();
    } else finish();
  });
  $("btn-quit").addEventListener("click", () => sessionStorage.removeItem("exam-state"));

  function finish() {
    const right = test.qs.filter((_, i) => isRight(i)).length;
    const pct = right / test.qs.length;
    $("result-title").textContent = `Test ${test.n + 1} complete`;
    $("result-score").textContent = `${right} / ${test.qs.length} (${Math.round(pct * 100)}%)`;
    $("result-note").textContent =
      pct >= PASS_MARK
        ? "Above the 68% mark we use as the passing guide. Try another test, or review your answers."
        : "Below the 68% mark we use as the passing guide. Review your answers, then try again.";
    sessionStorage.removeItem("exam-state");
    show("exam-result");
  }

  $("btn-review").addEventListener("click", () => {
    reviewing = true;
    idx = 0;
    show("exam-run");
    render();
  });
})();
