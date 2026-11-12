const REPO = 'accesslibre/intake';
const MAX_BODY = 64000;
const limits = {barrier: 10000, who: 2000, email: 254, name: 200};
export const reply = (body, status = 200) => Response.json(body, {status, headers: {'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'}});
const configured = env => Boolean(env.GITHUB_TOKEN && env.TURNSTILE_SECRET_KEY && env.TURNSTILE_SITE_KEY && env.PROPOSAL_RECEIPTS && env.PROPOSAL_LIMITER);
const list = value => String(value || '').split(',').map(s => s.trim()).filter(Boolean);
const githubHeaders = env => ({Authorization: 'Bearer ' + env.GITHUB_TOKEN, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json', 'User-Agent': 'LibreAccessibility-proposals'});
let readiness = {until: 0, valid: false};
async function privateRepo(env) {
  try {
    const response = await fetch('https://api.github.com/repos/' + REPO, {headers: githubHeaders(env), redirect: 'manual', signal: AbortSignal.timeout(15000)});
    const repo = await response.json();
    const valid = response.ok && repo.private === true && repo.full_name === REPO;
    if (!valid) console.warn('proposal_intake_metadata', response.status, repo.private === true, repo.full_name === REPO);
    return valid;
  } catch {
    console.warn('proposal_intake_metadata_network');
    return false;
  }
}

export async function handleProposalRequest(request, env) {
  const path = new URL(request.url).pathname;
  if (!path.startsWith('/api/')) return null;
  if (path === '/api/request-config') {
    if (request.method !== 'GET') return reply({error: 'Method not allowed.'}, 405);
    if (configured(env) && Date.now() > readiness.until) readiness = {valid: await privateRepo(env), until: Date.now() + 30000};
    const available = configured(env) && readiness.valid;
    return reply({available, turnstileSiteKey: available ? env.TURNSTILE_SITE_KEY : ''});
  }
  if (path !== '/api/request') return reply({error: 'Not found.'}, 404);
  if (request.method !== 'POST') return reply({error: 'Method not allowed.'}, 405);
  if (!list(env.PROPOSAL_ORIGINS).includes(request.headers.get('Origin'))) return reply({error: 'This form must be sent from our website.'}, 403);
  if (!configured(env)) return reply({error: 'Sending is temporarily unavailable. Please use email.'}, 503);
  const rate = await env.PROPOSAL_LIMITER.limit({key: request.headers.get('CF-Connecting-IP') || 'unknown'});
  if (!rate.success) return reply({error: 'Please wait a minute before trying again.'}, 429);
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) return reply({error: 'Unsupported request format.'}, 415);
  let input;
  try {
    const reader = request.body?.getReader();
    if (!reader) return reply({error: 'The request is empty.'}, 400);
    let size = 0; const chunks = [];
    while (true) {
      const {done, value} = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY) {await reader.cancel(); return reply({error: 'Your request is too long. Please shorten it.'}, 413);}
      chunks.push(value);
    }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) {bytes.set(chunk, offset); offset += chunk.length;}
    input = JSON.parse(new TextDecoder().decode(bytes));
  } catch {return reply({error: 'The request could not be read. Please try again.'}, 400);}
  if (!input || typeof input !== 'object') return reply({error: 'Invalid request.'}, 400);
  const data = {};
  for (const [key, max] of Object.entries(limits)) {
    if (typeof input[key] !== 'string' || input[key].length > max) return reply({error: 'Please check this field.', field: key}, 400);
    data[key] = input[key].trim().replace(/\r\n/g, '\n');
  }
  if (!data.barrier) return reply({error: 'Describe the barrier you would like help with.', field: 'barrier'}, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return reply({error: 'Enter a valid email address so we can reply.', field: 'email'}, 400);
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(input.submissionId || '')) return reply({error: 'Please reload the form and try again.'}, 400);
  input.submissionId = input.submissionId.toLowerCase();
  if (typeof input.turnstileToken !== 'string' || input.turnstileToken.length > 2048) return reply({error: 'Please complete the spam check.', code: 'verification'}, 400);
  const stub = env.PROPOSAL_RECEIPTS.get(env.PROPOSAL_RECEIPTS.idFromName(input.submissionId));
  return stub.fetch(new Request('https://receipt.internal/', {method: 'POST', body: JSON.stringify({data, submissionId: input.submissionId, token: input.turnstileToken})}));
}

