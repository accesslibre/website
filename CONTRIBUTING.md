# Contributing to the LibreAccessibility website

The current public site is <https://libreaccessibility.org>. Its maintained pages and assets are in `preview/next/`. The older IATF content and translations remain historical sources.

## Local development

Use Node 22.12 or newer:

```sh
npm ci
npm run build
npm run dev
npm run check
```

Edit HTML in `preview/next/`, CSS in `preview/next/css/`, and browser scripts in `preview/next/js/`. The public build goes to `dist-libreaccessibility/`; do not edit generated files. `shared/migration-routes.js` and the website Workers handle compatibility routes and 404 responses. Historical multilingual builds use `npm run build:legacy` and are not the current deployment.

## Proposal form

The direct form uses Cloudflare Turnstile and a separate private intake Worker. Credentials stay server-side. Browser tests simulate the services; never submit somebody else's personal data as a test. See [intake documentation](docs/proposal-intake.md) for setup and manual verification.

## Language and accessibility

English is the editorial source. Everyone may use the language they are most comfortable with in questions and contributions. Current translations are on hold; see [the language policy](docs/language-policy.md).

Keep meaningful headings, keyboard access, visible focus and accessible names. Check changed pages at narrow and wide viewports. Report website barriers privately to <contact@libreaccessibility.org>; the [accessibility page](https://libreaccessibility.org/accessibility.html) explains useful details to include and how reports are handled.

## Pull requests and contact

Keep changes focused and run `npm run check`. For UI changes, also review the page in a browser and check keyboard navigation. Do not include private proposals or publication approvals in public commits. Deployment follows [the migration guide](docs/site-migration.md).

Questions: <contact@libreaccessibility.org> or <https://discord.gg/7DzHgJHbGx>. Follow the [Code of Conduct](CODE_OF_CONDUCT.md). For vulnerabilities, use the private channel in [SECURITY.md](SECURITY.md).

Code contributions follow [AGPL-3.0](LICENSE); content and documentation follow [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
