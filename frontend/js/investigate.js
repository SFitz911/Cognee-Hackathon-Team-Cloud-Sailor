/* Page 2 — investigation. Clues -> Cognee memory, the wolfpack, and a live
   "discovery map": connections start dim and light up (pulsing green, then
   steady) as the matching clue lands. False leads light up red. */

/* Security gate: only reachable after facial recognition grants access. */
if (sessionStorage.getItem("wolfpack_access") !== "granted") {
  window.location.replace("/security.html");
}

const PERSONA_META = {
  planner:  { emoji: "🧭", arche: "the planner" },
  wildcard: { emoji: "🎲", arche: "the wildcard" },
  worrier:  { emoji: "😰", arche: "the worrier" },
  optimist: { emoji: "🌅", arche: "the optimist" },
};

/* ============================ CLUES ============================ */
const clues = [];

function renderClues() {
  $("#clue-count").textContent = clues.length;
  const ul = $("#clue-list");
  ul.innerHTML = "";
  for (const c of clues.slice().reverse()) {
    const li = document.createElement("li");
    li.className = c.node_set;
    li.innerHTML = `<span class="tag">${c.node_set} · ${c.state}</span>${escapeHtml(c.text)}`;
    ul.appendChild(li);
  }
}

async function addClue(text, node_set) {
  if (!text.trim()) return;
  const entry = { text, node_set, state: "remembering…" };
  clues.push(entry);
  renderClues();
  revealForClue(text); // light up the map immediately (optimistic)
  try {
    const res = await api("/clues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, node_set, wait: true }),
    });
    entry.state = res.queryable ? "in memory" : (res.cognify || "accepted");
  } catch (e) {
    entry.state = "error";
  }
  renderClues();
}

/* ====================== DISCOVERY-MAP GRAPH ====================== */
const LIT = "#22c55e";
const C = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

const NODE_DEFS = {
  pinky:  { label: "Pinky\n(dog)", shape: "dot", size: 26 },
  code:   { label: "Locker code\n(belly tattoo)", shape: "diamond", size: 18 },
  bar:    { label: "Zum Rosa Hund\n(bar · Berlin)", shape: "dot", size: 16 },
  tattoo: { label: "Berlin Ink\n(tattoo parlor)", shape: "dot", size: 16 },
  bus:    { label: "FlixBus\nBerlin → Novi Sad", shape: "dot", size: 16 },
  gym:    { label: "Karlovci Gymnasium\nLocker 7 · Serbia", shape: "square", size: 22 },
  markus: { label: "Markus\n(locker guy)", shape: "dot", size: 16 },
  zoo:    { label: "Berlin Zoo\n(false lead)", shape: "dot", size: 12, refuted: true },
};
const EDGE_DEFS = {
  e_pc: { from: "pinky", to: "code", label: "carries" },
  e_cg: { from: "code", to: "gym", label: "opens" },
  e_pb: { from: "pinky", to: "bar", label: "seen at" },
  e_pt: { from: "pinky", to: "tattoo", label: "tattooed at" },
  e_mg: { from: "markus", to: "gym", label: "guards" },
  e_mp: { from: "markus", to: "pinky", label: "wants by 10am" },
  e_bb: { from: "bar", to: "bus", label: "" },
  e_bg: { from: "bus", to: "gym", label: "to Serbia" },
  e_pz: { from: "pinky", to: "zoo", label: "false lead", refuted: true },
};

let gnodes, gedges, net;
const revealed = new Set();
const pulseStart = new Map(); // id -> start ts (ms)
const PULSE_MS = 3200;

function nodeStyle(id) {
  const def = NODE_DEFS[id];
  const base = { id, label: def.label, shape: def.shape, size: def.size,
    font: { multi: false, size: 11, face: "Inter" }, borderWidth: 1 };
  if (!revealed.has(id)) {
    return { ...base, color: { background: "#161320", border: "#2a2533" },
      font: { ...base.font, color: "#5c5870" }, shadow: false };
  }
  if (def.refuted) {
    return { ...base, color: { background: "#241016", border: "#b3415f" },
      font: { ...base.font, color: "#caa0ac" }, borderWidth: 1.5, shadow: false };
  }
  return { ...base, color: { background: "#10241a", border: LIT },
    font: { ...base.font, color: "#dff6e8" }, borderWidth: 2,
    shadow: { enabled: true, color: "rgba(34,197,94,0.55)", size: 18 } };
}

