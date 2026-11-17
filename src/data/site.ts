// EXPLAIN: all text and links of the page live in this one file, so a content change needs no layout change.

export type Status = 'Live' | 'In progress' | 'Planned';

export interface Project {
  slug: string;
  name: string;
  line: string; // one-line problem or purpose (card text)
  status: Status;
  image?: string; // file in public/img
  version?: string;
  links?: { label: string; href: string }[];
  page?: {
    problem: string;
    approach: string;
    role: string;
    stack: string;
    outcome: string;
  };
}

export const profile = {
  name: 'Aswin Guruswamy',
  title: 'Project Manager',
  location: 'Greater Toronto Area, Canada',
  badges: ['PMP', 'CSM', 'CSPO', 'MS Computer Engineering (USA)', 'BE ECE'],
  summary:
    'I run software projects from charter to release, and I build PM tools with AI to make that work faster and safer.',
  email: 'aswinguruswamy@gmail.com',
  linkedin: 'https://www.linkedin.com/in/aswinguruswamy',
  github: 'https://github.com/aswinguruswamy',
  ladder: ['Portfolio Manager', 'Program Manager', 'Project Manager'], // top = goal, bottom = now
};

const gh = (repo: string) => `https://github.com/aswinguruswamy/${repo}`;

export const pmTools: Project[] = [
  {
    slug: 'monte-carlo-delivery-forecast',
    name: 'Monte Carlo Delivery Forecast',
    line: 'Delivery dates at 50%, 85% and 95% confidence',
    status: 'Live',
    image: 'monte-carlo-forecast.png',
    version: 'v1.2.0',
    links: [
      { label: 'Live demo', href: 'https://mcf-forecast.streamlit.app' },
      { label: 'Repository', href: gh('monte-carlo-delivery-forecast') },
    ],
    page: {
      problem:
        'A team asks "when will the next 40 items be done?" and gets one velocity date that sounds certain but often slips.',
      approach:
        "The tool runs thousands of simulations on the team's past throughput and gives dates at 50%, 85% and 95% confidence, next to the usual velocity date. A back-test on real open-source projects compares the two methods.",
      role: 'PM, sponsor and product owner: scope, decisions, acceptance and release. Claude built and tested the code.',
      stack: 'Python, Streamlit, pytest, GitHub Actions, Claude API (optional plain-words explanation).',
      outcome: 'Version 1.2.0 is live with a public demo, a Jira CSV import, and back-tests on 29 and 39 real projects.',
    },
  },
  {
    slug: 'raid-log-extractor',
    name: 'RAID Log Extractor',
    line: 'Risks, assumptions, issues and dependencies from notes',
    status: 'Live',
    image: 'raid-log-extractor.png',
    version: 'v1.0.0',
    links: [
      { label: 'Live demo', href: 'https://raid-log-extractor.streamlit.app/' },
      { label: 'Repository', href: gh('raid-log-extractor') },
    ],
    page: {
      problem:
        'After a call, a PM writes the RAID log by hand. It takes minutes, items get lost, and owners and dates get guessed.',
      approach:
        'Claude reads the call notes and finds risks, assumptions, issues, dependencies, actions and decisions. Each item has a source quote that the code checks word for word. When the notes give no owner or date, the tool writes "Not stated" and does not guess.',
      role: 'PM, sponsor and product owner. Claude built and tested the code.',
      stack: 'Python, Streamlit, Claude API, pytest, GitHub Actions.',
      outcome:
        'Live demo with no sign-in. On 10 sample calls: 100% recall, 100% precision, 0 invented owners or dates. A log takes about 27 seconds, not 6 to 8 minutes.',
    },
  },
  {
    slug: 'status-report-generator',
    name: 'Weekly Status Report Generator',
    line: 'Weekly status with RAG from Jira and GitHub',
    status: 'Live',
    image: 'status-report-generator.png',
    version: 'v1.0.0',
    links: [
      { label: 'Sample report', href: gh('status-report-generator/blob/main/examples/DEMO-2026-W43.md') },
      { label: 'Repository', href: gh('status-report-generator') },
    ],
    page: {
      problem:
        'Each week a PM reads Jira, counts the work, picks a status colour and writes a summary. It takes time, and 2 PMs can give the same week different colours.',
      approach:
        'Fixed rules set the RAG status, so the same week always gets the same colour. Claude writes only a short summary of the facts, and the tool removes any AI text that breaks a rule.',
      role: 'PM, sponsor and product owner. Claude built and tested the code.',
      stack: 'Python, Jira Cloud API (read only), Claude API, Markdown and HTML output.',
      outcome: 'A full weekly report in less than 2 minutes, also when the AI is not available.',
    },
  },
  {
    slug: 'pm-toolkit-plugin',
    name: 'pm-toolkit plugin',
    line: 'Runs the PM life cycle in Claude',
    status: 'In progress',
    image: 'pm-toolkit-readme.png',
  },
  {
    slug: 'pm-benchmark',
    name: 'PM Benchmark',
    line: '108 items to score a software project',
    status: 'Live',
    image: 'pm-benchmark-items.png',
    links: [
      { label: 'The checklist', href: gh('pm-benchmark-software-projects/blob/main/benchmark.md') },
      { label: 'Repository', href: gh('pm-benchmark-software-projects') },
    ],
    page: {
      problem:
        'Teams forget PM work that the standards expect, and gate reviews and health checks use a different list each time.',
      approach:
        '108 items in 11 phases, from discovery to the benefits after release. Each item has an output, a "done when" check, a timing, the PM role, and the standard it aligns with (PMBOK, PRINCE2, Scrum, ISO 12207, ITIL, DORA, NIST SSDF).',
      role: 'Author. Claude helped with the research and the checks.',
      stack: 'Markdown. Gates, project types and templates in the same repository.',
      outcome: 'Used for gate reviews and a published health check of a real project.',
    },
  },
  {
    slug: 'ai-project-gap-detector',
    name: 'AI Project Gap Detector',
    line: 'Finds the PM gaps in an AI project',
    status: 'Planned',
  },
  {
    slug: 'workshop-build-progress',
    name: 'Workshop: Build Progress',
    line: 'Shows the build progress on top of a web page',
    status: 'Planned',
  },
];

