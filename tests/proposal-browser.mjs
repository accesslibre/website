const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || '@playwright/test');
import os from 'node:os';
import path from 'node:path';
const output=process.env.QA_OUTPUT || os.tmpdir();
const base=process.env.PREVIEW_URL || 'http://127.0.0.1:4185';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true});
const script=`window.turnstile={render:function(s,o){window.__initialDisplay=getComputedStyle(s).display;window.__verification=o;setTimeout(function(){o.callback('test-token');},10);return'mock';},isExpired:function(){return false;},remove:function(){},reset:function(){setTimeout(function(){window.__verification.callback('test-token');},10);},execute:function(){setTimeout(function(){window.__verification.callback('test-token');},10);}};window.onLibreProposalTurnstile();`;
async function setup(mode='success',width=390){
 const c=await browser.newContext({viewport:{width,height:900}}),p=await c.newPage();p.setDefaultTimeout(6000);let posts=0;
 await p.route('**/api/request-config',r=>r.fulfill({json:{available:true,turnstileSiteKey:'test-public-key'}}));
 await p.route('https://challenges.cloudflare.com/turnstile/v0/api.js*',r=>r.fulfill({contentType:'text/javascript',body:script}));
 await p.route('**/api/request',async r=>{posts++;await new Promise(resolve=>setTimeout(resolve,50));if(mode==='network')return r.abort();if(mode==='retry')return r.fulfill({status:503,json:{error:'Sending unavailable.'}});if(mode==='uncertain')return r.fulfill({status:409,json:{code:'uncertain'}});return r.fulfill({json:{ok:true,reference:'LA-SYNTHETIC'}});});
 await p.goto(base+'/request.html',{waitUntil:'load'});await p.evaluate(()=>document.fonts.ready);await p.waitForFunction(()=>!document.querySelector('.request-submit').disabled);
 return{p,c,posts:()=>posts};
}
const checks=[];
try{
 for(const width of [320,390,768,1024,1440]){
  const {p,c}=await setup('success',width);
  assert.notEqual(await p.evaluate(()=>window.__initialDisplay),'none');assert.equal(await p.locator('aside').count(),0);assert.equal(await p.locator('#proposal-expectations').getAttribute('open'),null);
  await p.locator('#req-barrier').fill('Text preserved while reading terms');
  const summary=p.locator('#proposal-expectations > summary');await summary.focus();await p.keyboard.press('Enter');
  assert.equal(await p.locator('#proposal-expectations').evaluate(e=>e.open),true);assert.equal(await p.locator('#req-barrier').inputValue(),'Text preserved while reading terms');
  await p.keyboard.press('Space');assert.equal(await p.locator('#proposal-expectations').evaluate(e=>e.open),false);
  const privacy=p.locator('#proposal-privacy');assert.equal(await privacy.evaluate(e=>e.open),false);
  await privacy.locator('summary').focus();await p.keyboard.press('Enter');assert.equal(await privacy.evaluate(e=>e.open),true);assert.match(await privacy.innerText(),/12 months/);assert.equal(await p.locator('#req-barrier').inputValue(),'Text preserved while reading terms');
  assert.equal(await privacy.getByRole('link',{name:'Read the full privacy and retention policy'}).getAttribute('href'),'https://github.com/accesslibre/governance/blob/main/decisions/2026-006-proposal-privacy-and-retention.md');
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  if(width===390||width===1440)await p.screenshot({path:path.join(output,`libre-request-privacy-${width}.png`),fullPage:true});
  await p.keyboard.press('Space');assert.equal(await privacy.evaluate(e=>e.open),false);
  const dimensions=await p.evaluate(()=>({width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,buttonHeight:document.querySelector('.request-submit').getBoundingClientRect().height,inputHeights:[...document.querySelectorAll('.request-form input')].map(e=>e.getBoundingClientRect().height)}));
  assert.equal(dimensions.overflow,false);assert.ok(dimensions.buttonHeight>=48);assert.ok(dimensions.inputHeights.every(n=>n>=48));checks.push(dimensions);
  if(width===390||width===1440)await p.screenshot({path:path.join(output,`libre-request-redesign-${width}.png`),fullPage:true});
  await c.close();
 }
 const {p,c,posts}=await setup();const send=p.getByRole('button',{name:'Send proposal',exact:true});
 await send.click();assert.equal(await p.locator('#req-barrier').evaluate(e=>e===document.activeElement),true);assert.equal(posts(),0);
 await p.locator('#req-barrier').fill('Synthetic barrier');await p.locator('#req-email').fill('bad');await send.click();assert.equal(await p.locator('#req-email').evaluate(e=>e===document.activeElement),true);assert.equal(posts(),0);
 await p.locator('#req-email').fill('qa@example.org');await p.evaluate(()=>{const f=document.querySelector('form');f.requestSubmit();f.requestSubmit();});
 await p.waitForFunction(()=>document.querySelector('.request-submit').textContent==='Proposal sent');assert.equal(posts(),1);assert.equal(await p.locator('#req-barrier').inputValue(),'Synthetic barrier');assert.equal(await p.locator('#receipt-heading').evaluate(e=>e===document.activeElement),true);assert.equal(await p.locator('form').isVisible(),false);assert.equal(await p.locator('#proposal-expectations').isVisible(),false);assert.equal(await p.getByRole('heading',{level:1}).count(),1);await p.screenshot({path:path.join(output,'libre-request-receipt-390.png'),fullPage:true});await p.getByRole('button',{name:'Send another proposal',exact:true}).click();assert.equal(await p.locator('#req-barrier').inputValue(),'');assert.equal(await p.locator('#req-email').inputValue(),'');assert.equal(await p.locator('#req-barrier').evaluate(e=>e===document.activeElement),true);await p.waitForFunction(()=>!document.querySelector('.request-submit').disabled);assert.equal(await p.getByRole('heading',{level:1,name:'Propose a project'}).count(),1);await c.close();
 for(const mode of ['retry','uncertain','network']){
  const t=await setup(mode);await t.p.locator('#req-barrier').fill('Keep this request');await t.p.locator('#req-email').fill('qa@example.org');await t.p.getByRole('button',{name:'Send proposal',exact:true}).click();
  await t.p.waitForFunction(()=>document.querySelector('form').getAttribute('aria-busy')==='false');
  assert.equal(await t.p.locator('#req-barrier').inputValue(),'Keep this request');assert.equal(t.posts(),1);assert.equal(await t.p.locator('.request-submit').isDisabled(),mode!=='retry');await t.c.close();
 }
 const nojs=await browser.newContext({javaScriptEnabled:false,viewport:{width:320,height:900}}),np=await nojs.newPage();await np.goto(base+'/request.html');assert.equal(await np.locator('form').isVisible(),false);assert.ok(await np.locator('noscript').innerText());await nojs.close();
 await fs.writeFile(path.join(output,'libre-request-redesign-review.json'),JSON.stringify({checks,success:true,validation:true,doubleSubmit:true,retainedAfterErrors:true,noJsFallback:true,receiptFocusAndRestart:true,privacyDisclosureKeyboard:true,mockedServices:true},null,2));
 console.log('PASS: 5 widths, keyboard review/privacy disclosures, data retention, labels/focus, validation, one submit, success, recoverable/uncertain/network failures, no-JS fallback. Browser services mocked; live CAPTCHA is separate.');
}finally{await browser.close();}
