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

  /* ---------- Mobile course cards, two designs, chosen by <html data-cards="..."> (or ?cards=... to preview):
       bento (in use): a bento box of tiles; the tapped one opens full width on top
       tiles: one card open, the rest folded; they open in turn until the visitor taps ---------- */
  const grid = $(".course-grid");
  if (grid) {
    const cards = $$(":scope > .course", grid);
    const mq = matchMedia("(max-width: 719px)");
    const calm = matchMedia("(prefers-reduced-motion: reduce)").matches || params.has("render");
    const bento = (params.get("cards") || root.dataset.cards) === "bento";   // ?cards=tiles previews the other design
    const modeClass = bento ? "is-bento" : "is-tiles";
    const AUTO_MS = bento ? 2200 : 6000;
    let cur = bento ? -1 : 0, hint = -1, on = false, timer = null, inView = false, touched = false;
    grid.style.setProperty("--tile-ms", AUTO_MS + "ms");

    const apply = (i) => {
      cur = i;
      const closed = cards.filter((c, k) => k !== i);
      const sizes = i < 0 ? ["big", "half", "half", "wide"] : ["wide", "half", "half"]; // bento layout for the folded tiles
      cards.forEach((c, k) => {
        const isOpen = k === i;
        c.classList.toggle("is-open", isOpen);
        $(".tile-head", c).setAttribute("aria-expanded", isOpen);
        $(".tile-inner", c).inert = on && !isOpen;
        if (bento && on) c.dataset.size = isOpen ? "open" : sizes[closed.indexOf(c)] || "half";
      });
    };
    const open = (i, byUser) => {
      if (bento && on && byUser && document.startViewTransition && !calm) {
        cards.forEach((c, k) => { c.style.viewTransitionName = "course-" + k; });
        document.startViewTransition(() => apply(i)).finished.finally(() => cards.forEach((c) => { c.style.viewTransitionName = ""; }));
      } else apply(i);
      if (byUser) setTimeout(() => {                          // keep the opened card in view
        const el = bento ? grid : cards[i];
        const top = el.getBoundingClientRect().top;
        if (top < 0 || top > innerHeight * .6) scrollTo({ top: scrollY + top - 90, behavior: "smooth" });
      }, bento ? 480 : 520);
    };
    const setHint = (k) => { hint = k; cards.forEach((c, j) => c.classList.toggle("is-hint", j === k)); };
    const stop = () => { clearInterval(timer); timer = null; grid.classList.remove("is-auto"); setHint(-1); };
    const play = () => {
      stop();
      if (!on || calm || touched || !inView || document.hidden || !vModal.hidden) return;
      grid.classList.add("is-auto");
      if (bento) {                                            // bento: a gold glow walks across the tiles
        setHint(0);
        timer = setInterval(() => setHint((hint + 1) % cards.length), AUTO_MS);
        return;
      }
      open(cur, false);                                       // tiles: restarts the gold timer bar
      timer = setInterval(() => open((cur + 1) % cards.length, false), AUTO_MS);
    };
    const stopForGood = () => { touched = true; stop(); };

    // A compact head for each card, and a wrapper round the video + body so the card can fold open
    cards.forEach((c, i) => {
      const [t1, t2] = $$(".course__tags .tag", c).map((t) => t.textContent.trim()).filter((t) => !/flagship/i.test(t));
      const tags = t1 + (t2 ? `<i> · ${t2}</i>` : "");
      const nows = $$(".mode__btn", c).map((b) => +b.dataset.now);
      const price = nows.length ? "From " + inr(Math.min(...nows)) : $(".price__now", c).textContent.trim();
      const head = document.createElement("button");
      head.type = "button"; head.className = "tile-head";
      head.innerHTML = `<img class="tile-head__bg" src="${$(".course__video img", c).getAttribute("src")}" alt="" loading="lazy" />
        <span class="tile-head__txt"><small>${tags}</small><b>${$(".course__name", c).textContent}</b><em class="tile-head__price">${price}</em></span>
        <span class="tile-head__ico"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></span>`;
      const panel = document.createElement("div"), inner = document.createElement("div");
      panel.className = "tile-panel"; inner.className = "tile-inner";
      inner.append(...c.children); panel.append(inner); c.append(head, panel);
      head.addEventListener("click", () => { stopForGood(); open(i, true); });
      if (bento) {
        const x = document.createElement("button");
        x.type = "button"; x.className = "tile-close"; x.setAttribute("aria-label", "Close " + $(".course__name", c).textContent);
        x.innerHTML = `<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>`;
        x.addEventListener("click", () => { stopForGood(); open(-1, true); });
        c.append(x);
      }
    });

    grid.addEventListener("pointerdown", stopForGood, { passive: true });
    grid.addEventListener("focusin", stopForGood);
    new IntersectionObserver(([e]) => { inView = e.isIntersecting; play(); }, { threshold: .3 }).observe(grid);
    document.addEventListener("visibilitychange", play);
    new MutationObserver(play).observe(vModal, { attributes: true, attributeFilter: ["hidden"] });

    const setMode = () => {
      on = mq.matches;
      grid.classList.toggle(modeClass, on);
      if (on) { apply(cur); play(); return; }
      stop();
      cards.forEach((c) => { $(".tile-inner", c).inert = false; delete c.dataset.size; });
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
