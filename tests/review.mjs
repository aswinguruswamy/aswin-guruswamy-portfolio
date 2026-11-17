// EXPLAIN: visual review script: screenshots of every width, both modes and the main interactions in /tmp/rev, for a person to look at.
import { chromium } from '@playwright/test';
import { start, URL_BASE } from './server.mjs';
const s=await start(4410); const b=await chromium.launch();
const shots=[];
async function view(name,w,h,scheme,path,act){ const ctx=await b.newContext({viewport:{width:w,height:h},colorScheme:scheme}); const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto(URL_BASE(4410)+path); await p.evaluate(()=>document.fonts.ready); if(act) await act(p); await p.waitForTimeout(250);
 await p.screenshot({path:`/tmp/rev/${name}.png`,fullPage:true}); if(errs.length) console.log(name,'ERR',errs); await ctx.close(); }
for (const w of [768,1024,1280,1920]) await view(`home-${w}`,w,900,'light','');
await view('home-1024-dark',1024,900,'dark','');
await view('home-320',320,700,'light','');
await view('home-320-showall',320,700,'light','',async p=>{await p.click('.more')});
await view('proj-390',390,800,'light','projects/monte-carlo-delivery-forecast/');
await view('proj-1024',1024,800,'dark','projects/pm-benchmark/');
await view('404-1440',1440,800,'light','nope');
await view('404-390',390,800,'dark','nope');
await view('menu-320-dark',320,640,'dark','',async p=>{await p.click('.menu-btn')});
await view('copy-fail-1440',1440,700,'light','',async p=>{await p.evaluate(()=>{Object.defineProperty(navigator,'clipboard',{value:undefined})}); await p.click('.side [data-u]')});
await b.close(); s.close(); console.log('done');
