# jtp.fyi

A static GitHub Pages short-link site. Link creation happens from the owner panel and commits directly to `links.json` through the GitHub API; tokens live only in the active browser tab.

## Publish

1. Create a GitHub repository and push this directory to its default branch.
2. In **Settings → Pages**, deploy from that branch’s root directory.
3. In **Settings → Pages → Custom domain**, set `jtp.fyi`. The included `CNAME` file also tells Pages the intended domain.
4. At your DNS provider, add GitHub Pages records for the apex domain and `www` as described in GitHub’s custom-domain documentation. Enable HTTPS after DNS verifies.

## Create links

Open the site, select **Admin**, then create a GitHub fine-grained personal access token with repository-only **Contents: Read and write** permission. Enter `owner/repository` and the token, then publish links. GitHub Pages normally takes a minute or two to deploy the resulting `links.json` change.

The redirect mechanism uses `404.html`, which GitHub Pages serves for unrecognized paths. It looks up the requested path in `links.json` and forwards the visitor to the matching URL.
