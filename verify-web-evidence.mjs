import playwright from '/Users/justaquib/.npm/_npx/13ab0715f9f30c2e/node_modules/playwright/index.js';

const { chromium } = playwright;

const USER = {
  id: 1,
  google_id: 'dev',
  email: 'dev@example.com',
  name: 'Dev Trainer',
  picture: null,
  tenant_id: 1,
  role: 'trainer',
  is_systemadmin: false,
  created_at: '2026-01-01T00:00:00Z',
};

const POLICY = {
  enabled: true,
  provider: 'searxng',
  provider_name: 'SearXNG',
  endpoint: 'http://search.lab:8888',
  allowlist: ['docs.example.com', 'learn.example.org'],
  ttl_hours: 168,
  min_score: 0.35,
  results: 5,
  providers: [
    { id: 'searxng', name: 'SearXNG' },
    { id: 'brave', name: 'Brave Search' },
    { id: 'tavily', name: 'Tavily' },
  ],
  max_sources: 8,
};

const SOURCES = [
  {
    id: 1,
    url: 'https://docs.example.com/guide/training',
    domain: 'docs.example.com',
    enabled: true,
    title: 'Training a small word model',
    status: 'indexed',
    checked_at: '2026-10-28T03:17:00Z',
  },
  {
    id: 2,
    url: 'https://learn.example.org/faq',
    domain: 'learn.example.org',
    enabled: true,
    title: 'Frequently asked questions',
    status: 'superseded',
    checked_at: '2026-10-27T03:17:00Z',
  },
];

const STATUS = { policy: POLICY, sources: SOURCES, counts: { indexed: 3, candidate: 1, superseded: 1 } };

const FOUNDATION = {
  installed: true,
  identity: {
    name: 'Qwen2.5-0.5B-Instruct',
    version: 'main',
    base_model: 'Qwen/Qwen2.5-0.5B-Instruct',
    revision: 'abc1234',
    license: 'apache-2.0',
    parameters: 494032768,
    context_limit: 32768,
    weight_sha256: '0'.repeat(64),
    weight_bytes: 988097824,
    dtypes: ['bfloat16'],
    display: 'Qwen2.5 0.5B Instruct',
  },
  error: null,
  loaded: true,
  device: 'mps',
  memory_bytes: 988097824,
};

const MODEL_SETTINGS = {
  name: 'Luke',
  start_level: '0.0.1',
  level: '0.0.1',
  defaults: { name: 'Luke', start_level: '0.0.1' },
  levels: [{ level: '0.0.1', name: 'Newborn', title: 'Luke 0.0.1', description: 'Seed' }],
};

const MODELS = {
  default: 'luke',
  models: [
    { id: 'luke', name: 'Luke', kind: 'luke', detail: 'Answers from the taught material.', ready: true },
  ],
};

const PAGE_TEXT =
  'A small word model learns from short passages. It reads each passage, counts the words that follow each other, and uses those counts to write the next word.';

const WEB_ANSWER = {
  question: 'How does a small word model learn?',
  source: 'web',
  answer: PAGE_TEXT,
  hits: [
    {
      text: PAGE_TEXT,
      metadata: {
        source: 'web',
        url: 'https://docs.example.com/guide/training',
        title: 'Training a small word model',
        as_of: '2026-10-28',
        verified: 'false',
      },
      distance: 0.19,
    },
  ],
  entities: [],
  pending_id: null,
  app: {
    title: 'Training a small word model',
    url: 'https://docs.example.com/guide/training',
    as_of: '2026-10-28',
    trust: 'official',
    verified: 'false',
  },
  distance: 0.19,
  confidence: 0.81,
  citations: [
    {
      index: 1,
      source: 'web',
      label: 'Training a small word model',
      excerpt: PAGE_TEXT.slice(0, 240),
    },
  ],
};

const STREAM = [
  'event: connecting',
  `data: ${JSON.stringify({
    source: 'web',
    outcome: 'match',
    detail:
      'Quoted “Training a small word model” fetched on 2026-10-28; it is unverified and not taught material.',
    matched_question: 'Training a small word model',
  })}`,
  '',
  'event: answer',
  `data: ${JSON.stringify(WEB_ANSWER)}`,
  '',
  'event: done',
  'data: {}',
  '',
  '',
].join('\n');

const browser = await chromium.launch({ channel: 'chrome' });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });

await context.addInitScript(([token, user, appearance]) => {
  localStorage.setItem('assistance.token.v1', token);
  localStorage.setItem('assistance.user.v1', user);
  localStorage.setItem('assistance.appearance.v1', appearance);
}, [
  'dev-token',
  JSON.stringify(USER),
  JSON.stringify({ colorMode: 'dark', palette: 'frost', textSize: 'medium' }),
]);

