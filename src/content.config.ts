// EXPLAIN: the content of the page lives in Markdown files under src/content (NFR-09 v1).
// Each folder is a collection with a schema: a wrong value stops the build and names the file.
import fs from 'node:fs';
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const text = z.string().trim().min(1);
const imageFile = z.string().regex(/^[\w.-]+\.(webp|png|jpg)$/).superRefine((f, ctx) => {
  const ok = fs.existsSync(new URL(`../public/img/${f}`, import.meta.url)) && fs.existsSync(new URL(`../public/img/thumb/${f}`, import.meta.url));
  if (!ok) ctx.addIssue({ code: 'custom', message: `image "${f}" is not in public/img and public/img/thumb` });
});

const projects = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/projects' }),
  schema: z.object({
    name: text,
    line: text, // one-line problem or purpose (card text)
    status: z.enum(['Live', 'In progress', 'Planned']),
    group: z.enum(['pm-tools', 'apps']),
    order: z.number().int().min(1),
    epic: z.string().regex(/^AGP-\d+$/, 'epic must be a Jira key like AGP-44').optional(),
    image: imageFile.optional(),
    version: z.string().regex(/^v\d+\.\d+\.\d+$/).optional(),
    links: z.array(z.object({ label: text, href: z.string().url() })).optional(),
    // a project page shows only when all 5 parts are written
    page: z.object({ problem: text, approach: text, role: text, stack: text, outcome: text }).strict().optional(),
  }).strict(),
});

const profile = defineCollection({
  loader: glob({ pattern: 'profile.md', base: './src/content/profile' }),
  schema: z.object({
    name: text, title: text, location: text,
    badges: z.array(text).min(1),
    hiddenBadges: z.array(text).default([]),
    emailUser: z.string().regex(/^[^@\s]+$/, 'emailUser: the part before @, without @'),
    emailDomain: z.string().regex(/^[\w-]+(\.[\w-]+)+$/, 'emailDomain: the part after @'),
    linkedin: z.string().url(), github: z.string().url(),
    ladder: z.array(text).min(2), // top = goal, bottom = now
  }).strict(),
});

const experience = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/experience' }),
  schema: z.object({ org: text, role: text, order: z.number().int().min(1) }).strict(),
});

const skills = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/skills' }),
  // items (AGP-28): an AI skill with an honest level; project = the slug of a project page that proves it (checked in lib/content.ts).
  schema: z.object({ head: text, order: z.number().int().min(1), tools: z.array(text).optional(),
    items: z.array(z.object({ label: text, level: z.enum(['basic', 'learning', 'working', 'strong']), project: z.string().regex(/^[a-z0-9-]+$/).optional() }).strict()).optional() }).strict(),
});

export const collections = { projects, profile, experience, skills };
