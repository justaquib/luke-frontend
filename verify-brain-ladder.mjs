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

const BANDS = [
  ['0.0', 'Foundations', ['Seed', 'Cued', 'Paraphrased', 'Generalised', 'Written', 'Explained', 'Corrected', 'Examined', 'Grounded', 'Teacher']],
  ['0.1', 'Independence', ['Independent', 'Recalled', 'Rephrased', 'Recombined', 'Rehearsed', 'Drafted', 'Revised', 'Sourced', 'Extended', 'Self-taught']],
  ['0.2', 'Reasoning', ['Reasoner', 'Compared', 'Classified', 'Sequenced', 'Inferred', 'Justified', 'Weighed', 'Hypothesised', 'Debugged', 'Argued']],
  ['0.3', 'Synthesis', ['Synthesiser', 'Summarised', 'Combined', 'Contrasted', 'Mapped', 'Structured', 'Illustrated', 'Recounted', 'Condensed', 'Unified']],
  ['0.4', 'Application', ['Practitioner', 'Applied', 'Adapted', 'Simulated', 'Planned', 'Executed', 'Measured', 'Troubleshot', 'Optimised', 'Delivered']],
  ['0.5', 'Adaptation', ['Adapter', 'Transferred', 'Reframed', 'Personalised', 'Simplified', 'Expanded', 'Localised', 'Translated', 'Restyled', 'Recovered']],
  ['0.6', 'Composition', ['Composer', 'Outlined', 'Composed', 'Narrated', 'Styled', 'Edited', 'Finished', 'Published', 'Serialised', 'Curated']],
  ['0.7', 'Evaluation', ['Evaluator', 'Checked', 'Verified', 'Critiqued', 'Ranked', 'Audited', 'Stressed', 'Certified', 'Challenged', 'Appraised']],
  ['0.8', 'Mastery', ['Master', 'Retained', 'Reused', 'Taught', 'Mentored', 'Coordinated', 'Led', 'Delegated', 'Moderated', 'Stewarded']],
  ['0.9', 'Judgment', ['Judge', 'Balanced', 'Principled', 'Contextual', 'Ethical', 'Accountable', 'Decided', 'Advised', 'Reconciled', 'Trusted']],
  ['1.0', 'Generalist', ['Generalist']],
];

const OPEN = new Set([
  '0.0.0',
  '0.0.1',
  '0.0.2',
  '0.0.3',
  '0.0.4',
  '0.0.5',
  '0.0.6',
  '0.0.7',
  '0.0.8',
  '0.0.9',
  '0.1.0',
]);

const LEVELS = BANDS.flatMap(([band, bandName, names]) =>
  names.map((name, index) => {
    const level = band === '1.0' ? '1.0.0' : `${band}.${index}`;
    return {
      level,
      name,
      description: OPEN.has(level) ? `${name} is tested.` : 'No test has been written for this level yet.',
      reference: 'Ladder',
      open: OPEN.has(level),
      band,
      band_name: bandName,
      band_detail: bandName,
    };
  }),
);

const LEVEL = (overrides = {}) => ({
  level: '0.1.0',
  measured_level: '0.1.0',
  approval_ready: false,
  level_value: 0.1,
  name: 'Independent',
  title: 'Luke 0.1.0 · Independent',
  description: 'Answering a question it was never taught, in its own words.',
  reference: 'Milestone',
  next_level: 'Luke 0.1.1 · Recalled',
  next_requirement: '0.1.1 is locked. No test has been written for it yet.',
  capabilities: [],
  max_level: '1.0.0',
  ladder_size: 101,
  levels: LEVELS,
  training_volume: {
    title: 'Independent',
    detail: 'Answering without being taught.',
    items: 12,
    stages: [],
    next_stage: null,
  },
  rungs: [
    { rung: '0.0.1', passed: 4, probes: 4, rate: 1 },
    { rung: '0.0.2', passed: 3, probes: 4, rate: 0.75 },
    { rung: '0.0.3', passed: 4, probes: 4, rate: 1 },
    { rung: '0.0.4', passed: 3, probes: 4, rate: 0.75 },
    { rung: '0.0.5', passed: 4, probes: 4, rate: 1 },
    { rung: '0.0.6', passed: 3, probes: 4, rate: 0.75 },
    { rung: '0.0.7', passed: 4, probes: 4, rate: 1 },
    { rung: '0.0.8', passed: 4, probes: 4, rate: 1 },
    { rung: '0.0.9', passed: 3, probes: 4, rate: 0.75 },
    { rung: '0.1.0', passed: 3, probes: 4, rate: 0.75 },
  ],
  next_steps: [],
  coverage: {
    documents: 3,
    chunks: 90,
    trained_answers: 12,
    lessons: 40,
    passed_grades: 2,
    current_stage: 'nursery',
  },
  generality: 0.35,
  generality_cap: null,
  generality_probes: [],
  instruction_following: 0.75,
  instruction_probes: [],
  instruction_total: 12,
  instruction_written: 9,
  instruction_looked_up: 3,
  instruction_measured: true,
  ladder_share: 0.1,
  frontier_level: 6,
  frontier_title: 'Frontier',
  frontier_note: '',
  model_name: 'Luke',
  model_start_level: '0.0.0',
  ...overrides,
});

