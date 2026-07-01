/* Page 1 — landing. Renders the animated cast strip. */

const CAST = [
  { img: "luca-stromann.png",     role: "THE PLANNER",   name: "level head",  accent: "--planner" },
  { img: "dmytro-gordon.png",     role: "THE WILDCARD",  name: "chaos",       accent: "--wildcard" },
  { img: "leonie-sauer.png",      role: "THE WORRIER",   name: "the skeptic", accent: "--worrier" },
  { img: "dave-nielsen.png",      role: "THE OPTIMIST",  name: "the dreamer", accent: "--optimist" },
  { img: "vasilije-markovic.png", role: "FOUNDER CAMEO", name: "Cognee founder as Mr. Chow", accent: "--cyan", cameo: true },
];

function renderCast() {
  const wrap = $("#cast");
  if (!wrap) return;
  wrap.innerHTML = "";
  for (const c of CAST) {
    const el = document.createElement("div");
    el.className = "cast-member" + (c.cameo ? " cameo" : "");
    el.style.setProperty("--accent", `var(${c.accent})`);
    el.innerHTML = `
      <img src="/images/${c.img}" alt="${c.role}" onerror="this.style.opacity=.25" />
      <span class="cast-role">${c.role}</span>
      <span class="cast-name">${c.name}</span>`;
    wrap.appendChild(el);
  }
}

renderCast();

/* Warm the backend the moment the poster loads: this wakes a sleeping Render
   instance and triggers the DeepFace model warm-up early, so by the time the
   visitor reaches Page 3 the face scanner is already fast. Fire-and-forget. */
(function prewarmBackend() {
  const ping = (path) => { try { fetch(path, { cache: "no-store" }).catch(() => {}); } catch {} };
  ping("/health");
  ping("/auth/status");   // touches face_gate → kicks off model warm-up
})();