const json = (route, body, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

const unhandled = [];
await context.route('**/*', (route) => {
  const url = route.request().url();
  if (!url.startsWith('http://localhost:8000')) return route.fallback();
  unhandled.push(`${route.request().method()} ${url}`);
  return json(route, {});
});

await context.route('**/auth/refresh', (route) => json(route, { access_token: 'dev' }));
await context.route('**/auth/me', (route) => json(route, USER));
await context.route('**/health', (route) => json(route, { status: 'ok' }));
await context.route('**/language-model/foundation', (route) => json(route, FOUNDATION));
await context.route('**/language-model/settings', (route) => json(route, MODEL_SETTINGS));
await context.route('**/language-model/models', (route) => json(route, MODELS));
await context.route('**/language-model/state', (route) =>
  json(route, { level: '0.0.1', words: 214, training: false }),
);
await context.route('**/language-model/brain**', (route) =>
  json(route, { training: false, trained: true, vocabulary: 214, progress: null }),
);
await context.route('**/language-model/predict', (route) =>
  json(route, {
    model: 'luke',
    prefix: 'How does a small word model learn?',
    tokens: ['How', 'does', 'a', 'small', 'word', 'model', 'learn'],
    attention: [
      [1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1],
      [0.1, 1, 0.1, 0.1, 0.1, 0.1, 0.1],
      [0.1, 0.1, 1, 0.1, 0.1, 0.1, 0.1],
      [0.1, 0.1, 0.1, 1, 0.1, 0.1, 0.1],
      [0.1, 0.1, 0.1, 0.1, 1, 0.1, 0.1],
      [0.1, 0.1, 0.1, 0.1, 0.1, 1, 0.1],
      [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 1],
    ],
    next: [{ word: 'from', probability: 0.42, count: 7 }],
  }),
);

let webStatusMode = 'ok';
await context.route('**/web/status', (route) => {
  if (webStatusMode === 'error') {
    return json(route, { detail: 'The workspace policy could not be read.' }, 500);
  }
  return json(route, STATUS);
});
await context.route('**/web/settings', (route) => json(route, POLICY));
await context.route('**/web/sources', (route) => json(route, SOURCES[0], 201));
await context.route('**/web/sources/*', (route) => json(route, { deleted: 1 }));
await context.route('**/web/refresh', (route) =>
  json(route, {
    report: { checked: 2, changed: 1, unchanged: 1, failed: 0, expired: 0 },
    sources: SOURCES,
  }),
);
await context.route('**/query/stream', (route) =>
  route.fulfill({ status: 200, contentType: 'text/event-stream', body: STREAM }),
);

const page = await context.newPage();
const errors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});
page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));

const overflow = () =>
  page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));

// Settings: policy, sources, counts, then a measured refresh.
await page.goto('http://localhost:4200/dashboard/settings', { waitUntil: 'networkidle' });
await page.waitForSelector('app-web-sources .web-sources');
await page.locator('app-web-sources').scrollIntoViewIfNeeded();
await page.waitForTimeout(250);
console.log('settings 1440', await page.evaluate(() => ({
  title: document.querySelector('#settings-web-title')?.textContent,
  provider: document.querySelector('app-web-sources select')?.value,
  sources: [...document.querySelectorAll('app-web-sources .web-domain')].map((el) => el.textContent),
  states: [...document.querySelectorAll('app-web-sources .web-state')].map((el) => el.textContent),
  counts: document.querySelector('app-web-sources .web-actions .meta')?.textContent?.replace(/\s+/g, ' ').trim(),
  sourcesFact: [...document.querySelectorAll('.engine-facts .fact')]
    .map((fact) => ({
      label: fact.querySelector('dt')?.textContent?.trim(),
      value: fact.querySelector('dd')?.textContent?.trim(),
      note: fact.querySelector('.note')?.textContent?.trim(),
    }))
    .find((fact) => fact.label === 'Live sources'),
  refreshAllowed: !document.querySelector('app-web-sources .web-actions button')?.disabled,
})));
await page.locator('app-web-sources').screenshot({ path: './verify-web-settings-1440.png' });
console.log('overflow 1440', await overflow());

await page.setViewportSize({ width: 1024, height: 900 });
await page.waitForTimeout(200);
await page.locator('app-web-sources').screenshot({ path: './verify-web-settings-1024.png' });
console.log('overflow 1024', await overflow());

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(200);
await page.locator('app-web-sources').screenshot({ path: './verify-web-settings-390.png' });
console.log('overflow 390', await overflow());