function edgeStyle(id) {
  const def = EDGE_DEFS[id];
  const base = { id, from: def.from, to: def.to, label: def.label,
    font: { size: 9, strokeWidth: 0, face: "JetBrains Mono", color: "#5c5870" },
    arrows: { to: { enabled: true, scaleFactor: 0.5 } }, smooth: { type: "continuous" } };
  if (!revealed.has(id)) {
    return { ...base, color: { color: "rgba(120,116,140,0.18)" }, dashes: [3, 6], width: 1 };
  }
  if (def.refuted) {
    return { ...base, color: { color: "#b3415f" }, dashes: [2, 4], width: 1.6,
      font: { ...base.font, color: "#b3415f" } };
  }
  return { ...base, color: { color: LIT, highlight: LIT }, dashes: false, width: 2.8,
    font: { ...base.font, color: "#7fdca0" } };
}

function buildGraph() {
  const el = $("#graph");
  if (!window.vis || !el) return;
  gnodes = new vis.DataSet(Object.keys(NODE_DEFS).map(nodeStyle));
  gedges = new vis.DataSet(Object.keys(EDGE_DEFS).map(edgeStyle));
  net = new vis.Network(el, { nodes: gnodes, edges: gedges }, {
    physics: { barnesHut: { gravitationalConstant: -4800, springLength: 120 }, stabilization: { iterations: 200 } },
    interaction: { hover: true, dragView: true, zoomView: true },
  });
  reveal(["pinky"], []);   // the subject is known from the start
  requestAnimationFrame(pulseTick);
}

function reveal(nodeIds, edgeIds) {
  const now = performance.now();
  for (const id of nodeIds) {
    if (!NODE_DEFS[id]) continue;
    const fresh = !revealed.has(id);
    revealed.add(id);
    gnodes.update(nodeStyle(id));
    if (fresh && !NODE_DEFS[id].refuted) pulseStart.set(id, now);
  }
  for (const id of edgeIds) {
    if (!EDGE_DEFS[id]) continue;
    revealed.add(id);
    gedges.update(edgeStyle(id));
  }
}

function pulseTick() {
  if (gnodes) {
    const now = performance.now();
    const updates = [];
    for (const [id, t0] of pulseStart) {
      const dt = now - t0;
      if (dt > PULSE_MS) { pulseStart.delete(id); updates.push(nodeStyle(id)); continue; }
      const phase = (Math.sin(dt / 150) + 1) / 2; // 0..1
      updates.push({ id, borderWidth: 2 + phase * 3,
        shadow: { enabled: true, color: LIT, size: 14 + phase * 26 } });
    }
    if (updates.length) gnodes.update(updates);
  }
  requestAnimationFrame(pulseTick);
}

/* Map a clue's text to the graph elements it discovers. */
function revealForClue(text) {
  const t = text.toLowerCase();
  const N = new Set(), E = new Set();
  const add = (ns, es) => { ns.forEach((n) => N.add(n)); es.forEach((e) => E.add(e)); };
  if (/tattoo|belly|ink/.test(t)) add(["tattoo", "pinky", "code"], ["e_pt", "e_pc"]);
  if (/voice memo|code|belly|gym|gymnasium|locker/.test(t)) add(["code", "gym", "pinky"], ["e_pc", "e_cg"]);
  if (/flixbus|\bbus\b|novi sad|serbia/.test(t)) add(["bus", "bar", "gym"], ["e_bb", "e_bg"]);
  if (/markus|locker guy|locker 7/.test(t)) add(["markus", "gym", "code", "pinky"], ["e_mg", "e_mp", "e_cg"]);
  if (/photo|flyer|dog show/.test(t)) add(["pinky", "bar", "gym"], ["e_pb"]);
  if (/receipt|rosa hund|beers|bar\b/.test(t)) add(["bar"], []);
  if (/lanyard|gimnazija|gymnasium|karlovci/.test(t)) add(["gym"], []);
  if (/zoo/.test(t)) add(["zoo"], ["e_pz"]);
  reveal([...N], [...E]);
}

