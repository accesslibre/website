# Publishing LibreAccessibility and retiring the IATF origin

## Source and builds

The maintained English pages are in `preview/next/`. `npm run build` copies only public assets to `dist-libreaccessibility/`; it excludes local servers, review reports and README files. Use Node 22.12 or newer. Wrangler 4.160.1 includes a local runtime compatible with the configured 2026-11-10 date.

`npm run build:legacy` remains available for the historical multilingual site. Its sources, locale manifests and project records are retained in Git, but are not current published translations.

## Routing

The canonical website is `https://libreaccessibility.org`. Existing flat `.html` URLs remain canonical. Recognized clean, translated and NLLB routes redirect to their English counterparts; project detail routes target the matching row or archive entry. Queries are retained. `/governance/` leads to the current operating model; `/languages/` leads to the language policy. `/press/` and `/blog/` lead to News.

Unknown pages retain a real HTTP 404 with a branded recovery page and `noindex`. The HTML and XML sitemaps list current pages only. The build makes relative navigation and asset URLs root relative so nested 404s work, while keeping fragment links on the current document.

Old form API requests receive an explicit 410 notice rather than forwarding private submission bodies to a different origin. The new site uses the private intake service binding. The original request form may remain open in older browser tabs, so users should reload at the new site before submitting.

## Release order

1. Run `npm run check`, the browser form checks and the whole-site browser review.
2. Reconcile and merge the source PRs; deploy the canonical site with `npm run deploy:site`.
3. Check HTTPS, page content, branded 404s, aliases, static assets and `GET /api/request-config` on the real domain.
4. Deploy `wrangler.legacy-redirect.jsonc` only after the canonical origin is working. It replaces the old `iatf-website` Worker in the earlier Cloudflare account, preserving its existing attached domains.
5. Verify redirects on the old domains, including translated page and project URLs. The extra `withaccessibility.com` alias is included because it was already attached to the same old Worker.

The new site and intake stay in the LibreAccessibility account. Legacy redirect domains stay in the earlier account; no zone or nameserver transfer is required.

## Rollback references

Before this release, the canonical website served version `14f8a25f-567a-46f5-9a24-770d99a232f3`. The old IATF origin served version `4a4f2445-c71d-44cc-831f-22f79da3c6e5`. Preserve these identifiers in the release record.

If rollback is necessary, use `wrangler rollback <version> --config <matching-config>`. Restoring the legacy origin and rolling back the new site are separate operations in their respective accounts. Do not redeploy the old generator over the redirect Worker accidentally.

## Current limits

The proposal form's browser tests simulate Turnstile and API responses; a real user completed a local live submission before release. A production-domain submission with a real human check remains a separate manual verification. Review and removal of proposal records are manual under governance policy 006.

Iowa formation is submitted and awaiting approval as of the launch announcement; federal 501(c)(3) recognition has not been received. Open Collective donation setup remains pending until the correct Stripe account is connected and the public contribution flow is usable. Those states must not be inferred from an active profile alone.