export const apps: Project[] = [
  {
    slug: 'notification-subscription-dashboard',
    name: 'Notification and Subscription Dashboard',
    line: 'One place to see and manage notifications and subscriptions',
    status: 'Planned',
  },
  { slug: 'selfbet', name: 'SelfBet', line: 'Basketball self-betting web app', status: 'Planned' },
  {
    slug: 'yaw-damper-simulation',
    name: 'Yaw Damper Simulation',
    line: 'Interactive yaw damper simulation',
    status: 'Planned',
  },
  { slug: 'ame-courseware', name: 'AME Courseware', line: 'Offline aircraft maintenance courseware', status: 'Planned' },
];

export const experience = [
  { org: 'Logofn Solutions LLP', role: 'Project Manager · Oct 2022 – now' },
  { org: 'Amazon', role: 'Data Content Associate – Kindle Operations (Notification Team) · Oct 2020 – Oct 2022' },
  {
    org: 'Project management background',
    role: 'PMP, CSM and CSPO. Plans, risks, stakeholders and delivery for software projects, with the records in Jira, Confluence and GitHub.',
  },
];

export const skills = [
  {
    head: 'PM skills',
    text: 'Risk · Stakeholders · Budget · Agile and Scrum · Systems thinking · Business acumen · AI delivery',
  },
  {
    head: 'AI skills',
    text: 'Claude Code and sub-agents · Prompt and evaluation design · AI features with checks against made-up facts',
  },
  { head: 'Tools', text: 'Jira · Confluence · GitHub · Figma · Miro · Claude' },
];

export const allProjects = [...pmTools, ...apps];
export const withPage = allProjects.filter((p) => p.page);
