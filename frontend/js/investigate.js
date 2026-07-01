/* Page 2 — investigation (Pinky + the wolfpack). Clues -> Cognee memory, the
   four personas, and a live "discovery map": connections start dim and light up
   (pulsing green, then steady) as the matching clue lands. False leads light red. */

const PERSONA_META = {
  planner:  { emoji: "🧭", arche: "the planner" },
  wildcard: { emoji: "🎲", arche: "the wildcard" },
  worrier:  { emoji: "😰", arche: "the worrier" },
  optimist: { emoji: "🌅", arche: "the optimist" },
};

const C = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

/* ============================ CLUES ============================ */
// Every clue is a real, dynamic node under Pinky — nothing is hard-coded.
// State drives its colour: pending (amber) -> true (green) / false (red).
const clues = [];
let clueSeq = 0;

function renderClues() {
  $("#clue-count").textContent = clues.length;
  const ul = $("#clue-list");
  ul.innerHTML = "";
  for (const c of clues.slice().reverse()) {
    const li = document.createElement("li");
    li.className = `${c.node_set} verdict-${c.verdict}`;
    li.innerHTML = `
      <span class="tag">${c.node_set} · ${c.state}${c.verdict !== "pending" ? " · " + c.verdict.toUpperCase() : ""}</span>
      <span class="clue-body">${escapeHtml(c.text)}</span>
      ${c.reason ? `<span class="clue-reason">↳ ${escapeHtml(c.reason)}</span>` : ""}
      <span class="clue-actions">
        <button class="mini ok"  data-cid="${c.cid}" data-act="true"  title="Mark true">✓ true</button>
        <button class="mini bad" data-cid="${c.cid}" data-act="false" title="Mark false">✗ false</button>
        <button class="mini chk" data-cid="${c.cid}" data-act="check" title="Fact-check against Cognee memory">🔍 check</button>
      </span>`;
    ul.appendChild(li);
  }
}

async function addClue(text, node_set) {
  text = text.trim();
  if (!text) return;
  const clue = {
    cid: ++clueSeq, text, node_set,
    state: "remembering…", verdict: "pending", reason: "", nodeId: null,
  };
  clues.push(clue);
  addClueNode(clue);          // appears under Pinky immediately
  renderClues();
  updateStorylineCounts();    // tally clues per storyline step
  try {
    const res = await api("/clues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, node_set, wait: true }),
    });
    clue.state = res.queryable ? "in memory" : (res.cognify || "accepted");
  } catch (e) {
    clue.state = "error";
  }
  renderClues();
}

function clueByCid(cid) {
  return clues.find((c) => String(c.cid) === String(cid));
}

/* Mark a clue true/false manually, or fact-check it against Cognee memory. */
function setVerdict(clue, verdict, reason) {
  clue.verdict = verdict;
  if (reason !== undefined) clue.reason = reason;
  styleClueNode(clue);
  renderClues();
}

async function checkClue(clue) {
  setVerdict(clue, "checking", "Fact-checking against the case memory…");
  try {
    const r = await api("/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: clue.text }),
    });
    if (r.detail) return setVerdict(clue, "pending", `check failed: ${r.detail}`);
    const v = ["true", "false", "unknown"].includes(r.verdict) ? r.verdict : "unknown";
    setVerdict(clue, v, r.reason || "");
  } catch (e) {
    setVerdict(clue, "pending", `check error: ${e}`);
  }
}

/* ====================== DYNAMIC GRAPH (Pinky + clue nodes) ====================== */
const LIT = "#22c55e";
const PINKY = "pinky";
let gnodes, gedges, net;
const pulseSet = new Set();      // node ids currently pulsing (pending)
const STATE_COLORS = {
  pending:  { bg: "#241f10", border: "#f59e0b", font: "#f4d39a", glow: "rgba(245,158,11,0.55)" },
  checking: { bg: "#241f10", border: "#f59e0b", font: "#f4d39a", glow: "rgba(245,158,11,0.7)" },
  true:     { bg: "#10241a", border: LIT,       font: "#dff6e8", glow: "rgba(34,197,94,0.6)" },
  false:    { bg: "#241016", border: "#ef4444", font: "#f2b8b8", glow: "rgba(239,68,68,0.6)" },
  unknown:  { bg: "#141320", border: "#38e1d6", font: "#bdeee9", glow: "rgba(56,225,214,0.5)" },
};

