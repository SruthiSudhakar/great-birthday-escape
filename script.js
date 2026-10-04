/* The Great Birthday Escape — game engine.
   Content lives in data.js; you shouldn't need to edit this file. */
(function () {
  "use strict";

  const D = window.BIRTHDAY_DATA;
  const STORE_KEY = "great-birthday-escape-v1";
  const ROOMS = D.rooms;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const $ = (sel, root = document) => root.querySelector(sel);
  const stage = $("#stage");
  const hud = $("#hud");
  const modal = $("#modal");
  const modalInner = $("#modal-inner");

  /* ------------------------------------------------------------------
     State (persisted to localStorage so a refresh doesn't lose progress)
     ------------------------------------------------------------------ */
  function freshState() {
    return {
      screen: "intro",       // intro | room | vault | escaped | ending
      room: 0,               // room currently being viewed
      solved: {},            // objectId -> "correct" | "revealed"
      keys: 0,               // number of rooms completed (keys earned)
      attempts: {},          // objectId -> wrong attempts
      stats: { wrong: 0, hints: 0 },
      sound: true
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return null;
      return Object.assign(freshState(), JSON.parse(raw));
    } catch (e) { return null; }
  }

  let state = loadState() || freshState();

  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* private mode — fine */ }
  }

  function hasProgress() {
    return Object.keys(state.solved).length > 0 || state.keys > 0;
  }

  /* ------------------------------------------------------------------
     Text helpers
     ------------------------------------------------------------------ */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // Escape, fill {tokens}, allow **bold** and line breaks.
  function t(s, extra) {
    if (s == null) return "";
    const vars = Object.assign({ name: D.name, age: D.age }, extra || {});
    let out = esc(s).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? esc(vars[k]) : m));
    out = out.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br>");
    return out;
  }

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* ------------------------------------------------------------------
     Sound — tiny synthesised effects, no audio files required
     ------------------------------------------------------------------ */
  let audioCtx = null;
  function ctx() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audioCtx = new AC();
    }
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }

  function tone(freq, dur, opts = {}) {
    if (!state.sound) return;
    const c = ctx(); if (!c) return;
    const t0 = c.currentTime + (opts.delay || 0);
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = opts.type || "sine";
    osc.frequency.setValueAtTime(freq, t0);
    if (opts.slide) osc.frequency.exponentialRampToValueAtTime(opts.slide, t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(opts.vol || 0.08, t0 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noise(dur, vol = 0.05, delay = 0) {
    if (!state.sound) return;
    const c = ctx(); if (!c) return;
    const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = c.createBufferSource();
    const gain = c.createGain();
    const filter = c.createBiquadFilter();
    filter.type = "bandpass"; filter.frequency.value = 1800;
    gain.gain.value = vol;
    src.buffer = buf;
    src.connect(filter).connect(gain).connect(c.destination);
    src.start(c.currentTime + delay);
  }

  const sfx = {
    click() { tone(660, 0.06, { type: "triangle", vol: 0.05 }); },
    open() { noise(0.18, 0.04); tone(420, 0.12, { type: "triangle", vol: 0.04, slide: 640 }); },
    wrong() { tone(220, 0.18, { type: "square", vol: 0.035 }); tone(165, 0.25, { type: "square", vol: 0.035, delay: 0.12 }); },
    right() { [523, 659, 784].forEach((f, i) => tone(f, 0.22, { type: "triangle", vol: 0.06, delay: i * 0.08 })); },
    key() { [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.35, { vol: 0.05, delay: i * 0.1 })); },
    tick() { tone(1400, 0.03, { type: "square", vol: 0.025 }); },
    lock() { noise(0.12, 0.08); tone(120, 0.2, { type: "square", vol: 0.05 }); },
    vault() {
      noise(0.6, 0.06);
      tone(90, 0.9, { type: "sawtooth", vol: 0.04, slide: 60 });
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.6, { type: "triangle", vol: 0.06, delay: 0.7 + i * 0.12 }));
    },
    page() { noise(0.25, 0.03); }
  };

  let music = null;
  function playEndingMusic() {
    if (!D.ending.music || !state.sound) return;
    try {
      music = music || new Audio(D.ending.music);
      music.volume = 0.35;
      music.loop = true;
      music.play().catch(() => {});
    } catch (e) { /* ignore */ }
  }

  function updateSoundButton() {
    const btn = $("#sound-toggle");
    btn.setAttribute("aria-pressed", String(state.sound));
    btn.setAttribute("aria-label", state.sound ? "Sound on — click to mute" : "Sound off — click to unmute");
    btn.innerHTML = `<span aria-hidden="true">${state.sound ? "🔊" : "🔇"}</span>`;
  }

  $("#sound-toggle").addEventListener("click", () => {
    state.sound = !state.sound;
    save();
    updateSoundButton();
    if (!state.sound && music) music.pause();
    if (state.sound) { sfx.click(); if (state.screen === "ending" && music) music.play().catch(() => {}); }
    // keep the intro-screen toggle in sync
    const introBtn = $("#intro-sound");
    if (introBtn) introBtn.textContent = state.sound ? "🔊 Sound on" : "🔇 Sound off";
  });

  /* ------------------------------------------------------------------
     Icons — hand-drawn style inline SVGs for room objects
     ------------------------------------------------------------------ */
  const INK = "#2a1c12";
  const S = `stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;

  const ICONS = {
    frame: () => `
      <path d="M36 12 L50 3 L64 12" fill="none" ${S}/>
      <rect x="14" y="12" width="72" height="80" rx="3" fill="#9a6a3c" ${S}/>
      <rect x="24" y="22" width="52" height="60" fill="#f3e2c2" ${S}/>
      <circle cx="50" cy="44" r="10" fill="#c98b5a"/>
      <path d="M30 81 Q50 54 70 81 Z" fill="#c98b5a"/>`,
    tv: () => `
      <path d="M42 22 L28 5 M58 22 L72 5" fill="none" ${S}/>
      <rect x="8" y="22" width="84" height="62" rx="9" fill="#b07a45" ${S}/>
      <rect x="16" y="30" width="54" height="46" rx="10" fill="#6fa3a8" ${S}/>
      <path d="M22 40 Q26 34 34 34" fill="none" stroke="#e8f4f2" stroke-width="3" stroke-linecap="round"/>
      <circle cx="81" cy="40" r="5" fill="${INK}"/><circle cx="81" cy="56" r="5" fill="${INK}"/>
      <path d="M76 68 H86 M76 73 H86" ${S}/>
      <path d="M24 84 L19 95 M76 84 L81 95" ${S}/>`,
    toybox: () => `
      <rect x="22" y="20" width="22" height="22" rx="2" fill="#f2c14e" ${S}/>
      <text x="33" y="37" font-family="Georgia,serif" font-weight="700" font-size="16" text-anchor="middle" fill="${INK}">A</text>
      <circle cx="64" cy="32" r="15" fill="#e05a4a" ${S}/>
      <path d="M50 30 Q64 38 78 30" fill="none" stroke="#fff2d6" stroke-width="3"/>
      <rect x="6" y="40" width="88" height="13" rx="4" fill="#3c6e6f" ${S}/>
      <rect x="10" y="53" width="80" height="38" rx="4" fill="#4f8a8b" ${S}/>
      <rect x="44" y="49" width="12" height="12" rx="2" fill="#e8c77a" ${S}/>`,
    desk: () => `
      <path d="M68 30 L62 12 L80 12 Z" fill="#f2c14e" ${S}/><path d="M71 12 V30" ${S}/>
      <rect x="6" y="30" width="88" height="10" rx="2" fill="#7b4d2a" ${S}/>
      <rect x="12" y="40" width="76" height="54" fill="#a8723f" ${S}/>
      <path d="M26 46 L30 40 L52 42 L50 48 Z" fill="#fbf5e6" ${S}/>
      <rect x="18" y="47" width="64" height="18" rx="2" fill="#c08850" ${S}/>
      <rect x="18" y="70" width="64" height="18" rx="2" fill="#c08850" ${S}/>
      <circle cx="50" cy="56" r="3" fill="${INK}"/><circle cx="50" cy="79" r="3" fill="${INK}"/>`,
    yearbook: () => `
      <rect x="18" y="8" width="64" height="84" rx="4" fill="#7b2d3b" ${S}/>
      <rect x="18" y="8" width="11" height="84" fill="#5a1f2a" ${S}/>
      <rect x="37" y="28" width="36" height="26" fill="#e8c77a" ${S}/>
      <text x="55" y="47" font-family="Georgia,serif" font-weight="700" font-size="14" text-anchor="middle" fill="${INK}">’99</text>
      <path d="M64 92 V99 L69 95 L74 99 V92" fill="#e05a4a" ${S}/>`,
    walkman: () => `
      <path d="M22 40 Q22 6 50 6 Q78 6 78 40" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
      <rect x="13" y="32" width="12" height="20" rx="4" fill="#333" ${S}/>
      <rect x="75" y="32" width="12" height="20" rx="4" fill="#333" ${S}/>
      <rect x="24" y="40" width="52" height="56" rx="6" fill="#d8462f" ${S}/>
      <rect x="31" y="48" width="38" height="22" rx="3" fill="#2b2b2b" ${S}/>
      <circle cx="42" cy="59" r="5" fill="#ddd"/><circle cx="58" cy="59" r="5" fill="#ddd"/>
      <rect x="31" y="78" width="9" height="8" rx="1" fill="#f0e2c8" ${S}/>
      <rect x="45" y="78" width="9" height="8" rx="1" fill="#f0e2c8" ${S}/>
      <rect x="59" y="78" width="9" height="8" rx="1" fill="#f0e2c8" ${S}/>`,
    report: () => `
      <rect x="18" y="8" width="64" height="86" rx="2" fill="#fbf5e6" ${S}/>
      <path d="M28 22 H72 M28 34 H60 M28 44 H64 M28 54 H56" stroke="#9aa8b8" stroke-width="3" stroke-linecap="round"/>
      <text x="62" y="84" font-family="Georgia,serif" font-weight="800" font-size="24" text-anchor="middle" fill="#c0392b" transform="rotate(-12 62 78)">A+</text>
      <path d="M30 2 V20 Q30 26 36 26 Q42 26 42 20 V6" fill="none" stroke="#7d8790" stroke-width="3"/>`,
    calendar: () => `
      <rect x="14" y="16" width="72" height="76" rx="3" fill="#fbf5e6" ${S}/>
      <rect x="14" y="16" width="72" height="20" fill="#c0392b" ${S}/>
      <circle cx="32" cy="16" r="4" fill="${INK}"/><circle cx="68" cy="16" r="4" fill="${INK}"/>
      <g fill="#9aa8b8">
        <rect x="22" y="44" width="10" height="9"/><rect x="38" y="44" width="10" height="9"/><rect x="54" y="44" width="10" height="9"/><rect x="70" y="44" width="8" height="9"/>
        <rect x="22" y="60" width="10" height="9"/><rect x="38" y="60" width="10" height="9"/><rect x="70" y="60" width="8" height="9"/>
        <rect x="22" y="76" width="10" height="9"/><rect x="38" y="76" width="10" height="9"/><rect x="54" y="76" width="10" height="9"/>
      </g>
      <circle cx="59" cy="64" r="9" fill="none" stroke="#c0392b" stroke-width="3"/>`,
    portrait: (color = "#c46b5a") => `
      <path d="M38 8 L50 1 L62 8" fill="none" ${S}/>
      <ellipse cx="50" cy="52" rx="36" ry="44" fill="#c99a4a" ${S}/>
      <ellipse cx="50" cy="52" rx="27" ry="35" fill="#f3e2c2" ${S}/>
      <circle cx="50" cy="44" r="11" fill="${color}"/>
      <path d="M30 80 Q50 50 70 80 Q60 87 50 87 Q40 87 30 80 Z" fill="${color}"/>`,
    phone: () => `
      <rect x="28" y="10" width="44" height="84" rx="8" fill="#2b2b2b" ${S}/>
      <rect x="32" y="18" width="36" height="66" rx="2" fill="#e9f6ef"/>
      <rect x="35" y="24" width="22" height="8" rx="3" fill="#ffffff" stroke="#b9c9c0" stroke-width="1.5"/>
      <rect x="43" y="36" width="22" height="8" rx="3" fill="#bfe8c8"/>
      <rect x="35" y="48" width="26" height="8" rx="3" fill="#ffffff" stroke="#b9c9c0" stroke-width="1.5"/>
      <rect x="45" y="60" width="20" height="8" rx="3" fill="#bfe8c8"/>
      <circle cx="73" cy="13" r="12" fill="#e53935" ${S}/>
      <text x="73" y="18" font-family="DM Sans,Arial,sans-serif" font-weight="700" font-size="12" text-anchor="middle" fill="#fff">37</text>`,
    album: () => `
      <rect x="6" y="30" width="88" height="58" rx="4" fill="#6b4226" ${S}/>
      <path d="M10 26 H49 V82 H10 Z" fill="#f7ecd6" ${S}/>
      <path d="M51 26 H90 V82 H51 Z" fill="#f7ecd6" ${S}/>
      <rect x="16" y="33" width="27" height="20" fill="#c98b5a" stroke="${INK}" stroke-width="2"/>
      <rect x="16" y="58" width="27" height="18" fill="#8fa98a" stroke="${INK}" stroke-width="2"/>
      <rect x="57" y="36" width="27" height="34" fill="#c4826b" stroke="${INK}" stroke-width="2"/>`,
    folder: () => `
      <path d="M8 26 H38 L44 18 H92 V88 H8 Z" fill="#c99232" ${S}/>
      <rect x="8" y="32" width="84" height="58" rx="2" fill="#e8b85a" ${S}/>
      <g transform="rotate(-10 50 62)">
        <rect x="20" y="52" width="60" height="18" fill="none" stroke="#c0392b" stroke-width="3"/>
        <text x="50" y="66" font-family="Special Elite,Courier New,monospace" font-size="8.5" font-weight="700" text-anchor="middle" fill="#c0392b" textLength="52" lengthAdjust="spacingAndGlyphs">CLASSIFIED</text>
      </g>`,
    redacted: () => `
      <rect x="16" y="6" width="68" height="88" rx="2" fill="#fbf8f0" ${S}/>
      <path d="M26 18 H60" stroke="#9aa8b8" stroke-width="3" stroke-linecap="round"/>
      <rect x="26" y="28" width="48" height="7" fill="${INK}"/>
      <path d="M26 44 H42" stroke="#9aa8b8" stroke-width="3" stroke-linecap="round"/>
      <rect x="46" y="41" width="28" height="7" fill="${INK}"/>
      <rect x="26" y="56" width="36" height="7" fill="${INK}"/>
      <path d="M26 72 H74" stroke="#9aa8b8" stroke-width="3" stroke-linecap="round"/>
      <rect x="26" y="80" width="22" height="7" fill="${INK}"/>`,
    polaroid: () => `
      <g transform="rotate(-7 50 50)">
        <rect x="18" y="12" width="64" height="78" rx="2" fill="#fbf8f0" ${S}/>
        <rect x="25" y="19" width="50" height="50" fill="#3d3a36" ${S}/>
        <text x="50" y="54" font-family="Fraunces,Georgia,serif" font-weight="800" font-size="28" text-anchor="middle" fill="#fbf8f0">?</text>
      </g>`,
    board: () => `
      <rect x="6" y="12" width="88" height="76" rx="3" fill="#c49a6c" stroke="#5c3b1e" stroke-width="5"/>
      <rect x="14" y="22" width="20" height="20" fill="#f6e27a" transform="rotate(-6 24 32)"/>
      <rect x="62" y="20" width="22" height="26" fill="#fbf8f0" transform="rotate(5 73 33)"/>
      <rect x="38" y="56" width="22" height="22" fill="#f6e27a" transform="rotate(4 49 67)"/>
      <rect x="14" y="58" width="16" height="20" fill="#fbf8f0" transform="rotate(-4 22 68)"/>
      <path d="M24 26 L72 24 L49 60 L22 62 Z" fill="none" stroke="#c0392b" stroke-width="2"/>
      <circle cx="24" cy="26" r="3.5" fill="#c0392b"/><circle cx="72" cy="24" r="3.5" fill="#c0392b"/>
      <circle cx="49" cy="60" r="3.5" fill="#c0392b"/><circle cx="22" cy="62" r="3.5" fill="#c0392b"/>`
  };

  function iconSvg(name, color) {
    const draw = ICONS[name] || ICONS.frame;
    return `<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">${draw(color)}</svg>`;
  }

  const KEY_SVG = `<svg viewBox="0 0 120 50" aria-hidden="true" focusable="false">
    <circle cx="24" cy="25" r="17" fill="#e2b04a" stroke="${INK}" stroke-width="3"/>
    <circle cx="24" cy="25" r="7" fill="#f8ecd0" stroke="${INK}" stroke-width="3"/>
    <path d="M41 21 H112 V29 H104 V38 H96 V29 H88 V36 H80 V29 H41 Z" fill="#e2b04a" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
  </svg>`;

  /* ------------------------------------------------------------------
     Scene decorations (purely visual)
     ------------------------------------------------------------------ */
  const DECOR = {
    bedroom: `
      <div class="d-wall"></div><div class="d-floor"></div>
      <div class="d-window"><span class="moon"></span><span class="star s1"></span><span class="star s2"></span><span class="star s3"></span></div>
      <div class="d-poster">SPACE<br>CADET</div>
      <div class="d-glowstars">✦ ✧ ✦<br>✧ ✦</div>
      <div class="d-bed"></div>
      <div class="d-rug"></div>
      <div class="d-tvstand"></div>`,
    classroom: `
      <div class="d-wall"></div><div class="d-floor"></div>
      <div class="d-chalkboard"><span>E = mc²</span><span class="c2">Class of [YEAR]</span><span class="c3">homework due Monday!!</span></div>
      <div class="d-pennant">GO TEAM</div>
      <div class="d-clock"></div>
      <div class="d-schooldesk"></div>`,
    living: `
      <div class="d-wall"></div><div class="d-floor"></div>
      <div class="d-window"><span class="moon"></span></div>
      <div class="d-frames"><span></span><span></span><span></span></div>
      <div class="d-sofa"></div>
      <div class="d-table"></div>
      <div class="d-lamp"></div>
      <div class="d-plant"></div>`,
    archives: `
      <div class="d-wall"></div><div class="d-floor"></div>
      <div class="d-bulb"><span></span></div>
      <div class="d-shelves"><span>1984–1992</span><span>1993–2001</span><span>2002–20XX</span></div>
      <div class="d-stamp">CONFIDENTIAL</div>
      <div class="d-tape">ACCESS RESTRICTED · ACCESS RESTRICTED · ACCESS RESTRICTED</div>
      <div class="d-cabinet"></div>`
  };

  /* ------------------------------------------------------------------
     Helpers about progress
     ------------------------------------------------------------------ */
  function roomSolvedCount(i) {
    return ROOMS[i].objects.filter(o => state.solved[o.id]).length;
  }
  function roomComplete(i) {
    return roomSolvedCount(i) === ROOMS[i].objects.length;
  }
  function canEnterRoom(i) { return i >= 0 && i < ROOMS.length && i <= state.keys; }
  function vaultUnlocked() { return state.keys >= ROOMS.length; }

  function totalSolved() { return Object.keys(state.solved).length; }

  /* ------------------------------------------------------------------
     HUD
     ------------------------------------------------------------------ */
  function renderHud() {
    const showHud = state.screen !== "intro" && state.screen !== "ending";
    hud.hidden = !showHud;
    if (!showHud) return;

    const rooms = ROOMS.map((r, i) => {
      const done = i < state.keys;
      const here = state.screen === "room" && state.room === i;
      const open = canEnterRoom(i);
      const mark = done ? "✓" : here ? "●" : "○";
      const status = done ? "completed" : open ? "in progress" : "locked";
      return `<button class="hud-room ${done ? "done" : ""} ${here ? "here" : ""}" type="button" data-room="${i}"
        ${open ? "" : "disabled"} aria-label="${esc(r.title)} — ${status}" ${here ? 'aria-current="true"' : ""}>
        <span class="mark" aria-hidden="true">${mark}</span><span class="name">${esc(shortName(r))}</span></button>`;
    }).join("");
    const vaultBtn = `<button class="hud-room vault ${state.screen === "vault" ? "here" : ""}" type="button" data-vault
      ${vaultUnlocked() ? "" : "disabled"} aria-label="Birthday vault — ${vaultUnlocked() ? "unlocked" : "locked"}">
      <span class="mark" aria-hidden="true">${vaultUnlocked() ? "🔓" : "🔒"}</span><span class="name">Vault</span></button>`;
    $("#hud-rooms").innerHTML = rooms + vaultBtn;

    $("#hud-keys").innerHTML = `<span class="hud-label">Keys</span>` + D.finalCode.map((d, i) =>
      `<span class="key-slot ${i < state.keys ? "got" : ""}" aria-label="${i < state.keys ? "Key " + (i + 1) + ": " + esc(d) : "Key " + (i + 1) + ": not found"}">${i < state.keys ? esc(d) : "?"}</span>`
    ).join("");
  }

  function shortName(r) {
    return { childhood: "Childhood", school: "School", family: "Family", archives: "Archives" }[r.id] || r.title.replace(/^The /, "");
  }

  $("#hud-rooms").addEventListener("click", e => {
    const b = e.target.closest("button");
    if (!b || b.disabled) return;
    sfx.click();
    if (b.hasAttribute("data-vault")) go("vault");
    else go("room", +b.dataset.room);
  });

  /* ------------------------------------------------------------------
     Screen router with a fade transition
     ------------------------------------------------------------------ */
  function go(screen, room) {
    stage.classList.add("leaving");
    setTimeout(() => {
      state.screen = screen;
      if (room != null) state.room = room;
      save();
      render();
      stage.classList.remove("leaving");
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
      stage.focus({ preventScroll: true });
    }, reduceMotion ? 0 : 280);
  }

  function render() {
    // Guard against a tampered or out-of-date save
    if (state.screen === "room" && !canEnterRoom(state.room)) state.room = Math.min(state.keys, ROOMS.length - 1);
    if (["vault", "escaped", "ending"].includes(state.screen) && !vaultUnlocked()) state.screen = "room";
    document.body.dataset.screen = state.screen;
    renderHud();
    updateSoundButton();
    ({ intro: renderIntro, room: renderRoom, vault: renderVault, escaped: renderEscaped, ending: renderEnding }[state.screen] || renderIntro)();
  }

  /* ------------------------------------------------------------------
     INTRO
     ------------------------------------------------------------------ */
  function renderIntro() {
    const resume = hasProgress();
    stage.innerHTML = `
      <section class="intro">
        <div class="intro-bulb" aria-hidden="true"><span class="cord"></span><span class="glass"></span><span class="glow"></span></div>
        <div class="intro-polaroid" aria-hidden="true"><div class="ph"></div><span>[PHOTO]</span></div>
        <div class="intro-content">
          <p class="eyebrow">A birthday investigation</p>
          <h1 class="intro-title">${t(D.intro.title)}</h1>
          <p class="intro-sub">${t(D.intro.subtitle)}</p>
          <div class="intro-cake" aria-hidden="true">
            <svg viewBox="0 0 160 120">
              <rect x="10" y="20" width="140" height="94" rx="10" fill="#1c1410" stroke="#e2b04a" stroke-width="3"/>
              <path d="M10 38 H150" stroke="#e2b04a" stroke-width="2" opacity=".5"/>
              <g opacity=".9">
                <rect x="44" y="70" width="72" height="30" rx="4" fill="#3a2a20"/>
                <rect x="54" y="52" width="52" height="22" rx="4" fill="#4a3628"/>
                <rect x="78" y="40" width="4" height="12" fill="#e9dcc3"/>
                <ellipse class="flame" cx="80" cy="36" rx="3.5" ry="6" fill="#ffb347"/>
              </g>
              <g transform="translate(118 64)">
                <path d="M-10 0 V-8 A10 10 0 0 1 10 -8 V0" fill="none" stroke="#e2b04a" stroke-width="3"/>
                <rect x="-14" y="0" width="28" height="22" rx="3" fill="#e2b04a"/>
                <circle cx="0" cy="9" r="3" fill="#1c1410"/><rect x="-1.5" y="10" width="3" height="7" fill="#1c1410"/>
              </g>
            </svg>
          </div>
          <div class="intro-lines">
            ${D.intro.lines.map((l, i) => `<p style="--i:${i}">${t(l)}</p>`).join("")}
          </div>
          <div class="intro-actions" style="--i:${D.intro.lines.length}">
            <button class="btn btn-primary btn-big" id="enter-btn" type="button">${resume ? "Continue" : "Enter"}</button>
            <button class="btn btn-ghost" id="intro-sound" type="button">${state.sound ? "🔊 Sound on" : "🔇 Sound off"}</button>
            ${resume ? `<button class="btn btn-link" id="intro-reset" type="button">Start over</button>` : ""}
          </div>
        </div>
      </section>`;

    $("#enter-btn").addEventListener("click", () => {
      sfx.open();
      if (vaultUnlocked()) go("vault");
      else go("room", Math.min(state.room, state.keys));
    });
    $("#intro-sound").addEventListener("click", () => $("#sound-toggle").click());
    const r = $("#intro-reset");
    if (r) r.addEventListener("click", confirmRestart);
  }

  /* ------------------------------------------------------------------
     ROOMS
     ------------------------------------------------------------------ */
  function renderRoom() {
    const i = state.room;
    const room = ROOMS[i];
    const solved = roomSolvedCount(i);
    const total = room.objects.length;
    const done = i < state.keys;

    stage.innerHTML = `
      <section class="room theme-${esc(room.theme)}">
        <header class="room-head">
          <p class="eyebrow">${t(room.subtitle)}</p>
          <h1 class="room-title">${t(room.title)}</h1>
          <p class="room-intro">${t(room.intro)}</p>
        </header>
        <div class="scene" role="group" aria-label="${esc(room.title)} — clickable objects">
          <div class="decor" aria-hidden="true">${DECOR[room.theme] || ""}</div>
          ${room.objects.map(o => {
            const s = state.solved[o.id];
            return `<button class="obj ${s ? "solved" : ""}" type="button" data-id="${esc(o.id)}"
              style="--x:${+o.x || 0}%;--y:${+o.y || 0}%"
              aria-label="${esc(t(o.label).replace(/<[^>]+>/g, ""))}${s ? " (solved)" : " (unsolved)"}">
              <span class="obj-art">${iconSvg(o.icon, o.color)}</span>
              <span class="obj-tag">${t(o.label)}</span>
              ${s ? `<span class="obj-check" aria-hidden="true">✓</span>` : ""}
            </button>`;
          }).join("")}
        </div>
        <footer class="room-foot">
          <div class="casenote">
            <span class="casenote-count"><strong>${solved}</strong> / ${total} investigated</span>
            <span class="casenote-tip">${done ? `Key recovered: <strong>${esc(D.finalCode[i])}</strong>` : "Click the glowing objects. Solve them all to recover this room's key."}</span>
          </div>
          <div class="room-nav">
            ${i > 0 ? `<button class="btn btn-ghost" type="button" data-nav="${i - 1}">← ${esc(shortName(ROOMS[i - 1]))}</button>` : ""}
            ${done && i < ROOMS.length - 1 ? `<button class="btn btn-primary" type="button" data-nav="${i + 1}">Onward: ${esc(shortName(ROOMS[i + 1]))} →</button>` : ""}
            ${done && i === ROOMS.length - 1 ? `<button class="btn btn-primary" type="button" data-vault>Approach the vault →</button>` : ""}
          </div>
        </footer>
      </section>`;

    stage.querySelectorAll(".obj").forEach(btn => btn.addEventListener("click", () => {
      const obj = room.objects.find(o => o.id === btn.dataset.id);
      openPuzzle(obj, btn);
    }));
    stage.querySelectorAll("[data-nav]").forEach(b => b.addEventListener("click", () => { sfx.click(); go("room", +b.dataset.nav); }));
    const v = stage.querySelector("[data-vault]");
    if (v) v.addEventListener("click", () => { sfx.open(); go("vault"); });
  }

  /* ------------------------------------------------------------------
     MODAL
     ------------------------------------------------------------------ */
  let lastFocus = null;
  let onModalClose = null;

  function openModal(html, opts = {}) {
    lastFocus = document.activeElement;
    modalInner.innerHTML = html;
    modal.className = "modal-backdrop" + (opts.variant ? " " + opts.variant : "");
    modal.hidden = false;
    document.body.classList.add("modal-open");
    onModalClose = opts.onClose || null;
    requestAnimationFrame(() => {
      const focusable = modalInner.querySelector("button:not([disabled]), [tabindex='0']") || $("#modal-close");
      focusable.focus();
    });
  }

  function closeModal() {
    if (modal.hidden) return;
    modal.hidden = true;
    document.body.classList.remove("modal-open");
    const cb = onModalClose;
    onModalClose = null;
    if (lastFocus && document.body.contains(lastFocus)) lastFocus.focus();
    if (cb) cb();
  }

  $("#modal-close").addEventListener("click", closeModal);
  modal.addEventListener("click", e => { if (e.target === modal) closeModal(); });
  document.addEventListener("keydown", e => {
    if (modal.hidden) return;
    if (e.key === "Escape") { e.preventDefault(); closeModal(); }
    if (e.key === "Tab") { // keep focus inside the dialog
      const els = [...modal.querySelectorAll("button:not([disabled]), [href], input, [tabindex='0']")].filter(el => el.offsetParent !== null);
      if (!els.length) return;
      const first = els[0], last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove("show"), 2600);
  }

  /* ------------------------------------------------------------------
     PUZZLES
     ------------------------------------------------------------------ */
  function openPuzzle(obj, fromBtn) {
    const p = obj.puzzle || {};
    const already = state.solved[obj.id];
    sfx.open();

    const body = `
      <div class="paper puzzle puzzle-${esc(p.type)}">
        <p class="eyebrow stamp-eyebrow">${t(p.eyebrow || obj.label)}</p>
        <h2 class="puzzle-q" id="modal-title">${t(p.question || "")}</h2>
        <div class="puzzle-body" id="pz"></div>
        <div class="feedback" id="fb" aria-live="polite"></div>
        <div class="assist" id="assist"></div>
      </div>`;

    openModal(body, { onClose: () => afterPuzzleClosed() });

    const ctx = { obj, p, pz: $("#pz"), fb: $("#fb"), assist: $("#assist") };
    if (already) { showSolved(ctx, true); return; }

    const renderer = PUZZLES[p.type];
    if (!renderer) {
      ctx.pz.innerHTML = `<p>Unknown puzzle type “${esc(p.type)}”. Check data.js.</p>`;
      return;
    }
    renderer(ctx);
  }

  function wrong(ctx, el, customMsg) {
    sfx.wrong();
    state.stats.wrong++;
    state.attempts[ctx.obj.id] = (state.attempts[ctx.obj.id] || 0) + 1;
    save();
    if (el) { el.classList.remove("shake"); void el.offsetWidth; el.classList.add("shake"); }
    ctx.fb.innerHTML = `<p class="fb-wrong"><span aria-hidden="true">✗</span> ${t(customMsg || pick(D.wrongAnswerMessages))}</p>`;
    renderAssist(ctx);
  }

  // After 2 wrong tries: offer a hint. After 3: offer to just reveal it — nobody gets stuck.
  function renderAssist(ctx) {
    const n = state.attempts[ctx.obj.id] || 0;
    const hint = ctx.p.hint;
    let html = "";
    if (n >= 2 && hint) html += `<button class="btn btn-link" type="button" data-hint>💡 Ask the family for a hint</button>`;
    if (n >= 3) html += `<button class="btn btn-link" type="button" data-reveal>🙈 Just tell me (Mom will hear about this)</button>`;
    ctx.assist.innerHTML = html;
    const h = ctx.assist.querySelector("[data-hint]");
    if (h) h.addEventListener("click", () => {
      state.stats.hints++; save();
      sfx.page();
      h.outerHTML = `<p class="hint-note">${t(hint)}</p>`;
    });
    const r = ctx.assist.querySelector("[data-reveal]");
    if (r) r.addEventListener("click", () => solve(ctx, "revealed"));
  }

  function solve(ctx, how = "correct") {
    if (!state.solved[ctx.obj.id]) {
      state.solved[ctx.obj.id] = how;
      save();
    }
    sfx.right();
    showSolved(ctx, false);
  }

  function showSolved(ctx, revisiting) {
    const p = ctx.p;
    const how = state.solved[ctx.obj.id];
    ctx.assist.innerHTML = "";
    // For photo puzzles, keep the (now revealed) photo visible.
    if (p.type === "photo-memory" || p.type === "photo-puzzle") {
      const fig = `<figure class="reveal-photo ${revisiting ? "" : "developing"}">
          <img src="${esc(p.image)}" alt="${esc(t(p.imageAlt || "").replace(/<[^>]+>/g, ""))}">
          ${p.caption ? `<figcaption>${t(p.caption)}</figcaption>` : ""}
        </figure>`;
      ctx.pz.innerHTML = fig;
    } else if (revisiting) {
      ctx.pz.innerHTML = answerSummary(p);
    }
    const lead = how === "revealed" ? "The family takes pity on you." : revisiting ? "Case closed." : "Correct!";
    ctx.fb.innerHTML = `
      <div class="fb-right">
        <p class="fb-right-title"><span aria-hidden="true">✓</span> ${lead}</p>
        ${p.successText ? `<p class="success-text">${t(p.successText)}</p>` : ""}
        <button class="btn btn-primary" type="button" id="continue-btn">Continue</button>
      </div>`;
    $("#continue-btn").addEventListener("click", closeModal);
    $("#continue-btn").focus();
  }

  function answerSummary(p) {
    switch (p.type) {
      case "multiple-choice":
        return p.acceptAny ? "" : `<p class="answer-recap">Answer: <strong>${t(p.options[p.answer])}</strong></p>`;
      case "true-false":
        return `<p class="answer-recap">Answer: <strong>${p.answer ? "TRUE" : "FALSE"}</strong></p>`;
      case "two-truths-one-lie":
        return `<p class="answer-recap">The lie: <strong>${t(p.statements[p.lieIndex])}</strong></p>`;
      case "timeline":
        return `<ol class="answer-recap timeline-recap">${p.events.slice().sort((a, b) => a.order - b.order).map(e => `<li>${t(e.label)}</li>`).join("")}</ol>`;
      case "chat":
        return p.followUp ? `<p class="answer-recap">Answer: <strong>${t(p.followUp.options[p.followUp.answer])}</strong></p>` : "";
      default: return "";
    }
  }

  // Shared multiple-choice renderer (used by several puzzle types)
  function choices(ctx, container, options, answer, acceptAny) {
    const letters = "ABCDEFGH";
    container.insertAdjacentHTML("beforeend", `<div class="choices">${options.map((o, i) =>
      `<button class="choice" type="button" data-i="${i}"><span class="choice-letter" aria-hidden="true">${letters[i]}</span><span>${t(o)}</span></button>`
    ).join("")}</div>`);
    container.querySelectorAll(".choice").forEach(b => b.addEventListener("click", () => {
      const i = +b.dataset.i;
      if (acceptAny || i === answer) {
        b.classList.add("right");
        b.insertAdjacentHTML("beforeend", `<span class="choice-mark" aria-hidden="true">✓</span>`);
        container.querySelectorAll(".choice").forEach(c => c.disabled = true);
        setTimeout(() => solve(ctx), 450);
      } else {
        b.classList.add("wrong");
        b.disabled = true;
        b.insertAdjacentHTML("beforeend", `<span class="choice-mark" aria-hidden="true">✗</span>`);
        b.setAttribute("aria-label", b.textContent + " — wrong");
        wrong(ctx, b);
      }
    }));
  }

  const PUZZLES = {
    "multiple-choice"(ctx) {
      choices(ctx, ctx.pz, ctx.p.options, ctx.p.answer, ctx.p.acceptAny);
    },

    "true-false"(ctx) {
      ctx.pz.innerHTML = `<div class="tf">
        <button class="tf-btn tf-true" type="button" data-v="true">TRUE</button>
        <button class="tf-btn tf-false" type="button" data-v="false">FALSE</button>
      </div>`;
      ctx.pz.querySelectorAll(".tf-btn").forEach(b => b.addEventListener("click", () => {
        if ((b.dataset.v === "true") === !!ctx.p.answer) {
          b.classList.add("right");
          ctx.pz.querySelectorAll(".tf-btn").forEach(c => c.disabled = true);
          setTimeout(() => solve(ctx), 450);
        } else {
          b.classList.add("wrong"); b.disabled = true;
          b.textContent += " ✗";
          wrong(ctx, b);
        }
      }));
    },

    "two-truths-one-lie"(ctx) {
      ctx.pz.innerHTML = `<p class="instruction">Tap the story that is a lie.</p><div class="ttl">${ctx.p.statements.map((s, i) =>
        `<button class="ttl-card" type="button" data-i="${i}" style="--r:${[-2, 1.5, -1, 2][i % 4]}deg">
          <span class="ttl-num">File ${i + 1}</span><span class="ttl-text">${t(s)}</span></button>`
      ).join("")}</div>`;
      ctx.pz.querySelectorAll(".ttl-card").forEach(b => b.addEventListener("click", () => {
        const i = +b.dataset.i;
        if (i === ctx.p.lieIndex) {
          b.classList.add("lie");
          b.insertAdjacentHTML("beforeend", `<span class="ttl-stamp lie-stamp">LIE</span>`);
          ctx.pz.querySelectorAll(".ttl-card").forEach(c => c.disabled = true);
          sfx.lock();
          setTimeout(() => solve(ctx), 700);
        } else {
          b.classList.add("true"); b.disabled = true;
          b.insertAdjacentHTML("beforeend", `<span class="ttl-stamp true-stamp">TRUE</span>`);
          wrong(ctx, b, "That one actually happened. There are witnesses.");
        }
      }));
    },

    timeline(ctx) {
      const events = ctx.p.events;
      let pool = shuffle(events.map((e, i) => i));
      // make sure the shuffle isn't already in order
      if (pool.every((v, k) => k === 0 || events[pool[k - 1]].order < events[v].order) && pool.length > 1) pool.reverse();
      let placed = [];

      ctx.pz.innerHTML = `
        <div class="timeline">
          <div class="tl-col">
            <p class="tl-label">Loose pages</p>
            <div class="tl-pool" id="tl-pool"></div>
          </div>
          <div class="tl-col">
            <p class="tl-label">Your timeline (oldest first)</p>
            <ol class="tl-list" id="tl-list"></ol>
          </div>
        </div>
        <div class="tl-actions"><button class="btn btn-primary" type="button" id="tl-check" disabled>Check order</button>
        <button class="btn btn-ghost" type="button" id="tl-clear">Clear</button></div>`;

      const poolEl = $("#tl-pool"), listEl = $("#tl-list"), check = $("#tl-check");

      function draw() {
        poolEl.innerHTML = pool.length ? pool.map(i =>
          `<button class="tl-chip" type="button" data-i="${i}" aria-label="Add: ${esc(t(events[i].label).replace(/<[^>]+>/g, ""))}">${t(events[i].label)}</button>`
        ).join("") : `<p class="tl-empty">All pages placed ✓</p>`;
        listEl.innerHTML = events.map((_, k) => placed[k] != null
          ? `<li><button class="tl-chip placed" type="button" data-k="${k}" aria-label="Remove: ${esc(t(events[placed[k]].label).replace(/<[^>]+>/g, ""))}">${t(events[placed[k]].label)}<span class="tl-x" aria-hidden="true">×</span></button></li>`
          : `<li class="tl-slot" aria-label="empty slot"></li>`).join("");
        check.disabled = placed.length !== events.length;
      }

      poolEl.addEventListener("click", e => {
        const b = e.target.closest(".tl-chip"); if (!b) return;
        sfx.tick();
        const i = +b.dataset.i;
        pool = pool.filter(x => x !== i);
        placed.push(i);
        ctx.fb.innerHTML = "";
        draw();
      });
      listEl.addEventListener("click", e => {
        const b = e.target.closest(".tl-chip"); if (!b) return;
        sfx.tick();
        const k = +b.dataset.k;
        pool.push(placed[k]);
        placed.splice(k, 1);
        draw();
      });
      $("#tl-clear").addEventListener("click", () => { pool = pool.concat(placed); placed = []; draw(); });
      check.addEventListener("click", () => {
        const sorted = events.map((e, i) => i).sort((a, b) => events[a].order - events[b].order);
        const correct = placed.filter((v, k) => v === sorted[k]).length;
        if (correct === events.length) {
          listEl.classList.add("all-right");
          check.disabled = true;
          setTimeout(() => solve(ctx), 500);
        } else {
          wrong(ctx, listEl, `${correct} of ${events.length} in the right place. ${pick(D.wrongAnswerMessages)}`);
        }
      });
      draw();
    },

    "photo-puzzle"(ctx) {
      const n = Math.max(2, Math.min(6, ctx.p.pieces || 3));
      let order = shuffle([...Array(n).keys()]);
      if (order.every((v, k) => v === k)) order.reverse();
      let selected = null;

      ctx.pz.innerHTML = `<div class="strips" id="strips" style="--n:${n}" role="group" aria-label="Photo pieces"></div>
        <p class="instruction small">Tap a piece, then tap where it should go.</p>`;
      const wrap = $("#strips");

      function draw() {
        wrap.innerHTML = order.map((piece, k) =>
          `<button class="strip ${selected === k ? "selected" : ""}" type="button" data-k="${k}"
            aria-label="Piece in position ${k + 1}${selected === k ? " (selected)" : ""}"
            style="background-image:url('${esc(ctx.p.image)}');background-size:${n * 100}% 100%;background-position:${(piece / (n - 1)) * 100}% 50%"></button>`
        ).join("");
      }
      wrap.addEventListener("click", e => {
        const b = e.target.closest(".strip"); if (!b) return;
        const k = +b.dataset.k;
        if (selected == null) { selected = k; sfx.tick(); draw(); wrap.querySelector(`[data-k="${k}"]`).focus(); return; }
        if (selected !== k) { [order[selected], order[k]] = [order[k], order[selected]]; sfx.page(); }
        selected = null;
        draw();
        wrap.querySelector(`[data-k="${k}"]`).focus();
        if (order.every((v, i) => v === i)) {
          wrap.classList.add("whole");
          wrap.querySelectorAll(".strip").forEach(s => s.disabled = true);
          setTimeout(() => solve(ctx), 700);
        }
      });
      draw();
    },

    "photo-memory"(ctx) {
      const p = ctx.p;
      ctx.pz.innerHTML = `<figure class="blur-photo"><img src="${esc(p.image)}" alt="A blurred photograph — solve to reveal it"></figure>`;
      if (p.options && p.options.length) {
        choices(ctx, ctx.pz, p.options, p.answer, p.acceptAny);
      } else {
        ctx.pz.insertAdjacentHTML("beforeend", `<button class="btn btn-primary" type="button" id="develop">Develop the photo</button>`);
        $("#develop").addEventListener("click", () => solve(ctx));
      }
    },

    chat(ctx) {
      const p = ctx.p;
      ctx.pz.innerHTML = `<div class="chat">
          <div class="chat-head"><span class="chat-avatar" aria-hidden="true">👪</span><div><strong>${t(p.chatTitle || "Family group")}</strong><small>${p.messages.length} new messages</small></div></div>
          <div class="chat-log" id="chat-log" aria-live="polite"></div>
        </div><div id="chat-after"></div>`;
      const log = $("#chat-log");
      const delay = reduceMotion ? 0 : 750;
      p.messages.forEach((m, i) => {
        setTimeout(() => {
          if (!document.body.contains(log)) return;
          log.insertAdjacentHTML("beforeend", `<div class="bubble ${m.me ? "me" : ""}"><span class="from">${t(m.from)}</span>${t(m.text)}</div>`);
          log.scrollTop = log.scrollHeight;
          tone(880 + i * 60, 0.06, { type: "sine", vol: 0.03 });
          if (i === p.messages.length - 1) afterChat();
        }, delay * (i + 1));
      });
      function afterChat() {
        const after = $("#chat-after"); if (!after) return;
        if (p.followUp) {
          after.innerHTML = `<p class="puzzle-q small-q">${t(p.followUp.question)}</p>`;
          choices(ctx, after, p.followUp.options, p.followUp.answer, p.followUp.acceptAny);
        } else {
          after.innerHTML = `<button class="btn btn-primary" type="button" id="chat-ok">Clue noted</button>`;
          $("#chat-ok").addEventListener("click", () => solve(ctx));
        }
      }
    }
  };

  function afterPuzzleClosed() {
    if (state.screen !== "room") return;
    const i = state.room;
    if (roomComplete(i) && state.keys === i) {
      state.keys = i + 1;
      save();
      renderRoom();
      renderHud();
      showKeyReveal(i);
    } else {
      renderRoom();
      const id = lastFocus && lastFocus.dataset && lastFocus.dataset.id;
      const btn = id && stage.querySelector(`.obj[data-id="${CSS.escape(id)}"]`);
      if (btn) btn.focus();
    }
  }

  /* ------------------------------------------------------------------
     KEY REVEAL
     ------------------------------------------------------------------ */
  function showKeyReveal(i) {
    const room = ROOMS[i];
    const last = i === ROOMS.length - 1;
    sfx.key();
    openModal(`
      <div class="key-reveal">
        <div class="key-art">${KEY_SVG}</div>
        <p class="eyebrow">${esc(room.title)} · solved</p>
        <h2 id="modal-title">${t(room.clueLabel || "Clue recovered")}:</h2>
        <div class="big-digit" aria-label="Digit ${esc(D.finalCode[i])}">${esc(D.finalCode[i])}</div>
        <p class="key-note">${last ? "<strong>The Birthday Vault is now accessible.</strong>" : "Remember it. You'll need it."}</p>
        <button class="btn btn-primary btn-big" type="button" id="key-next">${last ? "Approach the vault →" : `Onward to Room ${i + 2} →`}</button>
        <button class="btn btn-link" type="button" id="key-stay">Stay and look around</button>
      </div>`, { variant: "dark" });
    const slot = document.querySelectorAll(".key-slot")[i];
    if (slot) { slot.classList.remove("pop"); void slot.offsetWidth; slot.classList.add("pop"); }
    $("#key-next").addEventListener("click", () => {
      closeModal();
      last ? go("vault") : go("room", i + 1);
    });
    $("#key-stay").addEventListener("click", closeModal);
  }

  /* ------------------------------------------------------------------
     VAULT
     ------------------------------------------------------------------ */
  function renderVault() {
    const len = D.finalCode.length;
    let digits = Array(len).fill(0);

    stage.innerHTML = `
      <section class="vault-screen">
        <header class="room-head center">
          <p class="eyebrow">Final room</p>
          <h1 class="room-title">The Birthday Vault</h1>
          <p class="room-intro">Enter the ${len} digits you recovered — in the order you found them.</p>
        </header>
        <div class="vault-wrap">
          <div class="vault-door" id="vault-door">
            <div class="vault-bolts" aria-hidden="true">${Array(8).fill('<span></span>').join("")}</div>
            <div class="vault-face">
              <div class="dials" role="group" aria-label="Combination">
                ${digits.map((d, k) => `
                  <div class="dial">
                    <button class="dial-btn" type="button" data-k="${k}" data-d="1" aria-label="Digit ${k + 1} up">▲</button>
                    <input class="dial-num" id="dial-${k}" inputmode="numeric" maxlength="1" value="0" aria-label="Digit ${k + 1}" autocomplete="off">
                    <button class="dial-btn" type="button" data-k="${k}" data-d="-1" aria-label="Digit ${k + 1} down">▼</button>
                  </div>`).join("")}
              </div>
              <button class="vault-handle" type="button" id="vault-open" aria-label="Turn the handle to try the code">
                <span class="spoke"></span><span class="spoke"></span><span class="spoke"></span><span class="hub">OPEN</span>
              </button>
            </div>
          </div>
          <div class="vault-inside" aria-hidden="true"><div class="vault-cake">🎂</div></div>
        </div>
        <div class="vault-msg" id="vault-msg" aria-live="assertive"></div>
        <div class="vault-notes">
          ${D.finalCode.map((d, i) => `<span class="sticky" style="--r:${[-4, 3, -2, 5][i % 4]}deg">Key ${i + 1}<b>${i < state.keys ? esc(d) : "?"}</b></span>`).join("")}
        </div>
      </section>`;

    const inputs = [...stage.querySelectorAll(".dial-num")];
    function setDigit(k, v) {
      digits[k] = ((v % 10) + 10) % 10;
      inputs[k].value = digits[k];
    }
    stage.querySelectorAll(".dial-btn").forEach(b => b.addEventListener("click", () => {
      const k = +b.dataset.k;
      setDigit(k, digits[k] + +b.dataset.d);
      sfx.tick();
    }));
    inputs.forEach((inp, k) => {
      inp.addEventListener("focus", () => inp.select());
      inp.addEventListener("input", () => {
        const v = inp.value.replace(/\D/g, "").slice(-1);
        if (v === "") return;
        setDigit(k, +v);
        sfx.tick();
        if (k < inputs.length - 1) inputs[k + 1].focus();
      });
      inp.addEventListener("keydown", e => {
        if (e.key === "ArrowUp") { e.preventDefault(); setDigit(k, digits[k] + 1); sfx.tick(); }
        if (e.key === "ArrowDown") { e.preventDefault(); setDigit(k, digits[k] - 1); sfx.tick(); }
        if (e.key === "Enter") tryOpen();
        if (e.key === "Backspace" && k > 0 && inp.value === "") inputs[k - 1].focus();
      });
    });

    $("#vault-open").addEventListener("click", tryOpen);

    function tryOpen() {
      const code = digits.join("");
      const door = $("#vault-door");
      const msg = $("#vault-msg");
      if (code === D.finalCode.join("")) {
        sfx.vault();
        msg.innerHTML = `<p class="granted">ACCESS GRANTED</p>`;
        door.classList.add("unlocking");
        stage.querySelectorAll("button, input").forEach(el => el.disabled = true);
        setTimeout(() => { door.classList.add("open"); confetti(); }, reduceMotion ? 0 : 1100);
        setTimeout(() => go("escaped"), reduceMotion ? 1500 : 3600);
      } else {
        sfx.lock();
        state.stats.wrong++; save();
        door.classList.remove("shake"); void door.offsetWidth; door.classList.add("shake");
        msg.innerHTML = `<p class="denied">ACCESS DENIED</p><p>${t(D.vault.wrongCodeMessage)}</p>`;
      }
    }
  }

  /* ------------------------------------------------------------------
     ESCAPED (stats + achievement)
     ------------------------------------------------------------------ */
  function renderEscaped() {
    const solvedTotal = totalSolved();
    const correct = Object.values(state.solved).filter(v => v === "correct").length;
    const accuracy = Math.round((100 * correct) / Math.max(1, correct + state.stats.wrong));
    const vars = { accuracy, memories: solvedTotal, wrong: state.stats.wrong };

    stage.innerHTML = `
      <section class="escaped">
        <p class="eyebrow">Case file closed</p>
        <h1 class="escaped-title"><span>Escape</span> <span>Successful</span></h1>
        <dl class="stats">
          ${D.vault.stats.map((s, i) => `<div class="stat" style="--i:${i}"><dt>${t(s.label)}</dt><dd>${t(s.value, vars)}</dd></div>`).join("")}
        </dl>
        <div class="achievement" role="img" aria-label="Achievement unlocked: ${esc(t(D.vault.achievement).replace(/<[^>]+>/g, ""))}">
          <div class="ach-badge" aria-hidden="true">★</div>
          <div><small>Achievement unlocked</small><strong>${t(D.vault.achievement)}</strong></div>
        </div>
        <button class="btn btn-primary btn-big envelope-btn" type="button" id="last-envelope">✉ Open the last envelope</button>
      </section>`;
    $("#last-envelope").addEventListener("click", () => { sfx.page(); go("ending"); });
  }

  /* ------------------------------------------------------------------
     ENDING — the sincere part
     ------------------------------------------------------------------ */
  function renderEnding() {
    const E = D.ending;
    stage.innerHTML = `
      <section class="ending">
        <div class="candle-glow" aria-hidden="true"></div>
        <p class="ending-teaser">${t(E.teaser)}</p>
        <button class="envelope" type="button" id="envelope" aria-label="Open the envelope">
          <span class="env-back"></span>
          <span class="env-letter"><span>For ${t(D.name)}</span></span>
          <span class="env-front"></span>
          <span class="env-flap"></span>
          <span class="env-seal" aria-hidden="true">♥</span>
        </button>
        <p class="ending-tap">Tap the envelope</p>
        <div class="ending-content" id="ending-content" hidden>
          <article class="letter">
            ${E.letter.map((p, i) => `<p style="--i:${i}" class="${i === 0 ? "letter-greeting" : ""}">${t(p)}</p>`).join("")}
            <p class="letter-sign" style="--i:${E.letter.length}">${t(E.signature || "")}</p>
          </article>
          ${E.photos && E.photos.length ? `<div class="collage">${E.photos.map((ph, i) => `
            <figure class="polaroid" style="--r:${[-4, 3, -2, 5, -3, 2][i % 6]}deg">
              <img src="${esc(ph.src)}" alt="${esc(t(ph.caption || "Family photo").replace(/<[^>]+>/g, ""))}" loading="lazy">
              ${ph.caption ? `<figcaption>${t(ph.caption)}</figcaption>` : ""}
            </figure>`).join("")}</div>` : ""}
          ${E.video ? `<div class="video-wrap"><video src="${esc(E.video)}" controls playsinline preload="metadata"></video></div>` : ""}
          ${E.messages && E.messages.length ? `
            <button class="btn btn-primary btn-big" type="button" id="show-messages">View messages from your family</button>
            <div class="messages" id="messages" hidden>
              ${E.messages.map((m, i) => `
                <article class="msg-card" style="--i:${i};--r:${[-1.5, 1, -0.5, 1.5][i % 4]}deg">
                  <p class="msg-text">${t(m.text)}</p>
                  <p class="msg-from">— ${t(m.from)}${m.relationship ? `<small>${t(m.relationship)}</small>` : ""}</p>
                </article>`).join("")}
            </div>` : ""}
          <div class="ending-foot">
            <button class="btn btn-ghost" type="button" id="play-again">Play again</button>
          </div>
        </div>
      </section>`;

    const env = $("#envelope");
    env.addEventListener("click", () => {
      if (env.classList.contains("opened")) return;
      env.classList.add("opened");
      sfx.page();
      playEndingMusic();
      $(".ending-tap").hidden = true;
      setTimeout(() => {
        $("#ending-content").hidden = false;
        $(".letter").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      }, reduceMotion ? 0 : 900);
    });
    const sm = $("#show-messages");
    if (sm) sm.addEventListener("click", () => {
      sm.hidden = true;
      const m = $("#messages");
      m.hidden = false;
      sfx.right();
      confetti(0.5);
      m.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    });
    $("#play-again").addEventListener("click", confirmRestart);
  }

  /* ------------------------------------------------------------------
     RESTART
     ------------------------------------------------------------------ */
  function confirmRestart() {
    openModal(`
      <div class="paper puzzle">
        <p class="eyebrow stamp-eyebrow">Wipe the evidence?</p>
        <h2 class="puzzle-q" id="modal-title">Start the whole escape over from the beginning?</h2>
        <p>All keys and solved puzzles will be forgotten. (Your family will not forget.)</p>
        <div class="modal-actions">
          <button class="btn btn-ghost" type="button" id="no-reset">Keep my progress</button>
          <button class="btn btn-danger" type="button" id="yes-reset">Start over</button>
        </div>
      </div>`);
    $("#no-reset").addEventListener("click", closeModal);
    $("#yes-reset").addEventListener("click", () => {
      const sound = state.sound;
      state = freshState();
      state.sound = sound;
      if (music) music.pause();
      save();
      closeModal();
      go("intro");
    });
  }
  $("#restart-btn").addEventListener("click", () => { sfx.click(); confirmRestart(); });

  /* ------------------------------------------------------------------
     CONFETTI
     ------------------------------------------------------------------ */
  const canvas = $("#confetti");
  const c2d = canvas.getContext("2d");
  let pieces = [];
  let rafId = null;

  function confetti(amount = 1) {
    if (reduceMotion) return;
    canvas.width = window.innerWidth * devicePixelRatio;
    canvas.height = window.innerHeight * devicePixelRatio;
    const colors = ["#e2b04a", "#e05a4a", "#4f8a8b", "#f6e27a", "#c46b5a", "#fbf5e6", "#8fa98a"];
    const n = Math.round(180 * amount);
    for (let i = 0; i < n; i++) {
      pieces.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * canvas.width * 0.3,
        y: canvas.height * 0.45,
        vx: (Math.random() - 0.5) * 22 * devicePixelRatio,
        vy: (-Math.random() * 20 - 6) * devicePixelRatio,
        w: (6 + Math.random() * 8) * devicePixelRatio,
        h: (4 + Math.random() * 6) * devicePixelRatio,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        color: pick(colors),
        life: 0
      });
    }
    if (!rafId) rafId = requestAnimationFrame(tick);
  }

  function tick() {
    c2d.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(p => {
      p.vy += 0.45 * devicePixelRatio;
      p.vx *= 0.985; p.vy *= 0.985;
      p.x += p.vx; p.y += p.vy;
      p.rot += p.vr; p.life++;
      c2d.save();
      c2d.translate(p.x, p.y);
      c2d.rotate(p.rot);
      c2d.fillStyle = p.color;
      c2d.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.life * 0.1)));
      c2d.restore();
    });
    pieces = pieces.filter(p => p.y < canvas.height + 40 && p.life < 600);
    if (pieces.length) rafId = requestAnimationFrame(tick);
    else { rafId = null; c2d.clearRect(0, 0, canvas.width, canvas.height); }
  }

  /* ------------------------------------------------------------------
     Boot
     ------------------------------------------------------------------ */
  render();
})();