// Only a payload hash and delivery receipt are stored here, never proposal text.
export class ProposalReceipt {
  constructor(ctx, env) {this.ctx = ctx; this.env = env;}
  async fetch(request) {
    const input = await request.json();
    return this.ctx.blockConcurrencyWhile(() => this.deliver(input));
  }
  async deliver({data, submissionId, token}) {
    const reference = 'LA-' + submissionId.replaceAll('-', '').slice(0, 12).toUpperCase();
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(data)));
    const hash = [...new Uint8Array(digest)].map(n => n.toString(16).padStart(2, '0')).join('');
    const previous = await this.ctx.storage.get('receipt');
    if (previous) {
      if (previous.hash !== hash) return reply({error: 'This reference belongs to a different request. Please reload the form.', code: 'conflict'}, 409);
      if (previous.status === 'sent') return reply({ok: true, reference});
      return reply({error: 'We could not confirm delivery. Please contact us with reference ' + reference + ' before sending again.', code: 'uncertain', reference}, 409);
    }
    let verification;
    try {
      const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({secret: this.env.TURNSTILE_SECRET_KEY, response: token}), signal: AbortSignal.timeout(15000)});
      verification = await response.json();
    } catch {return reply({error: 'The spam check is unavailable. Please try again.', code: 'verification'}, 503);}
    if (!verification.success || verification.action !== 'proposal' || !list(this.env.PROPOSAL_HOSTNAMES).includes(verification.hostname)) return reply({error: 'Please try the spam check again. Your text is still here.', code: 'verification'}, 403);
    const headers = githubHeaders(this.env);
    if (!await privateRepo(this.env)) return reply({error: 'Sending is temporarily unavailable. Please use email.', code: 'intake_unavailable'}, 503);
    await this.ctx.storage.put('receipt', {hash, reference, status: 'sending'});
    await this.ctx.storage.setAlarm(Date.now() + 30 * 86400000);
    try {
      const response = await fetch('https://api.github.com/repos/' + REPO + '/issues', {method: 'POST', headers, redirect: 'manual', signal: AbortSignal.timeout(15000), body: JSON.stringify({title: 'Project proposal ' + reference, body: issueBody(data, reference), labels: ['request', 'status: received']})});
      if (!response.ok) {
        if (response.status < 500) {
          await this.ctx.storage.delete('receipt');
          return reply({error: 'Your proposal was not saved. Please try again or use email.'}, 502);
        }
        throw new Error('Unknown upstream result');
      }
      const issue = await response.json();
      if (!Number.isInteger(issue.number)) throw new Error('Missing receipt');
      await this.ctx.storage.put('receipt', {hash, reference, status: 'sent'});
      return reply({ok: true, reference});
    } catch {
      return reply({error: 'We could not confirm delivery. Please contact us with reference ' + reference + ' before sending again.', code: 'uncertain', reference}, 409);
    }
  }
  async alarm() {await this.ctx.storage.deleteAll();}
}

function literal(value) {
  const longest = Math.max(2, ...[...value.matchAll(/`+/g)].map(m => m[0].length));
  const fence = '`'.repeat(longest + 1);
  return fence + '\n' + (value || '(not provided)') + '\n' + fence;
}
function issueBody(data, reference) {
  return ['# Project proposal ' + reference, 'Received: ' + new Date().toISOString(), ...Object.entries({Barrier: data.barrier, 'Who is affected': data.who, 'Reply email': data.email, 'Name or organisation': data.name}).map(([label, value]) => '## ' + label + '\n\n' + literal(value)), 'Private submission. Ask the proposer before publishing any content.'].join('\n\n');
}
