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
    if (url.pathname === "/api/admin/links") return handleAdminLinks(request, env);
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
    const link = savedLink ?? STARTER_LINKS[slug];

    if (link?.url) {
      return Response.redirect(link.url, 302);
    }

    return env.ASSETS.fetch(new Request(new URL("/404.html", url), request));
  },
};

async function handleAdminLinks(request, env) {
  if (!env.SHORTLINKS) return json({ error: "The SHORTLINKS KV binding is not configured." }, 500);
  if (request.method === "GET") {
    const { keys } = await env.SHORTLINKS.list({ limit: 1000 });
    const links = await Promise.all(keys.map(async ({ name }) => {
      const link = await env.SHORTLINKS.get(name, { type: "json" });
      return link?.url ? { slug: name, ...link } : null;
    }));
    return json(links.filter(Boolean).sort((left, right) => left.slug.localeCompare(right.slug)));
  }
  if (request.method !== "POST") return new Response(null, { status: 405, headers: { Allow: "GET, POST" } });
  let body;
  try { body = await request.json(); } catch { return json({ error: "Send a JSON link payload." }, 400); }
  const slug = String(body.slug || "").trim().toLowerCase();
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

function json(body, status = 200) { return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=UTF-8" } }); }
