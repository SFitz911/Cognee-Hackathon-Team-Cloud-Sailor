/* Page 1 — landing. Renders the animated cast strip. */

const CAST = [
  { img: "luca-stromann.png",     role: "THE PLANNER",   name: "level head",  accent: "--planner" },
  { img: "dmytro-gordon.png",     role: "THE WILDCARD",  name: "chaos",       accent: "--wildcard" },
  { img: "leonie-sauer.png",      role: "THE WORRIER",   name: "the skeptic", accent: "--worrier" },
  { img: "dave-nielsen.png",      role: "THE OPTIMIST",  name: "the dreamer", accent: "--optimist" },
  { img: "vasilije-markovic.png", role: "FOUNDER CAMEO", name: "Cognee",      accent: "--cyan", cameo: true },
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
