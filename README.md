# jtp.fyi

A personal short-link site for `jtp.fyi`, deployed as a Cloudflare Worker. The source code remains public on GitHub; the Worker and KV namespace are Cloudflare account resources.

## Deploy to Cloudflare

1. In Cloudflare KV, create a namespace named `SHORTLINKS`.
2. Connect this repository to the `shortlinker` Worker through Workers Builds, or deploy with Wrangler.
3. In **Workers & Pages → shortlinker → Settings → Bindings**, add a KV namespace binding named `SHORTLINKS` and select that namespace.
4. In **Workers & Pages → shortlinker → Settings → Domains & Routes**, add `jtp.fyi` as a custom domain.

The Worker serves the landing page as static assets, then checks KV for short links. It falls back to the starter links in `worker.mjs` until KV has been populated.

## Add a KV link

In **Storage & Databases → KV → SHORTLINKS**, create a key using the short path (for example, `bio`) and use JSON as the value:

```json
{"url":"https://bio.link/johntpierson","label":"Bio"}
```

KV entries take precedence over the starter links, so they are ready for a future protected admin interface.
