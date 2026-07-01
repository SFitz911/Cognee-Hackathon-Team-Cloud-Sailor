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
/* Built-in Cognee guide — a keyword-matched help assistant. No external AI, no
   login, no cost, works on every device (including iPhone). Answers the common
   "what is Cognee?" and "I'm stuck" questions. */
const FAQ = [
  [/what.*cognee|about cognee|explain cognee|cognee\?|is cognee/i,
    "Cognee is an open-source AI memory layer for agents. You remember() text and it cognifies it into a HYBRID vector + knowledge graph; then recall() returns connected facts — its GRAPH_COMPLETION fuses everything into one grounded answer. It grounds entities into an ontology, supports datasets & node_sets, runs on Cognee Cloud or self-hosted, and plugs into agents via MCP — beating plain RAG on long-context memory."],
  [/remember|recall|how.*(work|memory)|graph_completion|cognify|vector|ontology/i,
    "Cognee's core is simple: remember(text) ingests + cognifies it into a knowledge graph, and recall(query) answers over it. GRAPH_COMPLETION walks the graph to fuse all related facts into one grounded answer (why it beats plain RAG). It also grounds entities into an ontology and stores hybrid vector + graph memory. In this app, every clue you add is remembered, and the 4 personas reason over recall()."],
  [/investigat|add.*clue|\+ remember|wolfpack|page ?2|detective|clue/i,
    "Investigation page: type a clue and hit '+ Remember' (stored in Cognee) — it appears as a node under Pinky. Click 'ASK THE WOLFPACK' so 4 AI minds reason over Cognee's memory. Mark clues ✓/✗ or '🔍 check' to fact-check them against memory (green=true, red=false). Or just hit '🕵️ AUTO DETECTIVE' to solve the whole case automatically and walk Pinky to the gym."],
  [/stuck|code|8675309|access|scan|face|enter the gym|page ?3|get in|locker/i,
    "Access page: watch the reunion video — Pinky stands up and her belly shows the code 8675309. Type 8675309 in the code box → Unlock. Then Start camera → Enroll my face → Scan. When BOTH the code ✓ and face ✓ pass, the 'ENTER THE GYM' button appears. (You can also use the Back/Next buttons to move around.)"],
  [/graph|brain|schema|dataset|page ?5|memory graph|explore/i,
    "This page is Cognee's real knowledge graph. Toggle 'Cognee Brain' (the live Cognee UI) vs 'Storyline map' (our narrative), and switch the dataset (pinky_serbia or mr_chow) to explore different memories. It's the actual memory Cognee built from the clues — not a mockup."],
  [/win|dog show|best in show|page ?4|success|prize/i,
    "After you enter the gym (code + face), the Success page plays the dog-show video — Pinky takes Best in Show, and a 'YOU'RE THE WINNER' banner appears at the end. Then continue to see the Cognee memory graph that made it possible."],
  [/model|open.?source|tech|built with|deepface|flux|fal|edge.?tts|which ai/i,
    "Tech used: Cognee Cloud (memory graph), Claude Opus 4.x (the 4 personas + fact-check), DeepFace (face ID), FLUX.1-schnell + Omni-Video-Factory (Hugging Face Spaces, free), fal.ai sync-lipsync (founder lip-sync), edge-tts (accented voice), FastAPI + vis-network, deployed on Render. We leaned on free/open tools wherever possible."],
  [/chow|founder|cameo|mr.?chow|voice/i,
    "The 🎬 Founder button plays a cameo of the Cognee founder in 'Mr. Chow mode' — real lip-synced videos (fal.ai) with an accented voice. His one-liners come from the mr_chow dataset, which we also ingested into Cognee as its own memory graph (switch the dataset picker to see it)."],
  [/story|what is this|hangover|pinky|plot|about (the )?app/i,
    "The story: four friends wake up in Berlin with no memory of last night, their dog Pinky is gone, and the code to a locker at a gym in Serbia is tattooed on her belly. Using Cognee's memory, you reconstruct the night, recover Pinky, crack the code, get in, and win the dog show. The hangover = lost context; Cognee = the memory that survived."],
  [/mcp|integrat|self.?host|cloud|deploy/i,
    "Cognee runs on Cognee Cloud (managed) or self-hosted, and connects to agents over MCP (Claude Code, Cursor, VS Code, n8n, etc.) — 'one memory, many agents.' This app talks to Cognee Cloud via remember/recall and embeds Cognee's own visualize graph on this page."],
];
function faqAnswer(q) {
  for (const [re, a] of FAQ) if (re.test(q)) return a;
  return "I'm the Cognee Guide. Cognee is an open-source AI memory layer — remember() stores text into a knowledge graph and recall() answers over it. Try a chip below, or ask: “What is Cognee?”, “How does remember/recall work?”, “How do I investigate?”, or tell me exactly where you're stuck.";
}
async function askSend(question) {
  if (!question.trim()) return;
  askBubble(question, "me");
  const thinking = askBubble("…", "bot");
  await new Promise((r) => setTimeout(r, 350));   // tiny delay so it reads like a reply
  thinking.textContent = faqAnswer(question);
}

document.getElementById("ask-toggle").addEventListener("click", () => openAsk(true));
document.getElementById("ask-btn-top").addEventListener("click", () => openAsk(true));
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
