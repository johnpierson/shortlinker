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
    url: "https://www.linkedin.com/in/johnpierson/",
    label: "LinkedIn",
  },
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
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
