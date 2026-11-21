(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const root = document.documentElement;
  const inr = (n) => "₹" + Number(n).toLocaleString("en-IN");
  const params = new URLSearchParams(location.search);

  /* WhatsApp links (number 917907922828) and their messages are written in index.html */

  /* ---------- Render mode (used only to make mockup images) ---------- */
  if (params.has("render")) { root.classList.add("is-render"); document.body.style.background = "#FF00FF"; }

  /* ---------- Course video: expand & play ---------- */
  const vModal = $("#videoModal"), vEl = $("#modalVideo"), vFrame = $(".video-frame", vModal);
  let lastFocus = null;
  const openModal = () => { lastFocus = document.activeElement; vModal.hidden = false; document.body.style.overflow = "hidden"; setTimeout(() => $(".modal__x", vModal).focus(), 50); };
  const closeModal = () => {
    vModal.hidden = true; document.body.style.overflow = "";
    vEl.pause(); vEl.removeAttribute("src"); vEl.load();
    lastFocus && lastFocus.focus();
  };
  $$("[data-close]", vModal).forEach((c) => c.addEventListener("click", closeModal));
  addEventListener("keydown", (e) => { if (e.key === "Escape" && !vModal.hidden) closeModal(); });
  $$("[data-video]").forEach((btn) => btn.addEventListener("click", () => {
    const src = btn.dataset.video;
    $("#videoTitle").textContent = btn.dataset.title || "";
    vFrame.classList.toggle("is-ph", !src);
    openModal();
    if (src) { vEl.src = src; vEl.play().catch(() => {}); }
  }));

  /* ---------- Live / Recorded toggle: price and discount ---------- */
  $$(".mode").forEach((group) => {
    const card = group.closest(".course");
    $$(".mode__btn", group).forEach((b) => b.addEventListener("click", () => {
      $$(".mode__btn", group).forEach((x) => { x.classList.toggle("is-on", x === b); x.setAttribute("aria-checked", x === b); });
      const { mode, was, now } = b.dataset;
      $("[data-price-now]", card).textContent = inr(now);
      $("[data-price-was]", card).textContent = inr(was);
      const off = $("[data-price-off]", card);
      if (off) off.textContent = Math.floor((was - now) / was * 100) + "% off · First 25 seats only";
      const apply = $(".js-apply", card);
      Object.assign(apply.dataset, { mode, was, now });
    }));
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

  /* ---------- Mobile: course cards as a cascading deck (swipe, or it turns by itself) ---------- */
  const grid = $(".course-grid");
  if (grid) {
    const cards = $$(":scope > .course", grid), n = cards.length;
    const mq = matchMedia("(max-width: 719px)");
    const calm = matchMedia("(prefers-reduced-motion: reduce)").matches || params.has("render");
    const AUTO_MS = 5000, IDLE_MS = 9000;
    let cur = 0, on = false, timer = null, idle = null, inView = true;

    const dots = document.createElement("div");
    dots.className = "deck-dots";
    dots.innerHTML = cards.map((c, i) => `<button type="button" aria-label="Show ${$(".course__name", c).textContent}"></button>`).join("");
    grid.after(dots);

    const fit = () => {
      if (!on) return;
      const h = cards[cur].offsetHeight;
      grid.style.height = h + "px";
      grid.style.setProperty("--deck-h", h + "px");
    };
    const ro = new ResizeObserver(fit);
    const layout = () => {
      cards.forEach((c, i) => {
        const p = (i - cur + n) % n;
        c.dataset.pos = p;
        c.classList.toggle("is-front", p === 0);
        c.inert = p !== 0;
      });
      $$("button", dots).forEach((d, i) => { d.classList.toggle("is-on", i === cur); d.setAttribute("aria-current", i === cur); });
      ro.disconnect(); ro.observe(cards[cur]); fit();
    };
    const go = (dir) => {
      if (dir > 0) {
        const old = cards[cur];
        cur = (cur + 1) % n; layout();
        old.dataset.pos = "-1";                                  // the front card flies off to the left...
        setTimeout(() => { if (on && old.dataset.pos === "-1") old.dataset.pos = (cards.indexOf(old) - cur + n) % n; }, 600); // ...then goes to the back
      } else {
        cur = (cur - 1 + n) % n;
        const inc = cards[cur];
        inc.classList.add("is-dragging"); inc.dataset.pos = "-1"; void inc.offsetWidth; // come back in from the left
        inc.classList.remove("is-dragging"); layout();
      }
    };

    const stop = () => { clearInterval(timer); timer = null; };
    const play = () => {
      stop();
      if (on && !calm && inView && !document.hidden && vModal.hidden) timer = setInterval(() => go(1), AUTO_MS);
    };
    const nudge = () => { stop(); clearTimeout(idle); idle = setTimeout(play, IDLE_MS); }; // user touched it: wait, then carry on
    new IntersectionObserver(([e]) => { inView = e.isIntersecting; inView ? play() : stop(); }, { threshold: .35 }).observe(grid);
    document.addEventListener("visibilitychange", play);
    new MutationObserver(() => (vModal.hidden ? nudge() : stop())).observe(vModal, { attributes: true, attributeFilter: ["hidden"] });

    dots.addEventListener("click", (e) => {
      const i = $$("button", dots).indexOf(e.target.closest("button"));
      if (i < 0 || i === cur) return;
      cur = i; layout(); nudge();
    });

    /* swipe */
    let sx = 0, sy = 0, dx = 0, drag = false, down = false, moved = false;
    grid.addEventListener("pointerdown", (e) => {
      if (!on || !e.isPrimary || (e.pointerType === "mouse" && e.button !== 0)) return;
      down = true; drag = false; moved = false; sx = e.clientX; sy = e.clientY; dx = 0; nudge();
    });
    grid.addEventListener("pointermove", (e) => {
      if (!down) return;
      dx = e.clientX - sx;
      const dy = e.clientY - sy;
      if (!drag) {
        if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) return;
        drag = moved = true; cards[cur].classList.add("is-dragging");
        try { grid.setPointerCapture(e.pointerId); } catch {}
      }
      cards[cur].style.transform = `translateX(${dx}px) rotate(${dx / 30}deg)`;
    });
    const end = () => {
      if (!down) return;
      down = false;
      if (!drag) return;
      drag = false;
      const f = cards[cur];
      f.classList.remove("is-dragging"); f.style.transform = "";
      if (dx < -50) go(1); else if (dx > 50) go(-1);
    };
    grid.addEventListener("pointerup", end);
    grid.addEventListener("pointercancel", end);
    grid.addEventListener("click", (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
    grid.addEventListener("focusin", stop);

    const setMode = () => {
      on = mq.matches;
      grid.classList.toggle("is-deck", on);
      if (on) { layout(); play(); return; }
      stop(); ro.disconnect();
      grid.style.height = ""; grid.style.removeProperty("--deck-h");
      cards.forEach((c) => { delete c.dataset.pos; c.classList.remove("is-front", "is-dragging"); c.inert = false; c.style.transform = ""; });
    };
    mq.addEventListener("change", setMode);
    setMode();
  }

  /* ---------- Testimonials slider (runs only when that section is shown) ---------- */
  const track = $("#storiesTrack"), dotsEl = $("#storiesDots");
  if (track && dotsEl) {
    const cards = $$(".story", track);
    const step = () => cards[1].offsetLeft - cards[0].offsetLeft;
    const pages = () => Math.max(1, Math.round((track.scrollWidth - track.clientWidth) / step()) + 1);
    const syncDots = () => {
      const i = Math.round(track.scrollLeft / step());
      $$("i", dotsEl).forEach((d, k) => d.classList.toggle("is-on", k === i));
    };
    const renderDots = () => {
      dotsEl.innerHTML = "";
      for (let i = 0; i < pages(); i++) dotsEl.appendChild(document.createElement("i"));
      syncDots();
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
  }
})();
