import test from 'node:test';
import assert from 'node:assert/strict';
import site from '../worker/libreaccessibility.js';
import legacy from '../worker/legacy-redirect.js';
import {migrationTarget} from '../shared/migration-routes.js';
import {PUBLIC_LOCALES,NLLB_LOCALES} from '../shared/migration-locales.js';
import {readFile} from 'node:fs/promises';

test('built skip links remain on interior pages and nested 404 assets resolve at root',async()=>{
  for (const page of ['index.html','about.html','accessibility.html','404.html']) {
    const html=await readFile(new URL('../dist-libreaccessibility/'+page,import.meta.url),'utf8');
    const documentURL='https://libreaccessibility.org/'+(page==='404.html'?'missing/deep/path/':page);
    const base=html.match(/<base\s+href="([^"]+)"/)?.[1];
    const skip=html.match(/<a class="(?:home-skip|skip)" href="([^"]+)"/)[1];
    assert.equal(new URL(skip,base?new URL(base,documentURL):documentURL).href,documentURL+'#main');
    const style=html.match(/<link rel="stylesheet" href="([^"]*css\/(?:site|footer-1c).css)"/)[1];
    assert.match(new URL(style,documentURL).pathname,/^\/css\/(site|footer-1c)\.css$/);
  }
});

test('old routes, localized slugs and project details reach specific destinations',()=>{
  for (const [from,to] of Object.entries({
    '/projects/robodk-voiceaccess/':'/voiceaccess.html','/propose/':'/request.html','/join/':'/jobs.html','/governance/':'/about.html#how-we-work',
    '/accessibility/':'/accessibility.html','/ca/accessibilitat/':'/accessibility.html',
    '/es/proyectos/iatf-website/':'/projects.html#iatf-website',
    '/nllb/ace-arab/projects/archived-iatf-bot/':'/projects.html#archived-iatf-bot',
    '/fr/participer/':'/jobs.html','/zh/项目/':'/projects.html',
    '/ca/about.html':'/about.html','/index.html':'/','/press/':'/news.html',
    '/blog/':'/news.html','/sitemap/':'/sitemap.html','/languages/':'/about.html#language'
  })) assert.equal(migrationTarget(from),to,from);
});
test('every historical locale home and default page retains an English destination',()=>{
  for (const locale of PUBLIC_LOCALES) {
    assert.equal(migrationTarget('/'+locale+'/'),'/');
    assert.equal(migrationTarget('/'+locale+'/projects/'),'/projects.html');
  }
  for (const locale of NLLB_LOCALES) {
    assert.equal(migrationTarget('/nllb/'+locale+'/'),'/');
    assert.equal(migrationTarget('/nllb/'+locale+'/transparency/'),'/transparency.html');
  }
});
test('unknown routes and malformed encoding are not redirected to home',()=>{
  for (const p of ['/missing/','/ca/missing/','/zz/projects/','/nllb/fake/projects/','/projects/fake/','/%FF/','/','/projects.html']) assert.equal(migrationTarget(p),null,p);
});
test('legacy redirect preserves query and uses the canonical host in a single hop',async()=>{
  const r=await legacy.fetch(new Request('https://www.iatf.cc/ca/projectes/iatf-website/?ref=a%20b'));
  assert.equal(r.status,308);assert.equal(r.headers.get('location'),'https://libreaccessibility.org/projects.html?ref=a%20b#iatf-website');
});
test('legacy form endpoints and POSTs do not forward private bodies to another origin',async()=>{
  const r=await legacy.fetch(new Request('https://iatf.cc/api/request',{method:'POST',body:'private'}));
  assert.equal(r.status,410);assert.match((await r.json()).error,/has not been sent/);
  assert.equal((await legacy.fetch(new Request('https://iatf.cc/join/',{method:'POST'}))).status,405);
});
test('protocol-relative unknown paths cannot redirect to a third-party host',async()=>{
  const r=await legacy.fetch(new Request('https://iatf.cc//outside.example/path?x=1'));
  assert.equal(new URL(r.headers.get('location')).origin,'https://libreaccessibility.org');
  assert.equal(new URL(r.headers.get('location')).pathname,'//outside.example/path');
});
test('www and known aliases redirect before any asset or API request',async()=>{
  const env={ASSETS:{fetch(){assert.fail('must redirect');}}};
  const r=await site.fetch(new Request('https://www.libreaccessibility.org/es/solicitud/?ref=1'),env);
  assert.equal(r.headers.get('location'),'https://libreaccessibility.org/request.html?ref=1');
  assert.equal((await site.fetch(new Request('https://libreaccessibility.org/join/'),env)).status,308);
});
test('root serves index, canonical pages pass through and unknown pages get branded 404',async()=>{
  const seen=[];
  const env={ASSETS:{async fetch(r){seen.push(new URL(r.url).pathname);return new Response(new URL(r.url).pathname==='/404.html'?'Branded not found':'Home',{status:new URL(r.url).pathname==='/missing/'?404:200,headers:{'Content-Type':'text/html'}});}}};
  assert.equal(await (await site.fetch(new Request('https://libreaccessibility.org/'),env)).text(),'Home');assert.equal(seen[0],'/index.html');
  assert.equal((await site.fetch(new Request('https://libreaccessibility.org/about.html'),env)).status,200);
  const r=await site.fetch(new Request('https://libreaccessibility.org/missing/'),env);assert.equal(r.status,404);assert.equal(r.headers.get('X-Robots-Tag'),'noindex');assert.equal(await r.text(),'Branded not found');
  const head=await site.fetch(new Request('https://libreaccessibility.org/missing/',{method:'HEAD'}),env);assert.equal(head.status,404);assert.equal(await head.text(),'');
});
test('API service binding preserves the original request and missing binding fails clearly',async()=>{
  const request=new Request('https://libreaccessibility.org/api/request',{method:'POST',body:'private'});
  const r=await site.fetch(request,{PROPOSAL_API:{fetch(actual){assert.equal(actual,request);return Response.json({ok:true});}}});assert.equal((await r.json()).ok,true);
  assert.equal((await site.fetch(request,{})).status,503);
});
