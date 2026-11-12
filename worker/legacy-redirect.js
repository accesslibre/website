import {migrationTarget, canonicalRedirect} from '../shared/migration-routes.js';

// Replaces the old IATF origin only after the new site is live and verified.
export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      return Response.json({error:'This form has moved to https://libreaccessibility.org/request.html. This request has not been sent.'},
        {status:410,headers:{'Cache-Control':'no-store'}});
    }
    if (!['GET','HEAD'].includes(request.method)) {
      return new Response('This site has moved to https://libreaccessibility.org/',{status:405,headers:{Allow:'GET, HEAD'}});
    }
    return canonicalRedirect(url,migrationTarget(url.pathname));
  }
};
