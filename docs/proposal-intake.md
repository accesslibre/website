# Direct proposal intake

The website sends proposals to a small Cloudflare Worker, which records
them as issues in the private `accesslibre/intake` repository. Browser
code receives a reference, never GitHub credentials or a private issue URL.

Service: <https://libreaccessibility-intake.libreaccessibility.workers.dev>

## Local preview

Run `python3 preview/next/serve.py` from this repository and visit
<http://127.0.0.1:4185/request.html>. Its `/api/` proxy forwards to the
deployed intake service. It contains no credentials.

The current design workspace also keeps the same preview in
`local-redesigns/workshop-a-footer-1c/` in the parent workspace. Use one
preview server at a time: both deliberately bind the same loopback port.

For production integration, forward `/api/` requests from the website
Worker through a `PROPOSAL_API` service binding to `libreaccessibility-intake`.
The redesign and that website integration are separate from deploying the
intake backend; the public website has not been replaced by this work.

## Setup and deployment

Use a GitHub token with repository metadata read and issue write access
to `accesslibre/intake`. The repository must remain private.

```sh
npm install
npx wrangler deploy --config wrangler.intake.jsonc
npx wrangler secret put GITHUB_TOKEN --config wrangler.intake.jsonc
npx wrangler secret put TURNSTILE_SECRET_KEY --config wrangler.intake.jsonc
```

Configure the public Turnstile site key in `wrangler.intake.jsonc`.
The widget uses managed mode and authorizes `libreaccessibility.org`,
`127.0.0.1` and `localhost`, without port numbers. Server validation checks
the hostname and the `proposal` action. Secrets belong in Worker secrets,
never in browser assets or Git.

## API

- `GET /api/request-config`: public readiness and site key. Readiness
  includes a private-repository access check, cached for 30 seconds.
- `POST /api/request`: JSON containing `barrier`, `who`, `email`, `name`,
  a UUID-v4 `submissionId`, and `turnstileToken`. `who` and `name` can be
  empty strings. A browser Origin from the configured allowlist is required.
- A successful response is `{ "ok": true, "reference": "LA-…" }`.
  Success is returned only after GitHub confirms issue creation.

Field limits are 10,000 characters for the barrier, 2,000 for affected
users, 254 for email and 200 for name. The total request body is limited
to 64 KB. The Worker applies a best-effort edge limit of 50 requests per
minute per source IP. Shared networks can share that limit.

GitHub metadata is checked again before every new issue: public or
unexpected repositories fail closed. Fetch uses `redirect: "manual"`
and rejects redirects. Workers does not support the Fetch `error` mode.

## Receipts and errors

A Durable Object serializes each submission ID. For 30 days it stores
only the normalized payload hash, reference and delivery state. Proposal
text is stored in the private issue, outside the receipt object. An alarm
removes the receipt metadata after 30 days.

Repeating a completed submission returns its existing reference. Reusing
the ID with different content is rejected. An uncertain upstream result
blocks another write for that ID; the form retains the text and asks the
requester to contact the coordinator with the reference. There is no
automatic retry after uncertain delivery.

Proposal text is fenced as literal Markdown, including embedded backticks,
so it does not become active mentions or embedded images. Issue titles
contain only the reference. Extra email or Discord notifications are not
configured by this service.

The form works in one column. Review details use native `details`, so
opening them preserves entered values. Validation identifies and focuses
invalid fields. A successful submission replaces the form and CAPTCHA
with a compact receipt and focuses its heading. “Send another proposal”
clears the fields, starts a new submission ID and focuses the barrier
field. No proposal text is saved in browser storage. Without JavaScript,
the form is hidden and email remains available.

## Privacy and retention

The [adopted policy](https://github.com/accesslibre/governance/blob/main/decisions/2026-006-proposal-privacy-and-retention.md)
requires affirmative permission for the exact proposed public summary.
Originals stay private; proposals are not used for marketing. The form
shows a short promise and a native privacy disclosure covering GitHub,
Cloudflare, review periods and the contact for rights requests.

The coordinator reviews active records annually and checks the private
`intake/retention-reviews.md` register monthly. Closed proposals receive a
review 12 calendar months after closure. Remove or genuinely anonymize
personal data no longer needed, sooner where appropriate. Any extension
needs a documented purpose, minimum necessary records, restricted access
and another review date. Legal obligations and relevant claims follow
their applicable periods, not a blanket indefinite exception.

This is a manual review/removal process. No automatic deletion of GitHub
proposals is enabled. Closing an issue does not delete it; removal includes
checking edit history, attachments and controlled copies. The receipt
metadata expiry above remains separate from proposal retention.

## Validation

```sh
node --test tests/proposal-intake.test.mjs
```

The 15 backend tests use simulated upstream services and cover validation,
limits, private visibility, Turnstile failure, duplicate/concurrent writes,
content preservation and uncertain delivery.

Optional browser checks are in `tests/proposal-browser.mjs`. They require
Playwright (`@playwright/test`) and Chromium. Start the preview server,
then run `node tests/proposal-browser.mjs`. `PLAYWRIGHT_MODULE` can specify
an installed module path, and `CHROME_PATH` can select an existing Chrome
binary instead of Playwright's browser. `PREVIEW_URL` and `QA_OUTPUT`
override the default loopback URL and temporary artifact directory.

Browser smoke checks cover 320, 390, 768, 1024 and 1440 px, keyboard
disclosure, visible focus, retained data, validation, single submission,
receipt and failure states, and the no-JavaScript fallback. Those checks
simulate Turnstile and API responses. A real verification and private issue
creation must also be checked manually; automated browsers can be challenged.

Live verification on 11 November 2026: the user completed real Turnstile,
submitted from the local browser and received a reference. All four fields
were verified in the private issue; the synthetic test record was closed.
The confirmation/restart UI was subsequently checked with simulated
services, including focus on the receipt heading and the first new field.

Current form colors have measured contrast of at least 5.89:1. This is
verification of the changed page, not a declaration of full WCAG conformance.
