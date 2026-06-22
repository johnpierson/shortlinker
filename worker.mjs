import adminHtml from "./public/admin.html";
import adminScript from "./public/admin.js";
import appScript from "./public/app.js";
import indexHtml from "./public/index.html";
import linksJson from "./public/links.json";
import notFoundHtml from "./public/404.html";
import styles from "./public/styles.css";

const STATIC_FILES = {
  "/": { body: indexHtml, type: "text/html; charset=UTF-8" },
  "/index.html": { body: indexHtml, type: "text/html; charset=UTF-8" },
  "/admin": { body: adminHtml, type: "text/html; charset=UTF-8" },
  "/admin.html": { body: adminHtml, type: "text/html; charset=UTF-8" },
  "/app.js": { body: appScript, type: "application/javascript; charset=UTF-8" },
  "/admin.js": { body: adminScript, type: "application/javascript; charset=UTF-8" },
  "/styles.css": { body: styles, type: "text/css; charset=UTF-8" },
  "/links.json": { body: linksJson, type: "application/json; charset=UTF-8" },
};

const STARTER_LINKS = {
  bio: {
    url: "https://bio.link/johntpierson",
    label: "Bio",
  },
  tesla: {
    url: "https://www.tesla.com/referral/john269537",
    label: "Tesla referral",
  },
  github: {
    url: "https://github.com/johnpierson",
    label: "GitHub",
  },
  linkedin: {
    url: "https://www.linkedin.com/in/johntpierson/",
    label: "LinkedIn",
  },
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/admin/")) return handleAdminApi(request, env, url);

    const file = STATIC_FILES[url.pathname];
    if (file) return new Response(file.body, { headers: { "Content-Type": file.type } });

    const slug = url.pathname.replace(/^\/+|\/+$/g, "").toLowerCase();

    if (!slug || slug.includes("/")) return notFoundResponse();

    // KV becomes the source of truth once the admin interface is added. Starter
    // links stay available while the namespace is being populated.
    const savedLink = env.SHORTLINKS
      ? await env.SHORTLINKS.get(slug, { type: "json" })
      : null;
    const link = savedLink?.deleted ? null : savedLink ?? STARTER_LINKS[slug];

    if (link?.url) {
      return Response.redirect(link.url, 302);
    }

    return notFoundResponse();
  },
};

function notFoundResponse() {
  return new Response(notFoundHtml, { status: 404, headers: { "Content-Type": "text/html; charset=UTF-8" } });
}

async function handleAdminApi(request, env, url) {
  if (!env.SHORTLINKS) {
    return json({ error: "The SHORTLINKS KV binding is not configured." }, 500);
  }

  if (url.pathname === "/api/admin/links") {
    if (request.method === "GET") return listLinks(env);
    if (request.method === "POST") return createLink(request, env);
    return methodNotAllowed("GET, POST");
  }

  const match = url.pathname.match(/^\/api\/admin\/links\/([a-zA-Z0-9_-]+)$/);
  if (!match) return json({ error: "Not found." }, 404);

  const slug = match[1].toLowerCase();
  if (request.method === "PUT") return updateLink(slug, request, env);
  if (request.method === "DELETE") return deleteLink(slug, env);
  return methodNotAllowed("PUT, DELETE");
}

async function listLinks(env) {
  const { keys } = await env.SHORTLINKS.list({ limit: 1000 });
  const storedLinks = await Promise.all(keys.map(async ({ name }) => {
    const link = await env.SHORTLINKS.get(name, { type: "json" });
    return { slug: name, link };
  }));
  const links = new Map(storedLinks.map(({ slug, link }) => [slug, link?.deleted ? null : link?.url ? { slug, ...link } : null]));
  for (const [slug, link] of Object.entries(STARTER_LINKS)) {
    if (!links.has(slug)) links.set(slug, { slug, ...link });
  }
  return json([...links.values()].filter(Boolean).sort((left, right) => left.slug.localeCompare(right.slug)));
}

async function createLink(request, env) {
  const link = await readLink(request);
  if (link instanceof Response) return link;
  const existing = await env.SHORTLINKS.get(link.slug, { type: "json" });
  if (existing?.url || STARTER_LINKS[link.slug]) return json({ error: `jtp.fyi/${link.slug} already exists.` }, 409);
  await env.SHORTLINKS.put(link.slug, JSON.stringify({ url: link.url, label: link.label }));
  return json(link, 201);
}

async function updateLink(slug, request, env) {
  const link = await readLink(request, slug);
  if (link instanceof Response) return link;
  const existing = await env.SHORTLINKS.get(slug, { type: "json" });
  if ((!existing?.url && !STARTER_LINKS[slug]) || existing?.deleted) return json({ error: `jtp.fyi/${slug} does not exist.` }, 404);
  await env.SHORTLINKS.put(slug, JSON.stringify({ url: link.url, label: link.label }));
  return json({ slug, url: link.url, label: link.label });
}

async function deleteLink(slug, env) {
  const existing = await env.SHORTLINKS.get(slug, { type: "json" });
  if ((!existing?.url && !STARTER_LINKS[slug]) || existing?.deleted) return json({ error: `jtp.fyi/${slug} does not exist.` }, 404);
  await env.SHORTLINKS.put(slug, JSON.stringify({ deleted: true }));
  return new Response(null, { status: 204 });
}

async function readLink(request, fixedSlug) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Send a JSON link payload." }, 400);
  }

  const slug = fixedSlug ?? String(body.slug || "").trim().toLowerCase();
  const label = String(body.label || "").trim();
  const url = String(body.url || "").trim();
  if (!/^[a-z0-9_-]{1,80}$/.test(slug)) return json({ error: "Use letters, numbers, hyphens, or underscores for the short path." }, 400);
  if (!label || label.length > 120) return json({ error: "Add a label of 120 characters or fewer." }, 400);
  let destination;
  try {
    destination = new URL(url);
  } catch {
    return json({ error: "Enter a complete destination URL." }, 400);
  }
  if (destination.protocol !== "http:" && destination.protocol !== "https:") return json({ error: "Only HTTP and HTTPS destinations are allowed." }, 400);
  return { slug, label, url: destination.href };
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=UTF-8" } });
}

function methodNotAllowed(allowed) {
  return new Response(null, { status: 405, headers: { Allow: allowed } });
}