function shorten(s, n) { return s.length > n ? s.slice(0, n - 1) + "…" : s; }

/* The fixed storyline ROUTE (drawn in light gray). Pinky travels along it. */
const ROUTE = [
  { id: "r_apt", label: "Apartment\n(Berlin)",             x: -390, y: 120 },
  { id: "r_bar", label: "Zum Rosa Hund\n(bar · Berlin)",   x: -195, y: -70 },
  { id: "r_ink", label: "Berlin Ink\n(tattoo parlor)",     x: 5,    y: 100 },
  { id: "r_bus", label: "FlixBus\nBerlin → Novi Sad",      x: 200,  y: -70 },
  { id: "r_gym", label: "Karlovci Gymnasium\nLocker 7 · Serbia", x: 400, y: 110 },
];
const ROUTE_PTS = ROUTE.map((r) => ({ x: r.x, y: r.y }));
let pinkyPos = { x: ROUTE[0].x, y: ROUTE[0].y - 55 };
let routeProgress = 0; // eased 0..1 position along the route

/* ---- Storyline sidebar stepper (green reached · pink now · yellow to-do) ---- */
const STEP_META = [
  { id: "r_apt", name: "The Apartment", sub: "Berlin · they wake up", kw: /apartment|woke|trashed|hungover/i },
  { id: "r_bar", name: "Zum Rosa Hund", sub: "the bar", kw: /bar|rosa hund|receipt|beer|jager|photo|flyer|dog show/i },
  { id: "r_ink", name: "Berlin Ink", sub: "the tattoo parlor", kw: /tattoo|ink|belly/i },
  { id: "r_bus", name: "FlixBus to Serbia", sub: "Berlin → Novi Sad", kw: /flixbus|\bbus\b|novi sad|serbia|u-?bahn|\bu1\b/i },
  { id: "r_gym", name: "Karlovci Gymnasium", sub: "Locker 7 · the goal", kw: /gym|gymnasium|karlovci|gimnazija|locker|markus|sporthalle|code/i, goal: true },
];
let lastPassed = -1;

function renderStoryline() {
  const ol = $("#storyline-steps");
  if (!ol) return;
  ol.innerHTML = "";
  STEP_META.forEach((s, i) => {
    const li = document.createElement("li");
    li.className = "step upcoming" + (s.goal ? " goal" : "");
    li.dataset.idx = i;
    li.innerHTML = `
      <span class="step-marker">${s.goal ? "🏁" : i + 1}</span>
      <span class="step-body">
        <span class="step-name">${s.name}</span>
        <span class="step-sub">${s.sub}</span>
      </span>
      <span class="step-count" title="clues found here">0</span>`;
    ol.appendChild(li);
  });
  updateStorylineCounts();
  updateStorylineStates(0);
}

function updateStorylineCounts() {
  const ol = $("#storyline-steps");
  if (!ol) return;
  STEP_META.forEach((s, i) => {
    const n = clues.filter((c) => s.kw.test(c.text)).length;
    const el = ol.querySelector(`.step[data-idx="${i}"] .step-count`);
    if (el) { el.textContent = n; el.classList.toggle("has", n > 0); }
  });
}

function updateStorylineStates(passedIndex) {
  const ol = $("#storyline-steps");
  if (!ol) return;
  ol.querySelectorAll(".step").forEach((li) => {
    const i = Number(li.dataset.idx);
    li.classList.remove("done", "current", "upcoming");
    li.classList.add(i < passedIndex ? "done" : i === passedIndex ? "current" : "upcoming");
  });
}

