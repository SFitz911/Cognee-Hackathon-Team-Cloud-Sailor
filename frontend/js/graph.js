/* Page 5 — full-screen Graph Explorer.
   Toggle between our Storyline map (vis-network) and Cognee's real Brain graph
   (their UI, embedded), with a dataset picker for the Brain. */

const C = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

/* ---- Storyline map (static full view: route + Pinky + seed clues) ---- */
const ROUTE = [
  { id: "r_apt", label: "Apartment\n(Berlin)", x: -420, y: 130 },
  { id: "r_bar", label: "Zum Rosa Hund\n(bar · Berlin)", x: -210, y: -80 },
  { id: "r_ink", label: "Berlin Ink\n(tattoo parlor)", x: 0, y: 110 },
  { id: "r_bus", label: "FlixBus\nBerlin → Novi Sad", x: 210, y: -80 },
  { id: "r_gym", label: "Karlovci Gymnasium\nLocker 7 · Serbia", x: 430, y: 120 },
];
const SEED = [
  "Bar receipt — Zum Rosa Hund, 01:42",
  "Photo 02:15 — Pinky + dog-show flyer",
  "Berlin Ink — tattoo on the dog's belly",
  "Voice memo — 'code is on Pinky'",
  "FlixBus — Berlin → Novi Sad, 04:20",
  "Markus — 'locker 7, code's on the dog'",
  "Berlin Zoo sighting (false lead)",
];

function buildStoryline() {
  const el = document.getElementById("graph");
  if (!window.vis || !el) return;
  const PINK = C("--magenta") || "#ff3d8b";
  const nodes = ROUTE.map((r) => ({
    id: r.id, label: r.label, x: r.x, y: r.y, fixed: true, physics: false,
    shape: "dot", size: 14, color: { background: "#15131b", border: "#4a4658" },
    font: { color: "#8b8598", size: 12, face: "Inter" },
  }));
  nodes.push({
    id: "pinky", label: "PINKY", shape: "dot", size: 16, physics: false, x: -300, y: 40,
    color: { background: "#3a1020", border: PINK }, borderWidth: 2,
    font: { color: "#fff", size: 13, face: "Inter" },
    shadow: { enabled: true, color: "rgba(255,61,139,0.6)", size: 16 },
  });
  const edges = [];
  for (let i = 0; i < ROUTE.length - 1; i++) {
    edges.push({ from: ROUTE[i].id, to: ROUTE[i + 1].id, color: { color: "rgba(150,146,165,0.35)" },
      width: 2, dashes: [6, 6], arrows: { to: { enabled: true, scaleFactor: 0.4 } }, smooth: false });
  }
  SEED.forEach((text, i) => {
    const id = "c" + i;
    const refuted = /zoo/i.test(text);
    nodes.push({ id, label: text, shape: "dot", size: 13,
      color: { background: refuted ? "#241016" : "#241f10", border: refuted ? "#ef4444" : "#f59e0b" },
      font: { color: refuted ? "#f2b8b8" : "#f4d39a", size: 11, face: "Inter" } });
    edges.push({ from: "pinky", to: id, color: { color: PINK, opacity: refuted ? 0.4 : 0.7 },
      dashes: refuted ? [4, 4] : [2, 6], width: 1.8, smooth: { type: "continuous" },
      arrows: { to: { enabled: true, scaleFactor: 0.45 } } });
  });
  const net = new vis.Network(el, { nodes: new vis.DataSet(nodes), edges: new vis.DataSet(edges) }, {
    physics: { barnesHut: { gravitationalConstant: -6000, springLength: 140 }, stabilization: { iterations: 220 } },
    interaction: { hover: true, dragView: true, zoomView: true },
  });
  net.once("stabilizationIterationsDone", () => net.fit({ animation: true }));
}

/* ---- Cognee Brain (their real graph) + dataset picker ---- */
let brainLoaded = false;
let currentDataset = null;

async function loadDatasets() {
  try {
    const r = await api("/cognee/datasets");
    currentDataset = r.default;
    const sel = document.getElementById("ds-select");
    sel.innerHTML = "";
    for (const d of r.datasets) {
      const o = document.createElement("option");
      o.value = d.name; o.textContent = d.name;
      if (d.name === r.default) o.selected = true;
      sel.appendChild(o);
    }
    sel.addEventListener("change", () => { currentDataset = sel.value; loadBrain(true); });
  } catch { /* ignore */ }
}

function loadBrain(force) {
  const frame = document.getElementById("brain-frame");
  const url = "/cognee/graph" + (currentDataset ? `?dataset=${encodeURIComponent(currentDataset)}` : "");
  if (force || !brainLoaded) { frame.src = url; brainLoaded = true; }
}

/* ---- view toggle ---- */
function showView(which) {
  const brain = which === "brain";
  document.getElementById("tab-brain").classList.toggle("active", brain);
  document.getElementById("tab-map").classList.toggle("active", !brain);
  document.getElementById("brain-frame").classList.toggle("hidden", !brain);
  document.getElementById("graph").classList.toggle("hidden", brain);
  document.getElementById("ds-wrap").hidden = !brain;
  document.getElementById("explorer-hint").textContent = brain
    ? "🧠 Cognee Brain — the real knowledge graph in Cognee's own UI. Switch dataset to explore other memories."
    : "🗺️ Storyline map — our narrative. Flip to 🧠 Cognee Brain to see Cognee's real graph (their UI).";
  if (brain) loadBrain(false);
}

document.getElementById("tab-map").addEventListener("click", () => showView("map"));
document.getElementById("tab-brain").addEventListener("click", () => showView("brain"));

buildStoryline();
loadDatasets();
refreshStatus();
setInterval(refreshStatus, 15000);