await page.setViewportSize({ width: 1440, height: 1000 });
await page.locator('app-web-sources .web-actions button').click();
await page.waitForFunction(() =>
  [...document.querySelectorAll('app-web-sources .meta')].some((el) =>
    /checked \d+ · changed \d+/.test(el.textContent ?? ''),
  ),
);
console.log('refresh report', await page.evaluate(() =>
  [...document.querySelectorAll('app-web-sources .meta')]
    .map((el) => el.textContent?.replace(/\s+/g, ' ').trim())
    .find((text) => /checked \d+ · changed/.test(text ?? '')),
));
await page.locator('app-web-sources').screenshot({ path: './verify-web-settings-refresh-1440.png' });

// The error state: the policy cannot be read.
webStatusMode = 'error';
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('app-web-sources .web-error');
await page.locator('app-web-sources').scrollIntoViewIfNeeded();
await page.waitForTimeout(200);
console.log('error state', await page.evaluate(() =>
  document.querySelector('app-web-sources .web-error')?.textContent?.replace(/\s+/g, ' ').trim(),
));
await page.locator('app-web-sources').screenshot({ path: './verify-web-settings-error-1440.png' });
webStatusMode = 'ok';

// Chat: three live sources, then a web answer with its date and citation.
await page.goto('http://localhost:4200/chat', { waitUntil: 'networkidle' });
await page.waitForSelector('app-chat-composer .sources summary');
await page.locator('app-chat-composer .sources summary').click();
await page.waitForSelector('app-chat-composer .sources-menu');
console.log('sources menu', await page.evaluate(() => ({
  label: document.querySelector('app-chat-composer .tool-label')?.textContent?.trim(),
  rows: [...document.querySelectorAll('app-chat-composer .source-row')].map((row) => ({
    text: row.textContent?.trim(),
    checked: row.querySelector('input')?.checked,
  })),
})));
await page.locator('app-chat-composer .sources-menu').screenshot({
  path: './verify-web-sources-menu-1440.png',
});
const menuBox = await page.locator('app-chat-composer .sources-menu').boundingBox();
await page.screenshot({
  path: './verify-web-sources-menu-context-1440.png',
  clip: {
    x: Math.max(0, menuBox.x - 80),
    y: Math.max(0, menuBox.y - 20),
    width: Math.min(560, 1440 - Math.max(0, menuBox.x - 80)),
    height: Math.min(420, 1000 - Math.max(0, menuBox.y - 20)),
  },
});

await page.locator('app-chat-composer textarea').click();
await page.locator('app-chat-composer textarea').fill('How does a small word model learn?');
await page.locator('app-chat-composer textarea').press('Enter');
await page.waitForFunction(() =>
  [...document.querySelectorAll('app-chat-message .provenance-value')].some(
    (el) => el.textContent?.trim() === 'Web page (unverified)',
  ),
);
await page.waitForTimeout(400);
console.log('web answer', await page.evaluate(() => {
  const meta = [...document.querySelectorAll('app-chat-message')].at(-1)?.querySelector('.provenance');
  return {
    label: meta?.querySelector('.provenance-value')?.textContent?.trim(),
    asOf: [...(meta?.querySelectorAll('.provenance-metric') ?? [])]
      .map((el) => el.textContent?.replace(/\s+/g, ' ').trim())
      .find((text) => text?.startsWith('as of')),
    text: [...document.querySelectorAll('app-chat-message .msg-text, app-chat-message app-answer-reveal')]
      .at(-1)?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 90),
  };
}));
await page.locator('app-chat-message').last().screenshot({ path: './verify-web-answer-1440.png' });

await page.locator('app-chat-message').last().locator('button[aria-label="Answer details"]').click();
await page.waitForSelector('app-chat-answer-details .live-link');
console.log('details', await page.evaluate(() => {
  const link = document.querySelector('app-chat-answer-details .live-link');
  return {
    href: link?.getAttribute('href'),
    text: link?.textContent?.replace(/\s+/g, ' ').trim(),
    sections: [...document.querySelectorAll('app-chat-answer-details .section-label')].map((el) =>
      el.textContent?.trim(),
    ),
  };
}));
await page.screenshot({ path: './verify-web-details-1440.png' });

const liveSection = page.locator('app-chat-answer-details .detail-section', { hasText: 'Live source' });
await liveSection.scrollIntoViewIfNeeded();
await page.waitForTimeout(150);
await liveSection.screenshot({ path: './verify-web-live-source-1440.png' });
const citedSection = page.locator('app-chat-answer-details .detail-section', { hasText: 'Cited passages' });
await citedSection.scrollIntoViewIfNeeded();
await page.waitForTimeout(150);
await citedSection.screenshot({ path: './verify-web-cited-passages-1440.png' });

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(300);
console.log('chat overflow 390', await overflow());
await page.screenshot({ path: './verify-web-chat-390.png' });

console.log('unhandled', JSON.stringify(unhandled));
console.log('errors', JSON.stringify(errors));
await browser.close();
