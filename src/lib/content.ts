// EXPLAIN: reads the Markdown collections and gives the pages the same data they used before (profile, pmTools, apps, ...).
// It also checks what a schema cannot: unique order numbers in a row, hidden badges that exist, a body text where one is needed.
import { getCollection } from 'astro:content';

export type Status = 'Live' | 'In progress' | 'Planned';
export interface Project {
  slug: string; name: string; line: string; status: Status; group: 'pm-tools' | 'apps'; order: number;
  epic?: string; image?: string; version?: string;
  links?: { label: string; href: string }[];
  page?: { problem: string; approach: string; role: string; stack: string; outcome: string };
}

const body = (e: { id: string; body?: string }, need: boolean) => {
  const t = (e.body ?? '').trim();
  if (need && !t) throw new Error(`${e.id}.md: write the text below the --- line`);
  return t;
};
const byOrder = <T extends { order: number }>(list: T[], what: string) => {
  const seen = new Set<number>();
  for (const x of list) { if (seen.has(x.order)) throw new Error(`${what}: order ${x.order} is used twice`); seen.add(x.order); }
  return [...list].sort((a, b) => a.order - b.order);
};

const projectEntries = await getCollection('projects');
const all: Project[] = projectEntries.map((e) => ({ slug: e.id, ...e.data }));
export const pmTools = byOrder(all.filter((p) => p.group === 'pm-tools'), 'projects (pm-tools)');
export const apps = byOrder(all.filter((p) => p.group === 'apps'), 'projects (apps)');
export const allProjects = [...pmTools, ...apps];
export const withPage = allProjects.filter((p) => p.page);

const [prof] = await getCollection('profile');
if (!prof) throw new Error('src/content/profile/profile.md is missing');
for (const h of prof.data.hiddenBadges) if (!prof.data.badges.includes(h)) throw new Error(`profile.md: hidden badge "${h}" is not in badges`);
export const profile = { ...prof.data, summary: body(prof, true) };

export const experience = byOrder((await getCollection('experience')).map((e) => ({ ...e.data, text: body(e, true) })), 'experience');
export const skills = byOrder((await getCollection('skills')).map((e) => ({ ...e.data, text: body(e, !e.data.tools) })), 'skills');
