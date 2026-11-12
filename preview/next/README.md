# LibreAccessibility website source

These 13 English pages are the maintained source for the public website. The historical folder name is retained to keep existing workspaces usable. See [repository setup](../../README.md) and [deployment/migration](../../docs/site-migration.md).

For a static loopback review, run `python3 preview/next/serve.py` from the repository root and visit <http://127.0.0.1:4185/>. Use only one server on that port. For the production routing and branded 404 behavior, run `npm run build` and `npm run dev` instead.

The proposal form connects to the deployed Cloudflare intake service and writes to the real private intake repository. Use clearly marked synthetic data for tests; never include somebody else's personal information. Server secrets are not included in these files.

See [direct intake setup and validation](../../docs/proposal-intake.md). Code follows the repository license; content is CC BY-SA 4.0. Flamingo artwork is by OpenMoji; bundled font notices are included.
