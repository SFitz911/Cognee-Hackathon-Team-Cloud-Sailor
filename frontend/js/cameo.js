/* Founder cameo — Mr. Chow mode. A playful AI "video card" that delivers random
   Mr. Chow one-liners (pulled from the dataset via /cameo/lines) in a flamboyant
   Chow voice. Plays a generated MP4 if present, else animated portrait + speech.
   Clearly labelled as an AI parody. */

const CAMEO = { clip: "/media/clips/founder_cameo.mp4", image: "/images/Founder.png" };

// Used only if the backend / dataset is unreachable.
const CHOW_FALLBACK = [
  "Toodaloo, mother-truckers!",
  "I walk into rooms and gravity applauds.",
  "If you can remember the party, Chow wasn't there.",
  "I don't have an ego. I have facts about myself.",
  "And that's how you leave a room. You're welcome.",
];

let cameoOpen = false;
let cameoShownSolved = false;

async function fetchChow(kind = "any", n = 1) {
  try {
    const r = await fetch(`/cameo/lines?kind=${kind}&n=${n}`).then((x) => x.json());
    if (r.lines && r.lines.length) return r.lines;
  } catch { /* ignore */ }
  const pool = [...CHOW_FALLBACK].sort(() => Math.random() - 0.5);
  return pool.slice(0, n);
}

function chowSpeak(lines, subEl, onDone) {
  const synth = window.speechSynthesis;
  if (!synth) {
    let i = 0;
    const tick = () => { if (i >= lines.length) return onDone && onDone(); subEl.textContent = lines[i++]; setTimeout(tick, 2600); };
    tick();
    return;
  }
  synth.cancel();
  const voices = synth.getVoices();
  const pick = voices.find((v) => /male|daniel|david|fred|rishi|google (uk|us) english/i.test(v.name))
    || voices.find((v) => /en/i.test(v.lang)) || voices[0];
  let i = 0;
  const next = () => {
    if (i >= lines.length) return onDone && onDone();
    const line = lines[i++];
    subEl.textContent = line;
    const u = new SpeechSynthesisUtterance(line);
    if (pick) u.voice = pick;
    u.pitch = 1.4;   // Chow: high & flamboyant
    u.rate = 1.08;   // a little fast
    u.onend = next;
    u.onerror = next;
    synth.speak(u);
  };
  next();
}

function buildCameoOverlay() {
  const wrap = document.createElement("div");
  wrap.className = "cameo-overlay";
  wrap.innerHTML = `
    <div class="cameo-card">
      <button class="cameo-close" type="button" aria-label="Close">✕</button>
      <span class="cameo-tag">AI CAMEO · MR. CHOW</span>
      <div class="cameo-stage">
        <video class="cameo-video hidden" playsinline></video>
        <img class="cameo-face" src="${CAMEO.image}" alt="Cognee founder as Mr. Chow" />
        <div class="cameo-scan"></div>
      </div>
      <div class="cameo-name">THE FOUNDER OF <b>COGNEE</b> · CHOW MODE</div>
      <div class="cameo-subtitle" id="cameo-sub">…</div>
      <button class="cameo-another" id="cameo-another" type="button">🎲 Another one!</button>
    </div>`;
  return wrap;
}

async function openCameo(kind = "intro") {
  if (cameoOpen) return;
  cameoOpen = true;
  const overlay = buildCameoOverlay();
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add("show"));

  const sub = overlay.querySelector("#cameo-sub");
  const video = overlay.querySelector(".cameo-video");
  const face = overlay.querySelector(".cameo-face");
  const another = overlay.querySelector("#cameo-another");

  const close = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    try { video.pause(); } catch {}
    overlay.classList.remove("show");
    setTimeout(() => overlay.remove(), 300);
    cameoOpen = false;
  };
  overlay.querySelector(".cameo-close").addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });

  // "Another one!" — one fresh random Chow line, spoken immediately.
  another.addEventListener("click", async () => {
    another.disabled = true;
    const lines = await fetchChow("any", 1);
    chowSpeak(lines, sub, () => { another.disabled = false; });
    setTimeout(() => (another.disabled = false), 4000);
  });

  const lines = await fetchChow(kind, 3);

  // Prefer a generated MP4 if it exists; otherwise animated portrait + Chow voice.
  let usedVideo = false;
  let narrated = false;
  const narrate = () => {
    if (narrated || usedVideo) return;
    narrated = true;
    chowSpeak(lines, sub);
  };
  video.src = CAMEO.clip;
  video.onloadeddata = () => {
    usedVideo = true;
    video.classList.remove("hidden");
    face.classList.add("hidden");
    sub.textContent = "(generated cameo)";
    video.play().catch(() => {});
    video.onended = () => chowSpeak(lines, sub);
  };
  video.onerror = narrate;
  setTimeout(narrate, 1200);
}

// warm up voices (some browsers load them async)
if (window.speechSynthesis) window.speechSynthesis.getVoices();

// Topbar trigger
document.addEventListener("click", (e) => {
  if (e.target.closest("#cameo-btn")) openCameo("intro");
});
