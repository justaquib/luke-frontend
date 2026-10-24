export interface PageInfo {
  /** The page name the top bar shows, which can differ from the panel title. */
  name: string;
  title: string;
  scope: string;
  description: string;
}

const PAGES: Readonly<Record<string, PageInfo>> = {
  '/chat': {
    name: 'Chat',
    title: 'Chat',
    scope: 'Assistant',
    description:
      'Ask the assistant what it has learned, and watch the answer come from the engine.',
  },
  '/dashboard/trainer': {
    name: 'Training room',
    title: 'Training room',
    scope: 'Model builder',
    description:
      'Teach the model by hand: approve answers, merge near-duplicates, and upload the documents it learns from.',
  },
  '/dashboard/parenting': {
    name: 'Parenting coach',
    title: 'Parenting coach',
    scope: 'Model builder',
    description:
      'Talk through a parenting situation and let the coach answer from the lessons it has learned.',
  },
  '/dashboard/learner': {
    name: 'Language learner',
    title: 'Language learner',
    scope: 'Model builder',
    description:
      'Teach the learner by grade, ask it school-style questions, and watch what it learns.',
  },
  '/dashboard/brain': {
    name: 'Assistance brain',
    title: 'Neural engine',
    scope: 'Model builder',
    description:
      'What the brain has learned, what it can do on its own, and what it still needs to be taught.',
  },
  '/dashboard/design': {
    name: 'Workspace design',
    title: 'Workspace design',
    scope: 'Model builder',
    description: 'The palette, the frame and the measurements every dashboard page inherits.',
  },
  '/dashboard/settings': {
    name: 'Settings',
    title: 'Settings',
    scope: 'Engine setting',
    description:
      'The engine connection, the live sources it may fall back to, and how this workspace looks.',
  },
  '/dashboard/tenants': {
    name: 'Tenants',
    title: 'Tenants',
    scope: 'Model builder',
    description: 'Every workspace this engine serves, and the packages the product is built with.',
  },
};

const DASHBOARD_PREFIX = '/dashboard';

const DASHBOARD_FALLBACK: PageInfo = {
  name: 'Model builder',
  title: 'Model builder',
  scope: 'Model builder',
  description: 'Every page that trains, measures and runs the model.',
};

const ASSISTANT_FALLBACK: PageInfo = {
  name: 'Assistant',
  title: 'Assistant',
  scope: 'Assistant',
  description: 'The assistant surface of this workspace.',
};

function cleanPath(url: string): string {
  const path = url.split('?')[0].split('#')[0].replace(/\/+$/, '');
  return path || '/';
}

/** The name, surface and one-line description of the page the URL opens. */
export function pageInfoForUrl(url: string): PageInfo {
  const path = cleanPath(url);
  if (PAGES[path]) return PAGES[path];
  return path.startsWith(DASHBOARD_PREFIX) ? DASHBOARD_FALLBACK : ASSISTANT_FALLBACK;
}
