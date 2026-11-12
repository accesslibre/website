import {migrationTarget, canonicalRedirect} from '../shared/migration-routes.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname === 'www.libreaccessibility.org') {
      return canonicalRedirect(url,migrationTarget(url.pathname));
    }
    if (url.pathname.startsWith('/api/')) {
      if (env.PROPOSAL_API) return env.PROPOSAL_API.fetch(request);
      return Response.json({error:'Sending is temporarily unavailable. Please use email.'},
        {status:503,headers:{'Cache-Control':'no-store'}});
    }
    if (!['GET','HEAD'].includes(request.method)) {
      return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD'}});
    }
    if (/^\/discord\/?$/.test(url.pathname)) {
      return Response.redirect('https://discord.gg/7DzHgJHbGx',302);
    }
    const target = migrationTarget(url.pathname);
    if (target) return canonicalRedirect(url,target);
    if (url.pathname === '/') url.pathname = '/index.html';
    const response = await env.ASSETS.fetch(new Request(url,request));
    if (response.status !== 404 && url.pathname !== '/404.html') return response;
    url.pathname = '/404.html';
    const page = await env.ASSETS.fetch(new Request(url,request));
    const headers = new Headers(page.headers);
    headers.set('X-Robots-Tag','noindex');
    headers.set('Cache-Control','no-cache');
    return new Response(request.method === 'HEAD' ? null : page.body,{status:404,headers});
  }
};