/* ====================== INVESTIGATION ====================== */
function personaCard(key, color, body, opts = {}) {
  const meta = PERSONA_META[key] || { emoji: "🕵️", arche: "" };
  const div = document.createElement("div");
  div.className = "persona" + (opts.loading ? " loading" : "") + (opts.error ? " err" : "");
  div.style.setProperty("--accent", color || "#888");
  div.innerHTML = `
    <div class="persona-head">
      <div class="persona-avatar">${meta.emoji}</div>
      <div>
        <div class="persona-name">${opts.name || key}</div>
        <div class="persona-arche">${meta.arche}</div>
      </div>
    </div>
    <div class="persona-text ${opts.skeleton ? "skeleton" : ""}">${escapeHtml(body)}</div>`;
  return div;
}

function showLoadingPack() {
  const pack = $("#pack");
  pack.innerHTML = "";
  for (const key of ["planner", "wildcard", "worrier", "optimist"]) {
    pack.appendChild(personaCard(key, C("--" + key), "consulting the memory…",
      { loading: true, skeleton: true, name: titleCase(key) }));
  }
}

async function investigate() {
  const q = $("#question").value.trim();
  if (!q) return;
  const btn = $("#investigate");
  btn.disabled = true;
  refreshContext(q);
  showLoadingPack();
  try {
    const res = await api("/investigate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: q, top_k: 10 }),
    });
    renderPack(res);
  } catch (e) {
    $("#pack").innerHTML =
      `<div class="persona err"><div class="persona-text">Investigation failed: ${escapeHtml(String(e))}</div></div>`;
  } finally {
    btn.disabled = false;
  }
}

function renderPack(res) {
  const pack = $("#pack");
  pack.innerHTML = "";
  for (const t of res.turns) {
    pack.appendChild(personaCard(t.key, t.color, t.error ? `⚠ ${t.error}` : t.text,
      { error: !!t.error, name: t.name }));
  }
}

async function refreshContext(q) {
  try {
    const r = await api(`/memory/search?q=${encodeURIComponent(q)}&top_k=10`);
    $("#context-text").textContent = r.hits?.map((h) => h.text).join("\n\n") || "—";
  } catch { /* ignore */ }
}

/* ====================== SEED PACK ====================== */
const SEED_CLUES = [
  { text: "A bar receipt from 'Zum Rosa Hund' in Kreuzberg, Berlin, 01:42 — 6 beers, 2 Jagermeister.", node_set: "verified" },
  { text: "A blurry phone photo at 02:15 shows Pinky on the bar next to a flyer: 'Underground Dog Show - Saturday - Karlovci Gymnasium, Sremski Karlovci, Serbia'.", node_set: "verified" },
  { text: "A receipt from 'Berlin Ink' tattoo parlor, 03:10: 'one small numeric tattoo, placed on the dog's belly'.", node_set: "verified" },
  { text: "A slurred voice memo: 'we put the code on Pinky... the locker code is tattooed on her belly... it's at the old gymnasium, the school in Serbia...'", node_set: "timeline" },
  { text: "A FlixBus ticket: departed Berlin ZOB 04:20, destination Novi Sad, Serbia (Sremski Karlovci is 20 min away).", node_set: "verified" },
  { text: "Text from 'Locker Guy - Markus': 'the prize is in locker 7 at the Karlovci Gymnasium, the code is on the dog, bring Pinky by 10am or you forfeit'.", node_set: "verified" },
  { text: "Someone insists Pinky was last seen at the Berlin Zoo, but the zoo closed by midnight and no ticket supports this.", node_set: "all" },
];

async function loadSeed() {
  const btn = $("#load-seed");
  btn.disabled = true;
  btn.textContent = "Lighting up the map…";
  for (const c of SEED_CLUES) { await addClue(c.text, c.node_set); }
  btn.disabled = false;
  btn.textContent = "Load the case clue pack ↩";
}

/* ====================== WIRE-UP ====================== */
$("#add-clue").addEventListener("click", () => {
  addClue($("#clue-text").value, $("#clue-nodeset").value);
  $("#clue-text").value = "";
});
$("#investigate").addEventListener("click", investigate);
$("#load-seed").addEventListener("click", loadSeed);

buildGraph();
refreshStatus();
setInterval(refreshStatus, 15000);
