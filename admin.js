const form = document.getElementById("link-form");
const slugInput = document.getElementById("slug");
const destinationInput = document.getElementById("destination");
const labelInput = document.getElementById("label");
const originalSlugInput = document.getElementById("original-slug");
const statusMessage = document.getElementById("form-status");
const linksContainer = document.getElementById("admin-link-list");
const linkCount = document.getElementById("link-count");
const cancelEdit = document.getElementById("cancel-edit");
let links = [];

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function showStatus(message, type = "") {
  statusMessage.textContent = message;
  statusMessage.className = `form-status ${type}`;
}

function resetForm() {
  form.reset();
  originalSlugInput.value = "";
  slugInput.disabled = false;
  cancelEdit.hidden = true;
}

function renderLinks() {
  linkCount.textContent = `${links.length} ${links.length === 1 ? "link" : "links"}`;
  linksContainer.innerHTML = links.map(link => `
    <article class="admin-link-row" data-slug="${escapeHtml(link.slug)}">
      <div><strong>${escapeHtml(link.label)}</strong><span>jtp.fyi/${escapeHtml(link.slug)} → ${escapeHtml(link.url)}</span></div>
      <div class="row-actions"><button type="button" data-action="edit">Edit</button><button type="button" data-action="delete">Delete</button></div>
    </article>`).join("");
}

async function api(path, options) {
  const response = await fetch(path, options);
  if (!response.ok) {
    const body = await response.json();
    throw new Error(body.error || "Something went wrong.");
  }
  return response.status === 204 ? null : response.json();
}

async function loadLinks() {
  try {
    links = await api("/api/admin/links");
    renderLinks();
  } catch (error) {
    showStatus(error.message, "error");
  }
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  const slug = slugInput.value.trim().toLowerCase();
  const url = destinationInput.value.trim();
  const label = labelInput.value.trim();
  const editingSlug = originalSlugInput.value;
  const button = document.getElementById("save-link");
  button.disabled = true;
  showStatus(editingSlug ? "Saving change…" : "Making link…");
  try {
    await api(editingSlug ? `/api/admin/links/${encodeURIComponent(editingSlug)}` : "/api/admin/links", {
      method: editingSlug ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, url, label }),
    });
    resetForm();
    showStatus(editingSlug ? "Link updated." : "Link created.", "success");
    await loadLinks();
  } catch (error) {
    showStatus(error.message, "error");
  } finally {
    button.disabled = false;
  }
});

cancelEdit.addEventListener("click", resetForm);

linksContainer.addEventListener("click", async event => {
  const button = event.target.closest("button");
  if (!button) return;
  const row = button.closest("[data-slug]");
  const link = links.find(item => item.slug === row.dataset.slug);
  if (!link) return;
  if (button.dataset.action === "edit") {
    originalSlugInput.value = link.slug;
    slugInput.value = link.slug;
    slugInput.disabled = true;
    destinationInput.value = link.url;
    labelInput.value = link.label;
    cancelEdit.hidden = false;
    showStatus(`Editing jtp.fyi/${link.slug}`);
    destinationInput.focus();
    return;
  }
  if (!window.confirm(`Delete jtp.fyi/${link.slug}? This cannot be undone.`)) return;
  try {
    await api(`/api/admin/links/${encodeURIComponent(link.slug)}`, { method: "DELETE" });
    showStatus(`Deleted jtp.fyi/${link.slug}.`, "success");
    await loadLinks();
  } catch (error) {
    showStatus(error.message, "error");
  }
});

loadLinks();
