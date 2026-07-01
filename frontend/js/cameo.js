/* Founder cameo — Mr. Chow mode. Plays a pre-generated talking VIDEO of the
   founder (muted, looped) while accented Chow audio (edge-tts) narrates over it.
   A pool of videos means no wait; after the 2nd open we kick off a background
   generation to grow the pool and hide latency. Labelled as an AI parody. */

const CAMEO = {
  image: "/images/Founder.png",
  manifest: "/media/audio/chow_manifest.json",
  videosUrl: "/cameo/videos",
  generateUrl: "/cameo/videos/generate",
};

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
let lastVideo = null;
let openCount = 0;

async function loadClips() {
  if (CLIPS) return CLIPS;
  try { CLIPS = await fetch(CAMEO.manifest).then((r) => r.json()); } catch { CLIPS = []; }
  return CLIPS;
}
async function loadVideos() {
  try { return (await fetch(CAMEO.videosUrl).then((r) => r.json())).videos || []; }
  catch { return []; }
}
function pickVideo(list) {
  if (!list.length) return null;
  let v;
  do { v = list[Math.floor(Math.random() * list.length)]; } while (list.length > 1 && v === lastVideo);
  lastVideo = v;
  return v;
}

function pickClips(kind, n) {
  const cats = KIND_CATS[kind];
  let pool = CLIPS.slice();
  if (cats) { const f = pool.filter((c) => cats.includes(c.category)); if (f.length) pool = f; }
  pool.sort(() => Math.random() - 0.5);
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
        <video class="cameo-loop hidden" muted loop playsinline></video>
        <img class="cameo-face" src="${CAMEO.image}" alt="Cognee founder as Mr. Chow" />
        <div class="cameo-ring"></div>
        <div class="cameo-bars"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
      </div>
      <div class="cameo-name">THE FOUNDER OF <b>COGNEE</b> · CHOW MODE</div>
      <div class="cameo-subtitle" id="cameo-sub">…</div>
      <button class="cameo-another" id="cameo-another" type="button">🎲 Another one!</button>
    </div>`;
  return wrap;
}

/* Web Audio amplitude → drives the sound bars (and the photo fallback's jaw). */
function makeAnalyser(audio) {
  try {
    const AC = new (window.AudioContext || window.webkitAudioContext)();
    const src = AC.createMediaElementSource(audio);
    const an = AC.createAnalyser(); an.fftSize = 256;
    src.connect(an); an.connect(AC.destination);
    const buf = new Uint8Array(an.frequencyBinCount);
    return {
      resume: () => AC.resume(),
      level: () => {
        an.getByteTimeDomainData(buf);
        let s = 0; for (const v of buf) { const d = (v - 128) / 128; s += d * d; }
        return Math.min(1, Math.sqrt(s / buf.length) * 3.2);
      },
    };
  } catch { return null; }
}
function driveMotion(stage, analyser) {
  const bars = [...stage.querySelectorAll(".cameo-bars i")];
  let raf;
  const tick = () => {
    const lvl = analyser ? analyser.level() : 0.3 + Math.random() * 0.3;
    stage.style.setProperty("--talk", lvl.toFixed(3));
    bars.forEach((b, i) => {
      const j = 0.6 + 0.8 * Math.abs(Math.sin(Date.now() / 90 + i));
      b.style.height = Math.max(6, lvl * 26 * j).toFixed(0) + "px";
    });
    raf = requestAnimationFrame(tick);
  };
  tick();
  return () => cancelAnimationFrame(raf);
}

async function openCameo(kind = "intro") {
  if (cameoOpen) return;
  cameoOpen = true;
  openCount += 1;
  const overlay = buildCameoOverlay();
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add("show"));

  const stage = overlay.querySelector("#cameo-stage");
  const sub = overlay.querySelector("#cameo-sub");
  const another = overlay.querySelector("#cameo-another");
  const loopVid = overlay.querySelector(".cameo-loop");
  const face = overlay.querySelector(".cameo-face");
  const audio = new Audio();
  audio.crossOrigin = "anonymous";
  const analyser = makeAnalyser(audio);
  let stopMotion = null;

  const startSpeaking = () => { stage.classList.add("speaking"); if (analyser) analyser.resume(); if (!stopMotion) stopMotion = driveMotion(stage, analyser); };
  const stopSpeaking = () => { stage.classList.remove("speaking"); if (stopMotion) { stopMotion(); stopMotion = null; } stage.style.setProperty("--talk", 0); };
  const close = () => {
    try { audio.pause(); loopVid.pause(); } catch {}
    stopSpeaking();
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    overlay.classList.remove("show");
    setTimeout(() => overlay.remove(), 300);
    cameoOpen = false;
  };
  overlay.querySelector(".cameo-close").addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });

  // Load the talking video pool + audio clips.
  const [videos] = await Promise.all([loadVideos(), loadClips()]);
  const vid = pickVideo(videos);
  if (vid) {
    loopVid.src = vid;
    loopVid.onloadeddata = () => { loopVid.classList.remove("hidden"); face.classList.add("hidden"); loopVid.play().catch(() => {}); };
  }

  function playClips(clips, onDone) {
    let i = 0;
    const next = () => {
      if (i >= clips.length) { stopSpeaking(); return onDone && onDone(); }
      const clip = clips[i++];
      sub.textContent = clip.text;
      audio.src = clip.file;
      audio.play().then(startSpeaking).catch(next);
    };
    audio.onended = next; audio.onerror = next;
    next();
  }
  function speakFallback(lines) {
    const synth = window.speechSynthesis;
    if (!synth) { sub.textContent = lines[0] || ""; return; }
    synth.cancel();
    let i = 0;
    const next = () => {
      if (i >= lines.length) { stopSpeaking(); return; }
      const u = new SpeechSynthesisUtterance(lines[i]); sub.textContent = lines[i++];
      u.pitch = 1.4; u.rate = 1.06; u.onend = next; u.onerror = next;
      startSpeaking(); synth.speak(u);
    };
    next();
  }

  another.addEventListener("click", () => {
    try { audio.pause(); } catch {}
    if (CLIPS.length) playClips(pickClips("any", 1));
    else speakFallback([CHOW_FALLBACK[Math.floor(Math.random() * CHOW_FALLBACK.length)]]);
  });

  if (CLIPS.length) playClips(pickClips(kind, 3));
  else speakFallback(CHOW_FALLBACK);

  // Latency-hiding: from the 2nd open onward, grow the video pool in the background.
  if (openCount >= 2) fetch(CAMEO.generateUrl, { method: "POST" }).catch(() => {});
}

if (window.speechSynthesis) window.speechSynthesis.getVoices();
document.addEventListener("click", (e) => { if (e.target.closest("#cameo-btn")) openCameo("intro"); });
