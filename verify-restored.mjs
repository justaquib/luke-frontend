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

const TEACHER = 'hf:teacher-HuggingFaceTB-SmolLM2-135M';
const TOKENS = ['Why', 'is', 'the', 'sky', 'blue'];
const ATTENTION = [
  [1, 0.1, 0, 0, 0],
  [0.2, 1, 0.3, 0, 0],
  [0.1, 0.4, 1, 0.5, 0],
  [0, 0.2, 0.6, 1, 0.4],
  [0, 0, 0.3, 0.7, 1],
];

const SESSION = {
  id: 'verify-session',
  title: 'Why is the sky blue?',
  createdAt: Date.now() - 60000,
  updatedAt: Date.now(),
  messages: [
    {
      id: 100,
      role: 'user',
      text: 'Why is the sky blue?',
      timestamp: new Date(Date.now() - 50000).toISOString(),
    },
    {
      id: 101,
      role: 'assistant',
      text: 'Sunlight scatters off the air, and blue light scatters most, so the sky looks blue.',
      timestamp: new Date(Date.now() - 40000).toISOString(),
      source: 'lesson',
      matchDistance: 0.12,
      confidence: 1,
      model: TEACHER,
      modelName: 'SmolLM2 135M',
      intent: { matched_question: 'Why is the sky blue?', distance: 0.12 },
      hits: [
        {
          text: 'Air molecules scatter shorter, bluer wavelengths more strongly than red ones.',
          metadata: { source: 'science.pdf' },
          distance: 0.21,
        },
      ],
    },
  ],
};

const CATALOG = {
  default: 'luke',
  models: [
    {
      id: 'luke',
      name: 'Luke',
      kind: 'luke',
      detail: 'Answers from the taught material.',
      ready: true,
    },
    {
      id: TEACHER,
      name: 'SmolLM2 135M',
      kind: 'teacher',
      detail: 'Fine-tuned on this tenant’s material.',
      ready: true,
    },
  ],
};

const PREDICTION = {
  model: TEACHER,
  model_name: 'SmolLM2 135M',
  kind: 'teacher',
  layers: 30,
  heads: 9,
  prefix: 'Why is the sky blue?',
  tokens: TOKENS,
  attention: ATTENTION,
  next: [
    { word: 'because', probability: 0.42, count: null },
    { word: 'the', probability: 0.23, count: null },
    { word: 'light', probability: 0.09, count: null },
  ],
};

const HF_STATE = {
  machine: { device: 'mps', torch: '2.12.0', transformers: '5.20.2' },
  base_models: [
    {
      id: 'HuggingFaceTB/SmolLM2-135M',
      name: 'SmolLM2 135M',
      parameters: '135M',
      note: 'Small enough to fine-tune on this machine.',
      trained: true,
    },
  ],
  teachers: [
    {
      folder: 'teacher-HuggingFaceTB-SmolLM2-135M',
      model_id: 'HuggingFaceTB/SmolLM2-135M',
      name: 'SmolLM2 135M',
      steps: 200,
      loss: 1.2345,
      trained_at: '2026-10-26T10:00:00Z',
      bytes: 268435456,
      ready: true,
    },
  ],
  last_run: {
    model_id: 'HuggingFaceTB/SmolLM2-135M',
    stage: 'done',
    stages: { download: 'done', tune: 'done' },
    steps_done: 200,
    steps_total: 200,
    loss: 1.2345,
    finished: 1790000000,
    examples: 42,
  },
  progress: null,
  running: false,
};

const browser = await chromium.launch({ channel: 'chrome' });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

await context.addInitScript(
  ([token, user, sessions, active, appearance]) => {
    localStorage.setItem('assistance.token.v1', token);
    localStorage.setItem('assistance.user.v1', user);
    localStorage.setItem('assistance.sessions.v1', sessions);
    localStorage.setItem('assistance.active.v1', active);
    localStorage.setItem('assistance.appearance.v1', appearance);
    localStorage.setItem('luke.answer-model', 'hf:teacher-HuggingFaceTB-SmolLM2-135M');
  },
  [
    'dev-token',
    JSON.stringify(USER),
    JSON.stringify([SESSION]),
    SESSION.id,
    JSON.stringify({ colorMode: 'dark', palette: 'frost', textSize: 'medium' }),
  ],
);

const json = (route, body) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

