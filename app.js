const linkList = document.getElementById("link-list");
const linkCount = document.getElementById("link-count");
const dialog = document.getElementById("admin-dialog");
const authView = document.getElementById("auth-view");
const manageView = document.getElementById("manage-view");
const status = document.getElementById("form-status");
let session = null;

document.getElementById("year").textContent = new Date().getFullYear();

function escapeHtml(value) { return value.replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]); }
function showStatus(message, type = "") { status.textContent = message; status.className = `form-status ${type}`; }
function showAdminView() { authView.hidden = Boolean(session); manageView.hidden = !session; }
function validSlug(slug) { return /^[a-zA-Z0-9_-]+$/.test(slug); }

async function loadLinks() {
  try {
    const response = await fetch("links.json", { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load links");
    const links = await response.json();
    linkCount.textContent = `${links.length} ${links.length === 1 ? "link" : "links"}`;
    linkList.innerHTML = links.map((link, index) => `<a class="link-row" href="/${encodeURIComponent(link.slug)}" style="animation-delay:${index * 70}ms"><span><span class="link-title">${escapeHtml(link.label)}</span><span class="link-path">jtp.fyi/${escapeHtml(link.slug)}</span></span><span class="link-arrow" aria-hidden="true">↗</span></a>`).join("");
  } catch (error) { linkCount.textContent = "Unavailable"; linkList.innerHTML = "<p>Links are temporarily unavailable.</p>"; }
}

document.getElementById("admin-trigger").addEventListener("click", () => { showAdminView(); dialog.showModal(); });
document.getElementById("close-dialog").addEventListener("click", () => dialog.close());
document.getElementById("disconnect").addEventListener("click", () => { session = null; showAdminView(); });

document.getElementById("auth-form").addEventListener("submit", event => {
  event.preventDefault();
  const values = new FormData(event.currentTarget);
  const repository = values.get("repository").trim();
  const token = values.get("github-token").trim();
  if (!/^[^/\\s]+\/[^/\\s]+$/.test(repository)) { event.currentTarget.querySelector("#repository").focus(); return; }
  session = { repository, token };
  showAdminView();
});

document.getElementById("link-form").addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const values = new FormData(form);
  const slug = values.get("slug").trim();
  const url = values.get("destination").trim();
  const label = values.get("label").trim();
  if (!validSlug(slug)) { showStatus("Use letters, numbers, hyphens, or underscores for the path.", "error"); return; }
  let parsedUrl;
  try { parsedUrl = new URL(url); } catch { showStatus("Enter a complete destination URL, including https://.", "error"); return; }
  if (!/^https?:$/.test(parsedUrl.protocol)) { showStatus("Only HTTP and HTTPS links can be published.", "error"); return; }
  const button = document.getElementById("save-link");
  button.disabled = true; showStatus("Publishing to GitHub…");
  try {
    const apiUrl = `https://api.github.com/repos/${session.repository}/contents/links.json`;
    const headers = { Authorization: `Bearer ${session.token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
    const existingResponse = await fetch(apiUrl, { headers });
    if (!existingResponse.ok) throw new Error(existingResponse.status === 401 ? "GitHub rejected that token." : "Could not read links.json. Check the repository and token permissions.");
    const existing = await existingResponse.json();
    const links = JSON.parse(decodeURIComponent(escape(atob(existing.content.replace(/\n/g, "")))));
    const duplicate = links.find(link => link.slug.toLowerCase() === slug.toLowerCase());
    if (duplicate) throw new Error(`jtp.fyi/${slug} already exists. Choose a different path.`);
    links.unshift({ slug, url: parsedUrl.href, label });
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(links, null, 2) + "\n")));
    const updateResponse = await fetch(apiUrl, { method: "PUT", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ message: `Add short link: ${slug}`, content, sha: existing.sha }) });
    if (!updateResponse.ok) throw new Error("GitHub could not save the link. Try again in a moment.");
    form.reset(); showStatus(`Published! jtp.fyi/${slug} will be live when Pages finishes deploying.`, "success"); loadLinks();
  } catch (error) { showStatus(error.message, "error"); }
  finally { button.disabled = false; }
});

loadLinks();