const BRAIN = (level) => ({
  trained: true,
  vocabulary: 1742,
  transformer: {},
  transformer_ready: true,
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
  corrections: 12,
  learned_corrections: 0,
  engine: {
    schema: 2,
    device: 'cpu',
    torch: '2.9.0',
    answer: {
      trained: true,
      validation_loss: 4.371,
      chance_loss: 7.4628,
      loss: 4.1,
      steps: 300,
      passes: 8,
      stop_reason: 'steps',
      train_examples: 36619,
      validation_examples: 4000,
      curve: [7.4, 5.1, 4.4],
      validation_curve: [7.5, 5.2, 4.4],
      corpus: { sentences: 3200, instructions: 120, contexts: 40 },
      dropped_sentences: 2,
    },
    words: {
      trained: true,
      backend: 'neural',
      backend_reason: 'held-out loss is below the gate',
      validation_loss: 3.1,
      chance_loss: 6.9,
      next_word_accuracy: 0.42,
      perplexity: 22.2,
      passes: 8,
      steps: 500,
      sentence_count: 3200,
      token_count: 48000,
    },
    runs: [
      {
        task: 'answer',
        at: 1760000000,
        loss: 4.1,
        validation_loss: 4.371,
        passes: 8,
        stop_reason: 'steps',
        steps: 300,
        seconds: 120,
      },
    ],
  },
  model_level: level,
});

const STORE = {
  documents: [],
  totals: { files: 0, chunks: 0, answers: 12, pending: 0, lessons: 0, vocabulary: 0 },
  model: {
    name: 'Luke',
    level: 0,
    title: 'Newborn',
    vocabulary: 1742,
    parameters: 0,
    trained: true,
    steps: 300,
    loss: 4.1,
    corpus_sentences: 3200,
    corpus_tokens: 48000,
  },
  disk: { learner_bytes: 0, vector_store_bytes: 0, uploads_bytes: 0 },
};

const browser = await chromium.launch({ channel: 'chrome' });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

await context.addInitScript(
  ([token, user]) => {
    localStorage.setItem('assistance.token.v1', token);
    localStorage.setItem('assistance.user.v1', user);
  },
  ['dev-token', JSON.stringify(USER)],
);

const json = (route, body) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

await context.route('**/auth/refresh', (route) => json(route, { access_token: 'dev-token' }));
await context.route('**/auth/me', (route) => json(route, USER));
await context.route('**/stats', (route) => json(route, { chunks: 12, faqs: 12, pending: 0 }));
await context.route('**/language-model/store', (route) => json(route, STORE));
await context.route('**/language-model/settings', (route) =>
  json(route, { name: 'Luke', start_level: '0.0.0', level: '0.1.0' }),
);
await context.route('**/language-model/brain/sources', (route) =>
  json(route, {
    sources: [],
    steps: [],
    totals: { items: 0, words: 0, sentences: 0, requests: 0 },
    model: { trained: true, vocabulary: 1742 },
  }),
);

let current = LEVEL();
await context.route('**/language-model/brain', (route) => json(route, BRAIN(current)));

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

const readLadder = () =>
  page.evaluate(() => {
    const nodes = [...document.querySelectorAll('.roadmap .node')];
    const bands = [...document.querySelectorAll('.roadmap .band')];
    const byLevel = (level) => nodes.find((node) => node.querySelector('.node-level')?.textContent === level);
    const text = (selector) => document.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim() ?? null;
    const counts = (selector) => document.querySelectorAll(selector).length;
    const bandTitles = bands.map((band) => band.querySelector('.band-name')?.textContent?.trim() ?? '');
    const nodesPerBand = bands.map((band) => band.querySelectorAll('.node').length);
    const positions = nodes.slice(0, 12).map((node) => {
      const rect = node.getBoundingClientRect();
      return { level: node.querySelector('.node-level')?.textContent, top: Math.round(rect.top), left: Math.round(rect.left) };
    });
    return {
      heading: text('#roadmap-title'),
      count: text('.roadmap-head .number'),
      hint: text('.roadmap > .hint'),
      bands: bands.length,
      nodes: nodes.length,
      nodesPerBand,
      bandTitles,
      passed: counts('.roadmap .node.passed'),
      ahead: counts('.roadmap .node.ahead'),
      next: counts('.roadmap .node.next'),
      locked: counts('.roadmap .node.locked'),
      current: text('.roadmap .node.current .node-level'),
      currentAria: document.querySelector('.roadmap .node.current')?.getAttribute('aria-current'),
      bandLocks: counts('.roadmap .band-head app-icon'),
      firstBand: text('.roadmap .band .band-name'),
      lastBand: bandTitles.at(-1),
      lastNode: nodes.at(-1)?.querySelector('.node-level')?.textContent,
      level011: {
        classes: byLevel('0.1.1')?.className ?? null,
        title: byLevel('0.1.1')?.getAttribute('title') ?? null,
        icon: byLevel('0.1.1')?.querySelector('app-icon')?.getAttribute('ng-reflect-name') ?? null,
      },
      level010: {
        classes: byLevel('0.1.0')?.className ?? null,
        title: byLevel('0.1.0')?.getAttribute('title') ?? null,
      },
      positions,
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      roadmapWidth: Math.round(document.querySelector('.roadmap')?.getBoundingClientRect().width ?? 0),
      roadMapRight: Math.round(document.querySelector('.roadmap')?.getBoundingClientRect().right ?? 0),
    };
  });

