import playwright from '/Users/justaquib/.npm/_npx/13ab0715f9f30c2e/node_modules/playwright/index.js';

const { chromium } = playwright;

const USER = {
  id: 1,
  google_id: 'dev',
  email: 'dev@example.com',
  name: 'Dev Learner',
  picture: null,
  tenant_id: 1,
  role: 'trainer',
  is_systemadmin: false,
  created_at: '2026-01-01T00:00:00Z',
};

const STATE = {
  model_name: 'Neural Word Model',
  description:
    'A from-scratch transformer trained on this learner’s own words. It predicts the next word from the words before it, and it was measured on held-out sentences.',
  backend: 'neural',
  backend_reason: 'The neural backend scored better on held-out sentences.',
  stage: 'Nursery',
  current_stage_id: 'nursery',
  passed_stages: [],
  vocabulary_size: 24,
  foundation_lessons: 2,
  trainer_lessons: 2,
  sentence_count: 14,
  token_count: 96,
  transition_count: 70,
  next_words: [],
  generated_example: null,
  stages: [
    {
      id: 'nursery',
      title: 'Nursery',
      description: 'First ideas.',
      subjects: ['Language', 'Science'],
      lesson_count: 3,
      completed: false,
      attempt_count: 0,
      pass_count: 0,
    },
    {
      id: 'kg',
      title: 'Kindergarten',
      description: 'Simple sentences.',
      subjects: ['Language'],
      lesson_count: 0,
      completed: false,
      attempt_count: 0,
      pass_count: 0,
    },
  ],
  letters: 'abcdefghijklmnopqrstuvwxyz',
  word_cards: [
    {
      word: 'apple',
      meaning: 'A round fruit with red or green skin.',
      dictionary_meaning: 'The fruit of the apple tree.',
    },
    { word: 'circle', meaning: 'A round shape with no corners.' },
  ],
  examples: [
    { text: 'The red apple is on the table.', kind: 'foundation' },
    { text: 'I can draw a circle.', kind: 'trainer' },
  ],
  lesson_cards: [
    {
      id: 'lesson-1',
      question: 'What does apple mean?',
      answer: 'An apple is a round fruit with red or green skin.',
      kind: 'trainer',
      grade_id: 'nursery',
      subject: 'Language',
      subjects: ['Language'],
      confidence: 0.82,
    },
    {
      id: 'lesson-2',
      question: 'What is a circle?',
      answer: 'A circle is a round shape with no corners.',
      kind: 'trainer',
      grade_id: 'nursery',
      subject: 'Science',
      subjects: ['Science'],
      confidence: 0.67,
    },
    {
      id: 'starter-1',
      question: 'What day comes after Monday?',
      answer: 'Tuesday comes after Monday.',
      kind: 'foundation',
      grade_id: 'nursery',
      subject: 'Language',
      subjects: ['Language'],
      confidence: 1,
    },
  ],
  trainer_answers: [
    {
      id: 1,
      question: 'How do apples grow?',
      answer: 'Apples grow on trees, starting from blossoms.',
      confidence: 0.9,
    },
  ],
  active_test: null,
  test_history: [],
};

const DUPLICATES = { groups: [], total_questions: 3, duplicate_count: 0 };

const browser = await chromium.launch({ channel: 'chrome' });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

await context.addInitScript(
  ([token, user, appearance]) => {
    localStorage.setItem('assistance.token.v1', token);
    localStorage.setItem('assistance.user.v1', user);
    localStorage.setItem('assistance.appearance.v1', appearance);
  },
  [
    'dev-token',
    JSON.stringify(USER),
    JSON.stringify({ colorMode: 'dark', palette: 'frost', textSize: 'medium' }),
  ],
);

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
    body: JSON.stringify({ chunks: 12, faqs: 3, pending: 0 }),
  }),
);
await context.route('**/language-model/state**', (route) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(STATE) }),
);
await context.route('**/language-model/lessons/duplicates**', (route) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(DUPLICATES) }),
);

const page = await context.newPage();
const errors = [];
const failures = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});
page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
page.on('response', (response) => {
  if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`);
});

const layout = async () => {
  const result = await page.evaluate(() => {
    const pageEl = document.querySelector('.language-learning-page');
    const tabs = document.querySelector('.learner-tabs');
    const search = document.querySelector('.learner-search-card');
    const readout = document.querySelector('.learner-readout');
    return {
      firstChild: pageEl?.firstElementChild?.className ?? null,
      intro: !!document.querySelector('.language-model-intro'),
      searchInOverview: !!search,
      tabsTop: tabs ? Math.round(tabs.getBoundingClientRect().top) : null,
      searchTop: search ? Math.round(search.getBoundingClientRect().top) : null,
      readout: readout?.textContent?.replace(/\s+/g, ' ').trim() ?? null,
      tabCount: document.querySelectorAll('.learner-tabs [role="tab"]').length,
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      scrollHeight: document.documentElement.scrollHeight,
      innerHeight: window.innerHeight,
      textSize: document.documentElement.dataset.textSize,
    };
  });
  return result;
};

await page.goto('http://localhost:4200/learner', { waitUntil: 'networkidle' });
await page.waitForSelector('.learner-tabs');
console.log('overview', JSON.stringify(await layout()));
await page.screenshot({ path: './verify-learner-overview.png', fullPage: false });

await page.locator('#learner-tab-knowledge').click();
await page.waitForSelector('.learner-search-card');
console.log('knowledge', JSON.stringify(await layout()));

await page.locator('.learner-search-form input').fill('apple');
await page.waitForSelector('.learner-search-row');
const searchState = await page.evaluate(() => ({
  matches: document.querySelector('.learner-badges .grade-qa-total')?.textContent?.trim() ?? null,
  rows: document.querySelectorAll('.learner-search-row').length,
  about: document.querySelector('.learner-about summary')?.textContent?.trim() ?? null,
}));
console.log('search', JSON.stringify(searchState));
await page.screenshot({ path: './verify-learner-knowledge.png', fullPage: false });

await page.setViewportSize({ width: 390, height: 844 });
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(200);
console.log('narrow', JSON.stringify(await layout()));
await page.screenshot({ path: './verify-learner-narrow.png', fullPage: false });

await page.evaluate(() => {
  document.documentElement.dataset.textSize = 'large';
});
await page.waitForTimeout(100);
console.log('narrow large', JSON.stringify(await layout()));
await page.screenshot({ path: './verify-learner-narrow-large.png', fullPage: false });

await page.setViewportSize({ width: 1440, height: 900 });
await page.evaluate(() => {
  const root = document.documentElement;
  root.dataset.colorMode = 'light';
  root.dataset.theme = 'mint';
  root.dataset.textSize = 'medium';
  window.scrollTo(0, 0);
});
await page.waitForTimeout(100);
await page.locator('#learner-tab-overview').click();
await page.evaluate(() => window.scrollTo(0, 0));
console.log('light overview', JSON.stringify(await layout()));
await page.screenshot({ path: './verify-learner-light-overview.png', fullPage: false });
await page.locator('#learner-tab-knowledge').click();
await page.waitForSelector('.learner-search-card');
await page.evaluate(() => window.scrollTo(0, 0));
await page.screenshot({ path: './verify-learner-light.png', fullPage: false });

console.log('failures', JSON.stringify(failures));
console.log('errors', JSON.stringify(errors));
await browser.close();
