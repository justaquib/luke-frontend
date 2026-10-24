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

const FAQS = [
  {
    id: 1,
    question: 'How many vacation days do we get?',
    answer:
      'Everyone gets 20 paid vacation days each year, plus the public holidays in their country. Days carry over up to five.',
    status: 'approved',
    created_at: '2026-01-02T09:00:00Z',
    updated_at: '2026-02-11T10:00:00Z',
  },
  {
    id: 2,
    question: 'What is the vacation allowance?',
    answer:
      'Everyone gets 20 paid vacation days each year, plus the public holidays in their country. Days carry over up to five.',
    status: 'approved',
    created_at: '2026-01-02T09:00:00Z',
    updated_at: '2026-02-11T10:00:00Z',
  },
  {
    id: 3,
    question: 'Can I work from home?',
    answer:
      'You can work remotely two days a week. Pick the days with your team so meetings stay covered.',
    status: 'pending',
    created_at: '2026-01-03T09:00:00Z',
    updated_at: '2026-02-11T10:00:00Z',
  },
  {
    id: 4,
    question: 'What are the office hours?',
    answer:
      'The office is open from 8:00 to 18:00 on weekdays. Building access ends thirty minutes later.',
    status: 'approved',
    created_at: '2026-01-04T09:00:00Z',
    updated_at: '2026-02-11T10:00:00Z',
  },
  {
    id: 5,
    question: 'When is the office open?',
    answer:
      'The office is open from 8:00 to 18:00 on weekdays. Building access ends thirty minutes later.',
    status: 'approved',
    created_at: '2026-01-04T09:00:00Z',
    updated_at: '2026-02-11T10:00:00Z',
  },
];

const INBOX = [
  {
    id: 11,
    question: 'How do I request parental leave?',
    occurrences: 3,
    resolved: false,
    created_at: '2026-02-10T09:00:00Z',
    last_seen_at: '2026-02-12T09:00:00Z',
  },
  {
    id: 12,
    question: 'What is the holiday schedule for December?',
    occurrences: 1,
    resolved: false,
    created_at: '2026-02-11T09:00:00Z',
    last_seen_at: '2026-02-11T09:00:00Z',
  },
];

const MERGE_PREVIEW = {
  canonical_id: 1,
  canonical_question: FAQS[0].question,
  canonical_answer: FAQS[0].answer,
  matches: [
    {
      faq_id: 2,
      question: FAQS[1].question,
      answer: FAQS[1].answer,
      status: 'approved',
      distance: 0.18,
    },
    {
      faq_id: 4,
      question: 'How do I book time off?',
      answer: 'Open the people portal and submit a request at least two weeks ahead.',
      status: 'pending',
      distance: 0.42,
    },
  ],
};

const browser = await chromium.launch({ channel: 'chrome' });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

await context.addInitScript(([token, user, appearance]) => {
  localStorage.setItem('assistance.token.v1', token);
  localStorage.setItem('assistance.user.v1', user);
  localStorage.setItem('assistance.appearance.v1', appearance);
}, ['dev-token', JSON.stringify(USER), JSON.stringify({ colorMode: 'dark', palette: 'frost', textSize: 'medium' })]);

await context.route('**/auth/refresh', (route) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: '{"access_token":"dev"}' }),
);
await context.route('**/auth/me', (route) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(USER) }),
);
await context.route('**/stats', (route) =>
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ chunks: 12, faqs: FAQS.length, pending: INBOX.length }),
  }),
);
await context.route('**/faq/inbox**', (route) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(INBOX) }),
);
await context.route('**/faq/*/merge-preview', (route) =>
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(MERGE_PREVIEW),
  }),
);
await context.route('**/faq', (route) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(FAQS) }),
);
await context.route('**/documents**', (route) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
);

const page = await context.newPage();
const errors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});
page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));

await page.goto('http://localhost:4200/trainer', { waitUntil: 'networkidle' });
await page.waitForSelector('.card');

const cardMetrics = async (label) => {
  const metrics = await page.evaluate(() => {
    const card = document.querySelector('.card');
    const row = document.querySelector('.row');
    const q = document.querySelector('.row .q');
    if (!card || !row || !q) return null;
    const cs = getComputedStyle(card);
    const rs = getComputedStyle(row);
    const qs = getComputedStyle(q);
    return {
      padding: cs.padding,
      gap: cs.gap,
      radius: cs.borderRadius,
      rowGap: rs.gap,
      questionSize: qs.fontSize,
      questionColor: qs.color,
      cardHeight: Math.round(card.getBoundingClientRect().height),
    };
  });
  console.log(label, JSON.stringify(metrics));
};

await cardMetrics('inbox card');
await page.screenshot({ path: './verify-trainer-inbox.png', fullPage: false });

await page.locator('.tool-tab', { hasText: 'Trained' }).click();
await page.waitForTimeout(150);
await cardMetrics('trained card');
await page.screenshot({ path: './verify-trainer-trained.png', fullPage: false });

const mergeQuestionStyle = async (label) => {
  const style = await page.evaluate(() => {
    const el = document.querySelector('.merge-q');
    if (!el) return null;
    const cs = getComputedStyle(el);
    return {
      text: el.textContent?.trim(),
      size: cs.fontSize,
      color: cs.color,
      transform: cs.textTransform,
      weight: cs.fontWeight,
      marginBottom: cs.marginBottom,
    };
  });
  console.log(label, JSON.stringify(style));
  return style;
};

await page.locator('.faq-card .row-actions button[aria-label="Merge this answer with related ones"]').first().click();
await page.waitForTimeout(300);
await mergeQuestionStyle('merge target merge-q');
await page.screenshot({ path: './verify-trainer-merge-target.png', fullPage: false });

await page.locator('.tool-tab', { hasText: 'Merge' }).click();
await page.waitForTimeout(200);
const groupQuestion = await page.evaluate(() => {
  const el = document.querySelector('.alias-q');
  if (!el) return null;
  const cs = getComputedStyle(el);
  return { size: cs.fontSize, color: cs.color, transform: cs.textTransform };
});
console.log('alias-q', JSON.stringify(groupQuestion));
await page.screenshot({ path: './verify-trainer-merge.png', fullPage: false });

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(200);
const narrow = await page.evaluate(() => ({
  scrollWidth: document.documentElement.scrollWidth,
  innerWidth: window.innerWidth,
}));
console.log('narrow', JSON.stringify(narrow));
await page.screenshot({ path: './verify-trainer-merge-narrow.png', fullPage: false });

console.log('errors', JSON.stringify(errors));
await browser.close();