await context.route('**/health', (route) => json(route, { status: 'ok' }));
await context.route('**/auth/refresh', (route) => json(route, { access_token: 'dev-token' }));
await context.route('**/auth/me', (route) => json(route, USER));
await context.route('**/language-model/models', (route) => json(route, CATALOG));
await context.route('**/language-model/predict', (route) => json(route, PREDICTION));
await context.route('**/language-model/huggingface', (route) => json(route, HF_STATE));
await context.route('**/language-model/brain**', (route) =>
  json(route, {
    trained: false,
    vocabulary: 0,
    words: {},
    words_ready: false,
    backend: 'untrained',
    backend_reason: 'not trained yet',
    training: false,
    progress: null,
    emotions: [],
    emotion_ready: false,
    clarify_ready: false,
    confidence_ready: false,
    intent_ready: false,
    intents: [],
    feedback_entries: 0,
    correct_answers: 0,
    wrong_answers: 0,
    corrections: 0,
    learned_corrections: 0,
    engine: { schema: 1, device: 'mps', torch: '2.12.0', words: {}, runs: [] },
    model_level: {
      level: 'nursery',
      measured_level: 'nursery',
      approval_ready: false,
      level_value: 0,
      name: 'Nursery',
      title: 'Nursery',
      description: '',
      reference: '',
      next_level: null,
      next_requirement: '',
      capabilities: [],
      max_level: 'nursery',
      ladder_size: 1,
      levels: [],
      training_volume: { title: 'Material', detail: '', items: 0, percent: 0 },
      rungs: [],
      next_steps: [],
      coverage: {
        documents: 0,
        chunks: 0,
        trained_answers: 0,
        lessons: 0,
        passed_grades: 0,
        current_stage: '',
      },
    },
  }),
);
await context.route('**/language-model/settings', (route) =>
  json(route, {
    name: 'Luke',
    start_level: 'nursery',
    level: 'nursery',
    defaults: { name: 'Luke', start_level: 'nursery' },
    levels: [],
  }),
);
await context.route('**/stats', (route) => json(route, { chunks: 12, faqs: 2, pending: 1 }));
await context.route('**/faq/inbox**', (route) => json(route, []));
await context.route('**/faq', (route) => json(route, []));
await context.route('**/documents**', (route) => json(route, []));

const page = await context.newPage();
let predictRequests = 0;
page.on('request', (request) => {
  if (request.url().endsWith('/language-model/predict')) predictRequests += 1;
});
const errors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});
page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
page.on('response', (response) => {
  if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
});

const overflow = async (label) => {
  const data = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  console.log(label, JSON.stringify(data));
  return data;
};

await page.goto('http://localhost:4200/chat', { waitUntil: 'networkidle' });
await page.waitForSelector('.model-select');
await page.waitForSelector('.message-row.assistant');

console.log(
  'model picker',
  JSON.stringify({
    value: await page.locator('.model-select').inputValue(),
    options: (await page.locator('.model-select option').allTextContents()).map((text) =>
      text.trim(),
    ),
  }),
);

const bodyText = await page.locator('body').innerText();
console.log('wiki hint present', bodyText.includes('Live answers are off'));
console.log('provenance', JSON.stringify(await page.locator('.provenance').first().innerText()));

await page.locator('button[aria-label="Answer details"]').first().click();
await page.waitForSelector('.heat-grid');
console.log(
  'record',
  JSON.stringify((await page.locator('.answer-details .record').innerText()).split('\n')),
);
console.log(
  'heat reads',
  JSON.stringify(await page.locator('.answer-details app-heat-read .read-label').allTextContents()),
);
console.log('heat cells', await page.locator('.answer-details .heat-cell').count());
console.log(
  'next words',
  JSON.stringify(await page.locator('.answer-details .next-item').allInnerTexts()),
);
console.log('predict requests for the details', predictRequests);
await page.screenshot({ path: '/tmp/luke-details-1440.png' });

await page.locator('app-heat-read').nth(1).getByRole('button', { name: 'Open in lab' }).click();
await page.waitForSelector('.lab');
console.log('lab prefix', JSON.stringify(await page.locator('.lab-prefix').inputValue()));
console.log(
  'lab next words',
  JSON.stringify(await page.locator('.lab-next .next-word').allInnerTexts()),
);
await page.screenshot({ path: '/tmp/luke-lab-1440.png' });

await page.locator('.lab-next .next-word').first().click();
await page.waitForSelector('.picked-word');
console.log('picked', JSON.stringify(await page.locator('.picked-word').allInnerTexts()));
console.log(
  'after pick next words',
  JSON.stringify(await page.locator('.lab-next .next-word').allInnerTexts()),
);

await page.locator('.lab-input').fill('today');
await page.getByRole('button', { name: 'Use word' }).click();
await page.waitForTimeout(200);
console.log('after typed', JSON.stringify(await page.locator('.picked-word').allInnerTexts()));

await page.locator('.picked-word').first().click();
await page.waitForTimeout(200);
console.log('after remove', JSON.stringify(await page.locator('.picked-word').allInnerTexts()));
await page.screenshot({ path: '/tmp/luke-lab-typed-1440.png' });

await page.getByRole('button', { name: 'Close', exact: true }).click();
await page.waitForTimeout(200);
await overflow('chat 1440');
await page.screenshot({ path: '/tmp/luke-chat-1440.png' });

await page.setViewportSize({ width: 1024, height: 768 });
await page.waitForTimeout(200);
await overflow('chat 1024');
await page.screenshot({ path: '/tmp/luke-chat-1024.png' });

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(200);
await overflow('chat 390');
await page.screenshot({ path: '/tmp/luke-chat-390.png' });

await page.setViewportSize({ width: 1440, height: 900 });
await page.goto('http://localhost:4200/trainer', { waitUntil: 'networkidle' });
await page.waitForSelector('.tool-tab');
await page.locator('.tool-tab', { hasText: 'Base model' }).click();
await page.waitForSelector('app-saved-teachers .teacher');
console.log(
  'teacher card',
  JSON.stringify((await page.locator('app-saved-teachers .teacher').innerText()).split('\n')),
);
console.log('machine', JSON.stringify(await page.locator('.machine').innerText()));
await page.screenshot({ path: '/tmp/luke-base-1440.png' });

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(200);
await overflow('trainer 390');
await page.screenshot({ path: '/tmp/luke-base-390.png' });

console.log('errors', JSON.stringify(errors));
await browser.close();
