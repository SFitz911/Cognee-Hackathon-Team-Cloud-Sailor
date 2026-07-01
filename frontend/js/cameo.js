/* Founder cameo — a playful AI "video card" of the Cognee founder.
   Plays a generated MP4 if one exists at CAMEO.clip; otherwise falls back to an
   animated portrait + open-source browser speech (Web Speech API) + subtitles.
   Clearly labelled as an AI parody. */

const CAMEO = {
  clip: "/media/clips/founder_cameo.mp4",
  image: "/images/Founder.png",
  scripts: {
    intro: [
      "Hey Wolfpack — founder of Cognee here.",
      "You lost the dog, but the memory? The memory never forgets.",
      "Feed me the clues. Let the graph do the thinking. Now go find Pinky!",
    ],
    solved: [
      "You did it! Every clue, connected — that's what memory is for.",
      "Pinky's at the gymnasium, the code's on her belly. Case closed.",
      "Graph memory beats forgetting. Ship it!",
    ],
  },
};

let cameoOpen = false;
let cameoShownSolved = false;

function buildCameoOverlay() {
  const wrap = document.createElement("div");
  wrap.className = "cameo-overlay";
  wrap.innerHTML = `
    <div class="cameo-card">
      <button class="cameo-close" type="button" aria-label="Close">✕</button>
      <span class="cameo-tag">AI CAMEO · PARODY</span>
      <div class="cameo-stage">
        <video class="cameo-video hidden" playsinline></video>
        <img class="cameo-face" src="${CAMEO.image}" alt="Cognee founder" />
        <div class="cameo-scan"></div>
      </div>
      <div class="cameo-name">THE FOUNDER OF <b>COGNEE</b></div>
      <div class="cameo-subtitle" id="cameo-sub">…</div>
    </div>`;
  return wrap;
}

function speakLines(lines, subEl, onDone) {
  const synth = window.speechSynthesis;
  if (!synth) { // no TTS — just show subtitles on a timer
    let i = 0;
    const tick = () => {
      if (i >= lines.length) return onDone && onDone();
      subEl.textContent = lines[i++];
      setTimeout(tick, 2600);
    };
    tick();
    return;
  }
  synth.cancel();
  const voices = synth.getVoices();
  const pick = voices.find((v) => /male|daniel|david|google uk english male/i.test(v.name))
    || voices.find((v) => /en/i.test(v.lang)) || voices[0];
  let i = 0;
  const next = () => {
    if (i >= lines.length) return onDone && onDone();
    const line = lines[i++];
    subEl.textContent = line;
    const u = new SpeechSynthesisUtterance(line);
    if (pick) u.voice = pick;
    u.rate = 1.02; u.pitch = 0.95;
    u.onend = next;
    u.onerror = next;
    synth.speak(u);
  };
  next();
}

function openCameo(kind = "intro") {
  if (cameoOpen) return;
  cameoOpen = true;
  const lines = CAMEO.scripts[kind] || CAMEO.scripts.intro;
  const overlay = buildCameoOverlay();
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add("show"));

  const sub = overlay.querySelector("#cameo-sub");
  const video = overlay.querySelector(".cameo-video");
  const face = overlay.querySelector(".cameo-face");

  const close = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    try { video.pause(); } catch {}
    overlay.classList.remove("show");
    setTimeout(() => overlay.remove(), 300);
    cameoOpen = false;
  };
  overlay.querySelector(".cameo-close").addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });

  // Prefer a generated MP4 if it exists; otherwise animated portrait + TTS.
  let usedVideo = false;
  video.src = CAMEO.clip;
  video.onloadeddata = () => {
    usedVideo = true;
    video.classList.remove("hidden");
    face.classList.add("hidden");
    sub.textContent = "(generated cameo)";
    video.play().catch(() => {});
    video.onended = close;
  };
  video.onerror = () => {
    if (usedVideo) return;
    speakLines(lines, sub, () => setTimeout(close, 1200));
  };
  // Safety: if the video never loads/fires within 1.2s, go to TTS.
  setTimeout(() => { if (!usedVideo) { video.onerror = null; speakLines(lines, sub, () => setTimeout(close, 1200)); } }, 1200);
}

// warm up voices (some browsers load them async)
if (window.speechSynthesis) window.speechSynthesis.getVoices();

// Topbar trigger
document.addEventListener("click", (e) => {
  if (e.target.closest("#cameo-btn")) openCameo("intro");
});