function buildGraph() {
  const el = $("#graph");
  if (!window.vis || !el) return;

  const nodes = ROUTE.map((r) => ({
    id: r.id, label: r.label, x: r.x, y: r.y, fixed: true, physics: false,
    shape: "dot", size: 13,
    color: { background: "#15131b", border: "#4a4658" },
    font: { color: "#8b8598", size: 11, face: "Inter" },
  }));
  nodes.push({
    id: PINKY, label: "PINKY", shape: "dot", size: 14, physics: false,
    x: pinkyPos.x, y: pinkyPos.y,
    color: { background: "#3a1020", border: C("--magenta") },
    font: { color: "#fff", size: 12, face: "Inter", vadjust: -2 }, borderWidth: 2,
    shadow: { enabled: true, color: "rgba(255,61,139,0.6)", size: 16 },
  });
  gnodes = new vis.DataSet(nodes);

  // Light-gray route edges connecting the waypoints in story order.
  const routeEdges = [];
  for (let i = 0; i < ROUTE.length - 1; i++) {
    routeEdges.push({ id: "route" + i, from: ROUTE[i].id, to: ROUTE[i + 1].id,
      color: { color: "rgba(150,146,165,0.35)" }, width: 2, dashes: [6, 6],
      arrows: { to: { enabled: true, scaleFactor: 0.4 } }, smooth: false, physics: false });
  }
  gedges = new vis.DataSet(routeEdges);

  net = new vis.Network(el, { nodes: gnodes, edges: gedges }, {
    physics: false,
    interaction: { hover: true, dragView: true, zoomView: true },
  });
  net.fit({ animation: false });
  renderStoryline();
  requestAnimationFrame(travelTick);
}

function addClueNode(clue) {
  if (!gnodes) return;
  const nid = "n" + clue.cid;
  clue.nodeId = nid;
  gnodes.add({ id: nid, label: shorten(clue.text, 34), title: clue.text,
    x: pinkyPos.x, y: pinkyPos.y, physics: false,
    shape: "dot", size: 15, font: { size: 11, face: "Inter" } });
  gedges.add({ id: "e" + clue.cid, from: PINKY, to: nid,
    smooth: { type: "continuous" }, physics: false,
    arrows: { to: { enabled: true, scaleFactor: 0.45 } } });
  styleClueNode(clue);
}

/* Point at parameter t (0..1) along the route polyline. */
function pointAlong(pts, t) {
  const segs = [];
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const d = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
    segs.push(d); total += d;
  }
  let dist = Math.max(0, Math.min(1, t)) * total;
  for (let i = 0; i < segs.length; i++) {
    if (dist <= segs[i] || i === segs.length - 1) {
      const f = segs[i] ? dist / segs[i] : 0;
      return { x: pts[i].x + (pts[i + 1].x - pts[i].x) * f,
               y: pts[i].y + (pts[i + 1].y - pts[i].y) * f };
    }
    dist -= segs[i];
  }
  return { ...pts[pts.length - 1] };
}

function styleClueNode(clue) {
  if (!gnodes || !clue.nodeId) return;
  const s = STATE_COLORS[clue.verdict] || STATE_COLORS.pending;
  const lit = clue.verdict === "true" || clue.verdict === "false";
  // Node colour carries the verdict (amber pending / green true / red false).
  gnodes.update({ id: clue.nodeId,
    color: { background: s.bg, border: s.border },
    font: { color: s.font, size: 11, face: "Inter" },
    borderWidth: lit ? 3 : 2,
    shadow: { enabled: true, color: s.glow, size: lit ? 18 : 12 } });
  // The PATH from Pinky is always her signature pink — a visible pink thread to
  // every storyline node. Solid + glowing when confirmed true, faded for false,
  // gently dashed while still unverified.
  const PINK = C("--magenta") || "#ff3d8b";
  const isTrue = clue.verdict === "true";
  const isFalse = clue.verdict === "false";
  gedges.update({ id: "e" + clue.cid,
    color: { color: PINK, highlight: PINK, opacity: isFalse ? 0.4 : (isTrue ? 1 : 0.7) },
    dashes: isFalse ? [4, 4] : (isTrue ? false : [2, 6]),
    width: isTrue ? 3.2 : 1.8,
    shadow: { enabled: isTrue, color: "rgba(255,61,139,0.7)", size: 14 } });
  // pending/checking nodes pulse; resolved ones stop.
  if (clue.verdict === "pending" || clue.verdict === "checking") pulseSet.add(clue.nodeId);
  else pulseSet.delete(clue.nodeId);
}

