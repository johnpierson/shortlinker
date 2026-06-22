const form = document.getElementById("link-form");
const statusMessage = document.getElementById("form-status");
const linkList = document.getElementById("admin-link-list");
const linkCount = document.getElementById("link-count");

function setStatus(message, type = "") { statusMessage.textContent = message; statusMessage.className = `form-status ${type}`; }
function escapeHtml(value) { return value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]); }

async function request(path, options) {
  const response = await fetch(path, options);
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error || `Request failed (${response.status}).`);
  return body;
}

async function loadLinks() {
  try {
    const links = await request("/api/admin/links");
    linkCount.textContent = `${links.length} ${links.length === 1 ? "link" : "links"}`;
    linkList.innerHTML = links.map(link => `<article class="admin-link-row"><div><strong>${escapeHtml(link.label)}</strong><span>jtp.fyi/${escapeHtml(link.slug)} → ${escapeHtml(link.url)}</span></div></article>`).join("");
  } catch (error) { setStatus(error.message, "error"); }
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  const button = form.querySelector("button");
  const values = new FormData(form);
  button.disabled = true;
  setStatus("Saving link…");
  try {
    await request("/api/admin/links", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: String(values.get("slug") || "").trim(), url: String(values.get("destination") || "").trim(), label: String(values.get("label") || "").trim() }) });
    form.reset(); setStatus("Link saved.", "success"); await loadLinks();
  } catch (error) { setStatus(error.message, "error"); }
  finally { button.disabled = false; }
});

loadLinks();
