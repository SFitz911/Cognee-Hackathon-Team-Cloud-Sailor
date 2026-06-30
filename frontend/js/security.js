/* Page 3 — facial-recognition security gate (DeepFace backend).
   Flow: start camera -> (enroll your face) -> scan to enter -> unlock the database. */

let stream = null;

async function refreshAuthStatus() {
  const dot = $("#status-dot");
  const text = $("#status-text");
  try {
    const s = await api("/auth/status");
    dot.className = "dot " + (s.available ? "ok" : "bad");
    text.textContent = s.available ? "scanner online" : "scanner loading… (DeepFace)";
    $("#enrolled-info").textContent = s.enrolled?.length
      ? `enrolled: ${s.enrolled.join(", ")}`
      : "enrolled: none yet — enroll a face first";
    return s.available;
  } catch {
    dot.className = "dot bad";
    text.textContent = "backend offline";
    return false;
  }
}

async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
    $("#video").srcObject = stream;
    $("#enroll").disabled = false;
    $("#scan").disabled = false;
    $("#start-cam").textContent = "◉ Camera on";
    $("#start-cam").disabled = true;
  } catch (e) {
    setMsg(`Camera blocked: ${e.message}. Allow camera access and reload.`, "bad");
  }
}

function captureFrame() {
  const v = $("#video");
  const c = $("#canvas");
  if (!v.videoWidth) return null;
  c.width = v.videoWidth;
  c.height = v.videoHeight;
  c.getContext("2d").drawImage(v, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.9);
}

function setMsg(text, kind = "") {
  const el = $("#gate-msg");
  el.textContent = text;
  el.className = kind;
}

function scanning(on) {
  $("#scanner").classList.toggle("scanning", on);
}

function showVerdict(text, ok) {
  const v = $("#verdict");
  v.textContent = text;
  v.className = "scan-verdict show " + (ok ? "ok" : "bad");
  setTimeout(() => { if (!ok) v.classList.remove("show"); }, 2200);
}

async function enrollFace() {
  const img = captureFrame();
  if (!img) return setMsg("Camera not ready yet.", "bad");
  setMsg("Enrolling…");
  scanning(true);
  try {
    const r = await api("/auth/enroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: $("#op-name").value || "operative", image: img }),
    });
    if (r.detail) return setMsg(`Enroll failed: ${r.detail}`, "bad");
    setMsg(`Enrolled as "${r.enrolled.replace(".jpg", "")}". Now scan to enter.`, "ok");
    refreshAuthStatus();
  } catch (e) {
    setMsg(`Enroll error: ${e}`, "bad");
  } finally {
    scanning(false);
  }
}

async function scanToEnter() {
  const img = captureFrame();
  if (!img) return setMsg("Camera not ready yet.", "bad");
  setMsg("Scanning…");
  scanning(true);
  $("#scan").disabled = true;
  try {
    const r = await api("/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: img }),
    });
    if (r.detail) { setMsg(r.detail, "bad"); showVerdict("✗ " + r.detail, false); return; }
    if (r.granted) {
      showVerdict(`✓ ACCESS GRANTED — ${r.identity}`, true);
      setMsg(`Welcome back, ${r.identity}. Opening the database…`, "ok");
      sessionStorage.setItem("wolfpack_access", "granted");
      setTimeout(() => { window.location.href = "/investigate.html"; }, 1500);
    } else {
      showVerdict("✗ ACCESS DENIED", false);
      setMsg(`${r.reason}${r.distance != null ? ` (distance ${r.distance})` : ""}`, "bad");
    }
  } catch (e) {
    setMsg(`Scan error: ${e}`, "bad");
  } finally {
    scanning(false);
    $("#scan").disabled = false;
  }
}

$("#start-cam").addEventListener("click", startCamera);
$("#enroll").addEventListener("click", enrollFace);
$("#scan").addEventListener("click", scanToEnter);

refreshAuthStatus();
setInterval(refreshAuthStatus, 8000);
