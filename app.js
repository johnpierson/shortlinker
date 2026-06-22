const linkList = document.getElementById("link-list");
const linkCount = document.getElementById("link-count");

document.getElementById("year").textContent = new Date().getFullYear();

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

async function loadLinks() {
  try {
    const response = await fetch("links.json", { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load links");
    const links = await response.json();
    linkCount.textContent = `${links.length} ${links.length === 1 ? "link" : "links"}`;
    linkList.innerHTML = links.map(link => `<a class="link-row" href="/${encodeURIComponent(link.slug)}"><span><span class="link-title">${escapeHtml(link.label)}</span><span class="link-path">jtp.fyi/${escapeHtml(link.slug)}</span></span><span class="link-arrow" aria-hidden="true">↗</span></a>`).join("");
  } catch {
    linkCount.textContent = "Unavailable";
    linkList.innerHTML = "<p>Links are temporarily unavailable.</p>";
  }
}

loadLinks();
