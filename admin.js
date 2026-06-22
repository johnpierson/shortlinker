const form = document.getElementById("link-form");
const slugInput = document.getElementById("slug");
const destinationInput = document.getElementById("destination");
const labelInput = document.getElementById("label");
const originalSlugInput = document.getElementById("original-slug");
const cancelEdit = document.getElementById("cancel-edit");
const statusMessage = document.getElementById("form-status");
const linkList = document.getElementById("admin-link-list");
const linkCount = document.getElementById("link-count");
let links = [];

function setStatus(message, type = "") { statusMessage.textContent = message; statusMessage.className = `form-status ${type}`; }
function escapeHtml(value) { return value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]); }

async function request(path, options) {
  const response = await fetch(path, options);
  const body = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error || `Request failed (${response.status}).`);
  return body;
}

function resetForm() {
  form.reset(); originalSlugInput.value = ""; slugInput.disabled = false; cancelEdit.hidden = true;
}

function renderLinks() {
  linkCount.textContent = `${links.length} ${links.length === 1 ? "link" : "links"}`;
  linkList.innerHTML = links.map(link => `<article class="admin-link-row" data-slug="${escapeHtml(link.slug)}"><div><strong>${escapeHtml(link.label)}</strong><span>jtp.fyi/${escapeHtml(link.slug)} → ${escapeHtml(link.url)}</span></div><div class="row-actions"><button type="button" data-action="edit">Edit</button><button type="button" data-action="delete">Delete</button></div></article>`).join("");
}

async function loadLinks() {
  try { links = await request("/api/admin/links"); renderLinks(); }
  catch (error) { setStatus(error.message, "error"); }
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  const button = form.querySelector(".primary-button");
  const values = new FormData(form);
  const editingSlug = originalSlugInput.value;
  button.disabled = true; setStatus(editingSlug ? "Saving changes…" : "Saving link…");
  try {
    await request(editingSlug ? `/api/admin/links/${encodeURIComponent(editingSlug)}` : "/api/admin/links", { method: editingSlug ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: String(values.get("slug") || "").trim(), url: String(values.get("destination") || "").trim(), label: String(values.get("label") || "").trim() }) });
    resetForm(); setStatus(editingSlug ? "Link updated." : "Link saved.", "success"); await loadLinks();
  } catch (error) { setStatus(error.message, "error"); }
  finally { button.disabled = false; }
});

cancelEdit.addEventListener("click", resetForm);

linkList.addEventListener("click", async event => {
  const button = event.target.closest("button");
  if (!button) return;
  const row = button.closest("[data-slug]");
  const link = links.find(item => item.slug === row.dataset.slug);
  if (!link) return;
  if (button.dataset.action === "edit") {
    originalSlugInput.value = link.slug; slugInput.value = link.slug; slugInput.disabled = true; destinationInput.value = link.url; labelInput.value = link.label; cancelEdit.hidden = false; setStatus(`Editing jtp.fyi/${link.slug}`); destinationInput.focus(); return;
  }
  if (!window.confirm(`Delete jtp.fyi/${link.slug}?`)) return;
  try { await request(`/api/admin/links/${encodeURIComponent(link.slug)}`, { method: "DELETE" }); setStatus(`Deleted jtp.fyi/${link.slug}.`, "success"); await loadLinks(); }
  catch (error) { setStatus(error.message, "error"); }
});

loadLinks();
