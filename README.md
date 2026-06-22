# jtp.fyi

A personal short-link site for `jtp.fyi`, deployed as a Cloudflare Worker. The source code remains public on GitHub; the Worker and KV namespace are Cloudflare account resources.

## Deploy to Cloudflare

1. In Cloudflare KV, create a namespace named `SHORTLINKS`.
2. Set its namespace ID in `wrangler.jsonc` under the `SHORTLINKS` KV binding.
3. Connect this repository to the `shortlinker` Worker through Workers Builds, or deploy with Wrangler.
4. In **Workers & Pages → shortlinker → Settings → Domains & Routes**, add `jtp.fyi` as a custom domain.

The Worker serves the landing page as static assets, then checks KV for short links. It falls back to the starter links in `worker.mjs` until KV has been populated.

## Secure admin panel

The owner panel is available at `/admin`. Before deploying, protect both paths with Cloudflare Access:

1. In **Zero Trust → Access → Applications**, create a **Self-hosted** application.
2. Add `jtp.fyi/admin*` and `jtp.fyi/api/admin/*` as application domains.
3. Add an **Allow** policy for only your identity (email, Google, or GitHub).
4. Deploy the Worker. Cloudflare Access is the authentication boundary for `/admin` and its APIs, so both protected paths must have an Allow policy.

`workers_dev = false` prevents the public `workers.dev` hostname from bypassing your Access-protected custom domain.

## Add a KV link

In **Storage & Databases → KV → SHORTLINKS**, create a key using the short path (for example, `bio`) and use JSON as the value:

```json
{"url":"https://bio.link/johntpierson","label":"Bio"}
```

KV entries take precedence over the starter links, so they are ready for a future protected admin interface.
