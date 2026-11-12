# LibreAccessibility website preview

The seven-page redesign is a local preview; it has not replaced the public website.

Run `python3 preview/next/serve.py` from the repository root and open <http://127.0.0.1:4185/>. Stop another server on that port before starting this one.

The proposal form connects to the deployed Cloudflare intake service and writes to the real private intake repository. Use clearly marked synthetic data for tests. Server secrets are never included in these files.

See [direct intake setup and validation](../../docs/proposal-intake.md). Code follows the repository license; content is CC BY-SA 4.0. Flamingo artwork is by OpenMoji, CC BY-SA 4.0.