const layout = () =>
  page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    bodyScrollWidth: document.body.scrollWidth,
    leftPanel: Math.round(document.querySelector('.builder-column')?.getBoundingClientRect().width ?? 0),
    columns: [...document.querySelectorAll('.builder-column')].map((el) =>
      Math.round(el.getBoundingClientRect().width),
    ),
    nodeMinWidth: Math.round(
      document.querySelector('.roadmap .node')?.getBoundingClientRect().width ?? 0,
    ),
    nodesPerRow: (() => {
      const nodes = [...document.querySelectorAll('.roadmap .band:first-child .node')];
      if (!nodes.length) return 0;
      const top = Math.round(nodes[0].getBoundingClientRect().top);
      return nodes.filter((node) => Math.round(node.getBoundingClientRect().top) === top).length;
    })(),
  }));

const report = async (label) => {
  const ladder = await readLadder();
  console.log(label, JSON.stringify(ladder));
  console.log(`${label}-layout`, JSON.stringify(await layout()));
  await page.evaluate(() => {
    const bar = document.querySelector('.top-bar');
    if (bar instanceof HTMLElement) bar.style.display = 'none';
  });
  await page.waitForTimeout(100);
  await page
    .locator('.roadmap')
    .screenshot({ path: `./verify-brain-ladder-${label}.png`, animations: 'disabled' });
};

const waitForLadder = async () => {
  try {
    await page.waitForSelector('.roadmap .node');
  } catch (error) {
    console.log('debug-url', page.url());
    console.log('debug-text', (await page.locator('body').innerText()).slice(0, 3000));
    console.log('debug-html', (await page.locator('body').innerHTML()).slice(0, 1000));
    console.log('consoleErrors', JSON.stringify(errors));
    console.log('httpFailures', JSON.stringify(failures));
    throw error;
  }
};

const BASE = process.env.BASE_URL ?? 'http://localhost:4200';

await page.goto(`${BASE}/dashboard/brain`, { waitUntil: 'networkidle' });
await waitForLadder();
await page.waitForTimeout(300);
await report('1440-passed');

await page.setViewportSize({ width: 1024, height: 800 });
await page.waitForTimeout(200);
await report('1024-passed');

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(200);
await report('390-passed');

await page.setViewportSize({ width: 1440, height: 900 });
current = LEVEL({
  level: '0.0.9',
  measured_level: '0.0.9',
  level_value: 0.09,
  name: 'Teacher',
  title: 'Luke 0.0.9 · Teacher',
  next_level: 'Luke 0.1.0 · Independent',
  next_requirement: 'Pass 0.1.0 to move up.',
  ladder_share: 0.09,
  rungs: [{ rung: '0.0.9', passed: 4, probes: 4, rate: 1 }],
});
await page.reload({ waitUntil: 'networkidle' });
await waitForLadder();
await page.waitForTimeout(300);
await report('1440-next');

current = LEVEL({
  level: '0.0.9',
  measured_level: '0.1.0',
  approval_ready: true,
  level_value: 0.09,
  name: 'Teacher',
  title: 'Luke 0.0.9 · Teacher',
  next_level: 'Luke 0.1.0 · Independent',
  next_requirement: 'Approve 0.1.0 to make it the displayed level.',
  ladder_share: 0.09,
  rungs: [{ rung: '0.0.9', passed: 4, probes: 4, rate: 1 }],
});
await page.reload({ waitUntil: 'networkidle' });
await waitForLadder();
await page.waitForTimeout(300);
await report('1440-ahead');

console.log('consoleErrors', JSON.stringify(errors));
console.log('httpFailures', JSON.stringify(failures));

await browser.close();
