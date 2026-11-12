# LibreAccessibility website

Source for <https://libreaccessibility.org>, continuing the earlier International Accessibility Task Force (IATF) website.

## Current site

Editorial content is in English for now. People may participate in whichever language they are comfortable using; translations are on hold. See [the language policy](docs/language-policy.md).

The current pages and assets are in `preview/next/`. Despite the folder name, these are the maintained source for the public site. The public build copies only site assets to `dist-libreaccessibility/`; local servers, review reports and README files are excluded.

```sh
npm ci
npm run build
npm run dev
npm run test:site
```

Wrangler's local development server exercises routing and branded 404s. The existing `python3 preview/next/serve.py` loopback preview is also available at port 4185; its proposal form uses the live private intake service. Do not submit real personal information during tests.

## Deployment

```sh
npm run deploy:site
```

This publishes `libreaccessibility-website` in the LibreAccessibility Cloudflare account, with a service binding to the separately deployed private intake Worker. Credentials stay in Cloudflare secrets. See [intake setup](docs/proposal-intake.md) and [migration and rollback](docs/site-migration.md).

The old IATF domains are served by a separate redirect Worker in the earlier account. Deploy that only after the new site is live and verified:

```sh
npx wrangler deploy --config wrangler.legacy-redirect.jsonc
```

## Historical material

Earlier content, language manifests, translated sources and the old generator remain in this repository. They are retained history, not currently published translations. `npm run build:legacy` rebuilds the former site in `dist/`; it is not the production deployment command. See [historical documentation](docs/legacy-iatf-website.md).

## Content and contact

Proposals are private. Public summaries require the requester's permission for the exact text; [privacy and retention policy](https://github.com/accesslibre/governance/blob/main/decisions/2026-006-proposal-privacy-and-retention.md).

Contact <contact@libreaccessibility.org>. Code follows the repository license; content is CC BY-SA 4.0. OpenMoji artwork and bundled font notices are included with the site assets.
