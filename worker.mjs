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
    if (url.pathname === "/admin") return env.ASSETS.fetch(new Request(new URL("/admin.html", url), request));
    if (url.pathname === "/api/links") return handlePublicLinks(env);
    if (url.pathname.startsWith("/api/admin/links")) return handleAdminLinks(request, env, url);
    const slug = url.pathname.replace(/^\/+|\/+$/g, "").toLowerCase();

    // Let the static asset service render the landing page and its supporting files.
    if (!slug || slug.includes("/")) {
      return env.ASSETS.fetch(request);
    }

    // KV becomes the source of truth once the admin interface is added. Starter
    // links stay available while the namespace is being populated.
    const savedLink = env.SHORTLINKS
      ? await env.SHORTLINKS.get(slug, { type: "json" })
      : null;
    const link = savedLink?.deleted ? null : savedLink ?? STARTER_LINKS[slug];

    if (link?.url) {
      return Response.redirect(link.url, 302);
    }

    return env.ASSETS.fetch(new Request(new URL("/404.html", url), request));
  },
};

async function handlePublicLinks(env) {
  if (!env.SHORTLINKS) return json(Object.entries(STARTER_LINKS).map(([slug, link]) => ({ slug, ...link })));
  return json(await listLinks(env));
}

async function handleAdminLinks(request, env, url) {
  if (!env.SHORTLINKS) return json({ error: "The SHORTLINKS KV binding is not configured." }, 500);
  if (url.pathname === "/api/admin/links") {
    if (request.method === "GET") return json(await listLinks(env));
    if (request.method === "POST") return saveLink(request, env);
    return new Response(null, { status: 405, headers: { Allow: "GET, POST" } });
  }
  const match = url.pathname.match(/^\/api\/admin\/links\/([a-z0-9_-]+)$/i);
  if (!match) return json({ error: "Not found." }, 404);
  if (request.method === "PUT") return saveLink(request, env, match[1].toLowerCase());
  if (request.method === "DELETE") return deleteLink(match[1].toLowerCase(), env);
  return new Response(null, { status: 405, headers: { Allow: "PUT, DELETE" } });
}

async function listLinks(env) {
  const { keys } = await env.SHORTLINKS.list({ limit: 1000 });
  const storedLinks = await Promise.all(keys.map(async ({ name }) => ({ slug: name, link: await env.SHORTLINKS.get(name, { type: "json" }) })));
  const links = new Map(storedLinks.map(({ slug, link }) => [slug, link?.deleted ? null : link?.url ? { slug, ...link } : null]));
  for (const [slug, link] of Object.entries(STARTER_LINKS)) if (!links.has(slug)) links.set(slug, { slug, ...link });
  return [...links.values()].filter(Boolean).sort((left, right) => left.slug.localeCompare(right.slug));
}

async function saveLink(request, env, fixedSlug) {
  let body;
  try { body = await request.json(); } catch { return json({ error: "Send a JSON link payload." }, 400); }
  const slug = fixedSlug ?? String(body.slug || "").trim().toLowerCase();
  const label = String(body.label || "").trim();
  const destination = String(body.url || "").trim();
  if (!/^[a-z0-9_-]{1,80}$/.test(slug)) return json({ error: "Use letters, numbers, hyphens, or underscores for the path." }, 400);
  if (!label || label.length > 120) return json({ error: "Add a label of 120 characters or fewer." }, 400);
  let url;
  try { url = new URL(destination); } catch { return json({ error: "Enter a complete destination URL." }, 400); }
  if (url.protocol !== "http:" && url.protocol !== "https:") return json({ error: "Only HTTP and HTTPS destinations are allowed." }, 400);
  await env.SHORTLINKS.put(slug, JSON.stringify({ url: url.href, label }));
  return json({ slug, url: url.href, label }, 201);
}

async function deleteLink(slug, env) {
  const existing = await env.SHORTLINKS.get(slug, { type: "json" });
  if ((!existing?.url && !STARTER_LINKS[slug]) || existing?.deleted) return json({ error: `jtp.fyi/${slug} does not exist.` }, 404);
  await env.SHORTLINKS.put(slug, JSON.stringify({ deleted: true }));
  return new Response(null, { status: 204 });
}

function json(body, status = 200) { return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=UTF-8" } }); }
