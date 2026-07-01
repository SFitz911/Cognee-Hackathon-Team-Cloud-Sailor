/* Founder cameo — Mr. Chow mode. Plays pre-generated accented audio clips
   (edge-tts, Chinese-accented voice) while the avatar actively "talks" with a
   bob + pulsing ring + sound bars (no lip-sync needed). Falls back to browser
   speech if the clips aren't available. Labelled as an AI parody. */

const CAMEO = { image: "/images/Founder.png", manifest: "/media/audio/chow_manifest.json" };

const CHOW_FALLBACK = [
  "Toodaloo, mother-truckers!",
  "I walk into rooms and gravity applauds.",
  "And that's how you leave a room. You're welcome.",
];

const KIND_CATS = {
  intro: ["Greeting", "Party", "Brag", "Confidence"],
  solved: ["Party", "Confidence", "Exit", "Brag"],
};

let cameoOpen = false;
let cameoShownSolved = false;
let CLIPS = null;

async function loadClips() {
  if (CLIPS) return CLIPS;
  try {
    CLIPS = await fetch(CAMEO.manifest).then((r) => r.json());
  } catch { CLIPS = []; }
  return CLIPS;
}

function pickClips(kind, n) {
  const cats = KIND_CATS[kind];
  let pool = CLIPS.slice();
  if (cats) {
    const filtered = pool.filter((c) => cats.includes(c.category));
    if (filtered.length) pool = filtered;
  }
  pool.sort(() => Math.random() - 0.5);
  // For intro, lead with a Greeting if we have one.
  if (kind === "intro") {
    const g = pool.findIndex((c) => c.category === "Greeting");
    if (g > 0) pool.unshift(pool.splice(g, 1)[0]);
  }
  return pool.slice(0, n);
}

function buildCameoOverlay() {
  const wrap = document.createElement("div");
  wrap.className = "cameo-overlay";
  wrap.innerHTML = `
    <div class="cameo-card">
      <button class="cameo-close" type="button" aria-label="Close">✕</button>
      <span class="cameo-tag">AI CAMEO · MR. CHOW</span>
      <div class="cameo-stage" id="cameo-stage">
        <img class="cameo-face" src="${CAMEO.image}" alt="Cognee founder as Mr. Chow" />
        <div class="cameo-ring"></div>
        <div class="cameo-bars"><i></i><i></i><i></i><i></i><i></i></div>
      </div>
      <div class="cameo-name">THE FOUNDER OF <b>COGNEE</b> · CHOW MODE</div>
      <div class="cameo-subtitle" id="cameo-sub">…</div>
      <button class="cameo-another" id="cameo-another" type="button">🎲 Another one!</button>
    </div>`;
  return wrap;
}

/* Play a sequence of audio clips; animate the avatar while each plays. */
function playClips(clips, stage, sub, audio, onDone) {
  let i = 0;
  const next = () => {
    if (i >= clips.length) { stage.classList.remove("speaking"); return onDone && onDone(); }
    const clip = clips[i++];
    sub.textContent = clip.text;
    audio.src = clip.file;
    audio.play().then(() => stage.classList.add("speaking")).catch(() => next());
  };
  audio.onended = next;
  audio.onerror = next;
  next();
}

/* Browser-speech fallback (no clips available). */
function speakFallback(lines, stage, sub, onDone) {
  const synth = window.speechSynthesis;
  if (!synth) { sub.textContent = lines[0] || ""; return onDone && onDone(); }
  synth.cancel();
  let i = 0;
  const next = () => {
    if (i >= lines.length) { stage.classList.remove("speaking"); return onDone && onDone(); }
    const u = new SpeechSynthesisUtterance(lines[i]);
    sub.textContent = lines[i++];
    u.pitch = 1.4; u.rate = 1.06;
    u.onend = next; u.onerror = next;
    stage.classList.add("speaking");
    synth.speak(u);
  };
  next();
}

async function openCameo(kind = "intro") {
  if (cameoOpen) return;
  cameoOpen = true;
  const overlay = buildCameoOverlay();
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add("show"));

  const stage = overlay.querySelector("#cameo-stage");
  const sub = overlay.querySelector("#cameo-sub");
  const another = overlay.querySelector("#cameo-another");
  const audio = new Audio();

  const close = () => {
    try { audio.pause(); } catch {}
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    overlay.classList.remove("show");
    setTimeout(() => overlay.remove(), 300);
    cameoOpen = false;
  };
  overlay.querySelector(".cameo-close").addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });

  await loadClips();

  const runOne = () => {
    if (CLIPS.length) playClips(pickClips("any", 1), stage, sub, audio);
    else speakFallback([CHOW_FALLBACK[Math.floor(Math.random() * CHOW_FALLBACK.length)]], stage, sub);
  };
  another.addEventListener("click", () => { try { audio.pause(); } catch {} runOne(); });

  if (CLIPS.length) {
    playClips(pickClips(kind, 3), stage, sub, audio);
  } else {
    speakFallback(CHOW_FALLBACK, stage, sub);
  }
}

// warm up voices for the fallback path
if (window.speechSynthesis) window.speechSynthesis.getVoices();

document.addEventListener("click", (e) => {
  if (e.target.closest("#cameo-btn")) openCameo("intro");
});
