/* Wolfpack Recall — shared helpers used by every page. */

const $ = (sel) => document.querySelector(sel);
const api = (path, opts) => fetch(path, opts).then((r) => r.json());

function escapeHtml(s) {
  return String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
}
function titleCase(s) {
  return "The " + s.charAt(0).toUpperCase() + s.slice(1);
}

/* Backend health → status pill (no-op on pages without a status element). */
async function refreshStatus() {
  const dot = $("#status-dot");
  const text = $("#status-text");
  if (!dot || !text) return;
  try {
    const h = await api("/health");
    const ok = h.cognee === "ok";
    dot.className = "dot " + (ok ? "ok" : "bad");
    text.textContent = ok
      ? `cognee · ${h.dataset}${h.anthropic_key ? "" : " · no anthropic key"}`
      : `cognee: ${h.cognee}`;
  } catch (e) {
    dot.className = "dot bad";
    text.textContent = "backend offline";
  }
}
