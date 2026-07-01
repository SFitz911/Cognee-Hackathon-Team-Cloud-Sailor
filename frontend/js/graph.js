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
let storylineBuilt = false;
function showView(which) {
  const brain = which === "brain";
  document.getElementById("tab-brain").classList.toggle("active", brain);
  document.getElementById("tab-map").classList.toggle("active", !brain);
  document.getElementById("brain-frame").classList.toggle("hidden", !brain);
  document.getElementById("graph").classList.toggle("hidden", brain);
  document.getElementById("ds-wrap").hidden = !brain;
  document.getElementById("explorer-hint").textContent = brain
    ? "Cognee's real knowledge graph, in Cognee's own UI. Switch dataset to explore other memories."
    : "Our narrative map — the storyline route, Pinky, and every clue.";
  if (brain) loadBrain(false);
  else if (!storylineBuilt) { buildStoryline(); storylineBuilt = true; }
}

document.getElementById("tab-map").addEventListener("click", () => showView("map"));
document.getElementById("tab-brain").addEventListener("click", () => showView("brain"));

/* ---- Cognee explainer overlay (shows on first arrival) ---- */
const aboutOverlay = document.getElementById("about-overlay");
function showAbout(on) { aboutOverlay.classList.toggle("show", on); }
document.getElementById("about-btn").addEventListener("click", () => showAbout(true));
document.getElementById("about-close").addEventListener("click", () => showAbout(false));
document.getElementById("about-explore").addEventListener("click", () => showAbout(false));
aboutOverlay.addEventListener("click", (e) => { if (e.target === aboutOverlay) showAbout(false); });
showAbout(true);

/* ---- Ask-about-Cognee help assistant ---- */
const askPanel = document.getElementById("ask-panel");
const askMsgs = document.getElementById("ask-msgs");
let askGreeted = false;

function askBubble(text, who) {
  const b = document.createElement("div");
  b.className = "ask-bubble " + who;
  b.textContent = text;
  askMsgs.appendChild(b);
  askMsgs.scrollTop = askMsgs.scrollHeight;
  return b;
}
function openAsk(open) {
  askPanel.classList.toggle("hidden", !open);
  document.getElementById("ask-toggle").classList.toggle("hidden", open);
  if (open && !askGreeted) {
    askGreeted = true;
    askBubble("Hi! I'm the Cognee Guide. Ask me anything about Cognee, or tell me where you're stuck and I'll walk you through it.", "bot");
  }
}
/* The chat uses Puter.js — free, keyless, client-side AI (Puter's user-pays
   model), so it works for ANY visitor at no cost to the app owner. If Puter is
   unavailable, it falls back to a built-in help answer. */
const GUIDE = [
  "You are the Cognee Guide — a friendly, concise help assistant in the 'Hangover 4: Berlin /",
  "Wolfpack Recall' hackathon app. Help users (1) understand Cognee and (2) get unstuck in the app.",
  "Keep answers SHORT (2-5 sentences), warm, practical; use a concrete example when useful.",
  "",
  "COGNEE: an open-source AI memory layer for agents. Core API: remember() (ingest+cognify text",
  "into a knowledge graph), recall() (query via GRAPH_COMPLETION + other modes), improve(), forget().",
  "It builds a HYBRID vector + knowledge graph, grounds entities into an ontology, supports datasets",
  "and node_sets, runs on Cognee Cloud or self-hosted, and connects to agents via MCP. Beats plain RAG.",
  "",
  "THIS APP (5 pages): (1) Intro. (2) Investigation — add clues (each is remembered into Cognee),",
  "click 'Ask the Wolfpack' so 4 AI personalities reason over Cognee's GRAPH_COMPLETION, and mark",
  "clues true/false or '🔍 check' to fact-check against memory (green=true, red=false); Pinky walks",
  "the storyline route as clues are confirmed. (3) Access — the reunion video shows the belly code",
  "(8675309); type it in and scan your face; ENTER unlocks when both pass. (4) Success — the dog-show",
  "win. (5) This page — the LIVE Cognee graph (toggle 'Cognee Brain' vs 'Storyline map', switch",
  "datasets like pinky_serbia or mr_chow). If they're stuck, give step-by-step help for their task.",
].join("\n");

const FAQ = [
  [/what.*cognee|about cognee|explain cognee/i, "Cognee is an open-source AI memory layer for agents. You remember() text into a hybrid vector + knowledge graph, then recall() connected facts (its GRAPH_COMPLETION fuses everything into one grounded answer). It grounds entities into an ontology, supports datasets/node_sets, runs on Cognee Cloud or self-hosted, and plugs into agents via MCP — beating plain RAG on long-context memory."],
  [/investigat|add.*clue|ask.*wolfpack|page 2/i, "On the Investigation page: type a clue and hit '+ Remember' (it's stored in Cognee) — it appears as a node under Pinky. Click 'ASK THE WOLFPACK' so the 4 AI minds reason over Cognee's memory. Mark each clue ✓/✗, or '🔍 check' to fact-check it against memory (green=true, red=false). Confirming true clues walks Pinky toward the gym."],
  [/stuck|code|access|8675309|scan|face|page 3|get in/i, "On the Access page: watch the reunion video — Pinky stands up and her belly shows the code 8675309. Type 8675309 into the code box and hit Unlock, then Start camera → Enroll my face → Scan. When both the code and face check out, the 'ENTER THE GYM' button appears."],
  [/graph|brain|schema|dataset|page 5|memory graph/i, "This page shows Cognee's real knowledge graph. Use 'Cognee Brain' for the live Cognee UI or 'Storyline map' for our narrative view, and switch the dataset (e.g. pinky_serbia or mr_chow) to explore different memories. It's the actual memory Cognee built from your clues — not a mockup."],
  [/how.*win|dog show|page 4|success/i, "After you get into the gym (code + face), you reach the Success page and the dog-show win video plays automatically — Pinky takes Best in Show. Then click through to see the Cognee memory graph."],
];
function faqAnswer(q) {
  for (const [re, a] of FAQ) if (re.test(q)) return a;
  return "I'm the Cognee Guide! Cognee is an open-source AI memory layer — remember() stores text into a knowledge graph, recall() answers over it. Try: “What is Cognee?”, “How do I investigate?”, or tell me exactly where you're stuck.";
}
function extractPuter(r) {
  if (!r) return "";
  if (typeof r === "string") return r;
  if (r.message) { const c = r.message.content; if (typeof c === "string") return c; if (Array.isArray(c)) return c.map((x) => x.text || "").join(""); }
  return r.text || String(r);
}
async function askSend(question) {
  if (!question.trim()) return;
  askBubble(question, "me");
  const thinking = askBubble("…", "bot");
  try {
    if (window.puter && puter.ai && puter.ai.chat) {
      const resp = await puter.ai.chat(
        [{ role: "system", content: GUIDE }, { role: "user", content: question }],
        { model: "gpt-4o-mini" }
      );
      thinking.textContent = extractPuter(resp).trim() || faqAnswer(question);
    } else {
      thinking.textContent = faqAnswer(question);
    }
  } catch (e) {
    thinking.textContent = faqAnswer(question);
  }
}

document.getElementById("ask-toggle").addEventListener("click", () => openAsk(true));
document.getElementById("ask-min").addEventListener("click", () => openAsk(false));
document.getElementById("ask-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = document.getElementById("ask-input");
  askSend(input.value);
  input.value = "";
});
document.getElementById("ask-chips").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-q]");
  if (btn) askSend(btn.dataset.q);
});

loadDatasets();
showView("brain");   // default to Cognee Brain first
refreshStatus();
setInterval(refreshStatus, 15000);
