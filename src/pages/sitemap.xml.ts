// EXPLAIN: sitemap.xml lists every page, so search engines find the project pages (REQ-21).
import { withPage } from '../lib/content';
export function GET({ site }: { site: URL }) {
  const base = new URL(import.meta.env.BASE_URL, site).href;
  const urls = [base, ...withPage.map((p) => `${base}projects/${p.slug}/`)];
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}\n</urlset>\n`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml' } });
}
