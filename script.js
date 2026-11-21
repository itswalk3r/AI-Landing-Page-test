(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const root = document.documentElement;
  const inr = (n) => "₹" + Number(n).toLocaleString("en-IN");
  const params = new URLSearchParams(location.search);

  /* ---------- Render mode (used only to make mockup images) ---------- */
  if (params.has("render")) { root.classList.add("is-render"); document.body.style.background = "#FF00FF"; }

  /* ---------- Nav ---------- */
  const nav = $("#nav"), burger = $("#burger"), links = $("#navLinks");
  const onScroll = () => nav.classList.toggle("is-scrolled", scrollY > 10);
  addEventListener("scroll", onScroll, { passive: true }); onScroll();
  burger.addEventListener("click", () => {
    const open = links.classList.toggle("is-open");
    burger.setAttribute("aria-expanded", open);
  });
  $$("a", links).forEach((a) => a.addEventListener("click", () => { links.classList.remove("is-open"); burger.setAttribute("aria-expanded", "false"); }));

  /* ---------- Modals ---------- */
  let lastFocus = null;
  const openModal = (m) => { lastFocus = document.activeElement; m.hidden = false; document.body.style.overflow = "hidden"; setTimeout(() => ($("input, button.modal__x", m) || m).focus(), 50); };
  const closeModal = (m) => {
    m.hidden = true; document.body.style.overflow = "";
    const v = $("video", m); if (v) { v.pause(); v.removeAttribute("src"); v.load(); }
    lastFocus && lastFocus.focus();
  };
  $$(".modal").forEach((m) => $$("[data-close]", m).forEach((c) => c.addEventListener("click", () => closeModal(m))));
  addEventListener("keydown", (e) => { if (e.key === "Escape") $$(".modal:not([hidden])").forEach(closeModal); });

  /* ---------- Course video: expand & play ---------- */
  const vModal = $("#videoModal"), vEl = $("#modalVideo"), vFrame = $(".video-frame", vModal);
  $$("[data-video]").forEach((btn) => btn.addEventListener("click", () => {
    const src = btn.dataset.video;
    $("#videoTitle").textContent = btn.dataset.title || "";
    vFrame.classList.toggle("is-ph", !src);
    openModal(vModal);
    if (src) { vEl.src = src; vEl.play().catch(() => {}); }
  }));

  /* ---------- Live / Recorded toggle ---------- */
  $$(".mode").forEach((group) => {
    const card = group.closest(".course");
    $$(".mode__btn", group).forEach((b) => b.addEventListener("click", () => {
      $$(".mode__btn", group).forEach((x) => { x.classList.toggle("is-on", x === b); x.setAttribute("aria-checked", x === b); });
      $("[data-price-now]", card).textContent = inr(b.dataset.now);
      $("[data-price-was]", card).textContent = inr(b.dataset.was);
      Object.assign($(".js-apply", card).dataset, { mode: b.dataset.mode, was: b.dataset.was, now: b.dataset.now });
    }));
  });

  /* ---------- Form helpers ---------- */
  const validate = (form) => {
    let ok = true;
    $$("input[required]", form).forEach((i) => {
      const bad = !i.value.trim() || (i.type === "email" && !/^\S+@\S+\.\S+$/.test(i.value)) || (i.type === "tel" && i.value.replace(/\D/g, "").length < 10);
      i.classList.toggle("is-bad", bad); if (bad && ok) { i.focus(); ok = false; }
    });
    return ok;
  };

  /* ---------- Payment window (generic mock) ---------- */
  const pModal = $("#payModal");
  $$(".js-apply").forEach((b) => b.addEventListener("click", () => {
    const { name, mode, was, now } = b.dataset;
    $("#payName").textContent = name;
    $("#payMode").textContent = mode;
    $("#payWas").textContent = inr(was);
    $("#payDisc").textContent = "– " + inr(was - now);
    $("#payNow").textContent = inr(now);
    $("#payBtn").textContent = "Pay " + inr(now);
    $("#payForm").hidden = false; $("#payDone").hidden = true;
    openModal(pModal);
  }));
  $("#checkout").addEventListener("submit", (e) => {
    e.preventDefault(); if (!validate(e.target)) return;
    const btn = $("#payBtn"); btn.textContent = "Processing…"; btn.disabled = true;
    setTimeout(() => { btn.disabled = false; $("#payForm").hidden = true; $("#payDone").hidden = false; e.target.reset(); }, 900);
  });

  /* ---------- Consultation / demo booking ---------- */
  const lModal = $("#leadModal");
  const leadCopy = {
    call: { t: "Book a consultation call", e: "Free 15-minute call", b: "Book my call" },
    demo: { t: "Book a free demo session", e: "Try a live class", b: "Book my demo" },
  };
  $$(".js-lead").forEach((b) => b.addEventListener("click", () => {
    const c = leadCopy[b.dataset.lead];
    $("#leadTitle").textContent = c.t; $("#leadEyebrow").textContent = c.e; $("#leadBtn").textContent = c.b;
    $("#leadFormWrap").hidden = false; $("#leadDone").hidden = true;
    openModal(lModal);
  }));
  $("#leadForm").addEventListener("submit", (e) => {
    e.preventDefault(); if (!validate(e.target)) return;
    $("#leadFormWrap").hidden = true; $("#leadDone").hidden = false; e.target.reset();
  });

  /* ---------- Countdown ---------- */
  const clock = $("#clock"), deadline = new Date(clock.dataset.deadline).getTime();
  const pad = (n) => String(n).padStart(2, "0");
  const tick = () => {
    const ms = Math.max(0, deadline - Date.now());
    const s = Math.floor(ms / 1000);
    $('[data-u="d"]', clock).textContent = pad(Math.floor(s / 86400));
    $('[data-u="h"]', clock).textContent = pad(Math.floor(s / 3600) % 24);
    $('[data-u="m"]', clock).textContent = pad(Math.floor(s / 60) % 60);
    $('[data-u="s"]', clock).textContent = pad(s % 60);
  };
  tick(); setInterval(tick, 1000);

  /* ---------- Tools marquee: duplicate for a seamless loop ---------- */
  $$(".marquee__track").forEach((t) => {
    $$(":scope > *", t).forEach((n) => { const c = n.cloneNode(true); c.setAttribute("aria-hidden", "true"); t.appendChild(c); });
  });

  /* ---------- Testimonials slider ---------- */
  const track = $("#storiesTrack"), dotsEl = $("#storiesDots");
  const cards = $$(".story", track);
  const step = () => cards[1].offsetLeft - cards[0].offsetLeft;
  const pages = () => Math.max(1, Math.round((track.scrollWidth - track.clientWidth) / step()) + 1);
  const renderDots = () => {
    dotsEl.innerHTML = "";
    for (let i = 0; i < pages(); i++) dotsEl.appendChild(document.createElement("i"));
    syncDots();
  };
  const syncDots = () => {
    const i = Math.round(track.scrollLeft / step());
    $$("i", dotsEl).forEach((d, k) => d.classList.toggle("is-on", k === i));
  };
  const go = (dir) => {
    const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
    if (dir > 0 && atEnd) track.scrollTo({ left: 0 });
    else track.scrollBy({ left: dir * step() });
  };
  $$("[data-slide]").forEach((b) => b.addEventListener("click", () => go(+b.dataset.slide)));
  track.addEventListener("scroll", () => requestAnimationFrame(syncDots), { passive: true });
  addEventListener("resize", renderDots);
  renderDots();
  let auto = params.has("render") ? null : setInterval(() => go(1), 3500);
  const pause = () => clearInterval(auto);
  const resume = () => { clearInterval(auto); auto = setInterval(() => go(1), 3500); };
  ["mouseenter", "touchstart", "focusin"].forEach((ev) => track.addEventListener(ev, pause, { passive: true }));
  ["mouseleave", "touchend", "focusout"].forEach((ev) => track.addEventListener(ev, resume, { passive: true }));
})();