/* Pinky + her clue cluster glide along the gray route. Progress advances toward
   the gym as clues are confirmed true (each confirmed clue walks her closer). */
function travelTick() {
  if (gnodes && net) {
    const now = performance.now();
    const trueCount = clues.filter((c) => c.verdict === "true").length;
    const target = Math.min(1, trueCount / Math.max(1, ROUTE.length - 1));
    routeProgress += (target - routeProgress) * 0.04; // ease toward target

    // Update the storyline stepper when Pinky crosses into a new waypoint.
    const passed = Math.round(routeProgress * (ROUTE.length - 1));
    if (passed !== lastPassed) { lastPassed = passed; updateStorylineStates(passed); }

    // Case solved — Pinky reaches the gymnasium: founder cameo (once).
    if (routeProgress > 0.985 && !cameoShownSolved && typeof openCameo === "function") {
      cameoShownSolved = true;
      openCameo("solved");
    }

    const onRoute = pointAlong(ROUTE_PTS, routeProgress);
    const bob = Math.sin(now / 600) * 6;
    pinkyPos.x += (onRoute.x - pinkyPos.x) * 0.06;
    pinkyPos.y += (onRoute.y - 55 + bob - pinkyPos.y) * 0.06;
    net.moveNode(PINKY, pinkyPos.x, pinkyPos.y);

    // Her clue nodes orbit her and travel with her.
    const withNode = clues.filter((c) => c.nodeId);
    const n = withNode.length;
    const spin = now / 3200;
    withNode.forEach((c, i) => {
      const ang = (i / Math.max(1, n)) * Math.PI * 2 + spin;
      const r = 62 + (i % 2) * 16;
      net.moveNode(c.nodeId, pinkyPos.x + Math.cos(ang) * r, pinkyPos.y + Math.sin(ang) * r);
    });

    // amber pulse for unverified clue nodes
    if (pulseSet.size) {
      const phase = (Math.sin(now / 180) + 1) / 2;
      const updates = [];
      for (const id of pulseSet) {
        updates.push({ id, borderWidth: 2 + phase * 2,
          shadow: { enabled: true, color: "rgba(245,158,11,0.7)", size: 10 + phase * 18 } });
      }
      gnodes.update(updates);
    }
  }
  requestAnimationFrame(travelTick);
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
  if (net) net.fit({ animation: { duration: 600 } });
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

// Toggle: our storyline map  <->  Cognee's real knowledge graph (live memory).
let brainLoaded = false;
function showView(which) {
  const brain = which === "brain";
  $("#tab-brain").classList.toggle("active", brain);
  $("#tab-map").classList.toggle("active", !brain);
  $("#brain-frame").classList.toggle("hidden", !brain);
  $("#graph").classList.toggle("hidden", brain);
  $("#graph-legend").classList.toggle("hidden", brain);
  $("#graph-caption").textContent = brain
    ? "COGNEE BRAIN — the actual knowledge graph Cognee built from these clues (not a mockup)"
    : "THE NIGHT, MAPPED — Pinky walks the storyline route; each clue she confirms (green) carries her closer to the gym";
  if (brain && !brainLoaded) { $("#brain-frame").src = "/cognee/graph"; brainLoaded = true; }
}
$("#tab-map").addEventListener("click", () => showView("map"));
$("#tab-brain").addEventListener("click", () => showView("brain"));

// Delegated clue actions: ✓ true · ✗ false · 🔍 check (Cognee fact-check).
$("#clue-list").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-cid]");
  if (!btn) return;
  const clue = clueByCid(btn.dataset.cid);
  if (!clue) return;
  if (btn.dataset.act === "true") setVerdict(clue, "true", "Marked true by investigator.");
  else if (btn.dataset.act === "false") setVerdict(clue, "false", "Marked false by investigator.");
  else if (btn.dataset.act === "check") checkClue(clue);
});

buildGraph();
refreshStatus();
setInterval(refreshStatus, 15000);
