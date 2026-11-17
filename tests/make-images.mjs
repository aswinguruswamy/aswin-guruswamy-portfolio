// EXPLAIN: makes the link-preview card (public/og.png, 1200 x 630) and the PNG icons (32 px and 180 px)
// from the avatar art, with the page fonts. Run again after a change to the avatar or the title.
import fs from 'node:fs';
import { chromium } from '@playwright/test';
const raw = fs.readFileSync('src/components/Avatar.astro', 'utf8').split('---').slice(2).join('---');
const avatar = (size, id) => raw
  .replace(/<svg[^>]*>/, `<svg width="${size}" height="${size}" viewBox="0 0 132 132" xmlns="http://www.w3.org/2000/svg">`)
  .replace('id={clip}', `id="${id}"`).replace('clip-path={`url(#${clip})`}', `clip-path="url(#${id})"`);
const font = (f) => 'data:font/woff2;base64,' + fs.readFileSync(f).toString('base64');
const css = `@font-face{font-family:Bangers;src:url(${font('node_modules/@fontsource/bangers/files/bangers-latin-400-normal.woff2')})}
@font-face{font-family:Inter;font-weight:700;src:url(${font('node_modules/@fontsource/inter/files/inter-latin-700-normal.woff2')})}
@font-face{font-family:Inter;font-weight:400;src:url(${font('node_modules/@fontsource/inter/files/inter-latin-400-normal.woff2')})}
body{margin:0}`;
const og = `<style>${css}
.c{width:1200px;height:630px;box-sizing:border-box;background:#7fb8aa;padding:48px;font-family:Inter}
.p{height:100%;box-sizing:border-box;background:#f5f3ee;border:4px solid #1e2422;border-radius:28px;box-shadow:8px 8px 0 rgba(30,36,34,.2);display:flex;align-items:center;gap:56px;padding:56px}
h1{font-family:Bangers;font-weight:400;letter-spacing:.06em;font-size:96px;line-height:1;margin:0;color:#1e2422}
.t{font-size:40px;font-weight:700;color:#1e2422;margin-top:14px}.l{font-size:30px;color:#57605c;margin-top:8px}
.b{display:flex;gap:12px;margin-top:28px}.b span{font-size:28px;font-weight:700;border:3px solid #1e2422;border-radius:999px;padding:6px 20px;background:#fff;color:#1e2422}</style>
<div class="c"><div class="p">${avatar(300, 'o')}<div><h1>ASWIN GURUSWAMY</h1><div class="t">Project Manager</div><div class="l">Greater Toronto Area, Canada</div>
<div class="b"><span>PMP</span><span>CSM</span><span>CSPO</span></div></div></div></div>`;
const icon = (s) => `<style>body{margin:0}</style><div style="width:${s}px;height:${s}px;background:#b5573f;border-radius:${Math.round(s * 0.18)}px;display:flex;align-items:center;justify-content:center">${avatar(Math.round(s * 0.86), 'i' + s)}</div>`;
const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME, args: ['--no-sandbox'] } : {});
const shot = async (html, w, h, path) => { const p = await b.newPage({ viewport: { width: w, height: h } }); await p.setContent(html); await p.evaluate(() => document.fonts.ready); await p.screenshot({ path, omitBackground: true }); await p.close(); };
await shot(og, 1200, 630, 'public/og.png');
await shot(icon(180), 180, 180, 'public/apple-touch-icon.png');
await shot(icon(32), 32, 32, 'public/favicon-32.png');
await b.close();
console.log('made public/og.png, public/apple-touch-icon.png, public/favicon-32.png');
