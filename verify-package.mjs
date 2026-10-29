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

const BASE = {
  included: true,
  installed: true,
  base_model: 'Qwen/Qwen2.5-0.5B-Instruct',
  revision: '7ae557604adf67be50417f59c2c2f167def9a775',
  weight_sha256: 'a'.repeat(64),
};

const PREVIEW = {
  model: { name: 'Luke', start_level: '0.0.0', approved_level: '0.1.0' },
  available: 1622,
  by_kind: { lesson: 500, starter_lesson: 533, document: 387 },
  checkpoints: [{ name: 'words-0.pt', bytes: 2557967 }],
  teachers: [
    { name: 'Teacher', model_id: 'Qwen/Qwen2.5-0.5B-Instruct', steps: 200, bytes: 268435456 },
  ],
  pending: 12,
  bytes: 987654321,
  filename: 'luke-full.zip',
  modes: {
    full: { bytes: 987654321, files: 25, includes_base: true, filename: 'luke-full.zip' },
    slim: { bytes: 2572268, files: 15, includes_base: false, filename: 'luke-slim.zip' },
  },
  base: BASE,
};

const CHECKS = {
  documents: 3,
  faqs: 12,
  pending_total: 2,
  feedback: 1,
  uploads: 1,
  intents: 1,
};

const CHECK = {
  applied: false,
  replace_required: true,
  format: 'luke-package',
  format_version: 2,
  mode: 'slim',
  workspace: 0,
  model: { name: 'Luke' },
  counts: CHECKS,
  files: { checked: 15, bytes: 2572268 },
  base_model: { ...BASE, included: false },
  tokenizers: [{ kind: 'bpe', id: 'abc', vocab_size: 1024 }],
};

const APPLIED = {
  applied: true,
  files: { state: 4, tokenizers: 2, base: 0 },
  rows: CHECKS,
  indexed: { documents: 3, faqs: 12, intents: 1 },
  verified: { counts: CHECKS, samples: { documents: 1, faqs: 1 } },
};

const HUGGING_FACE = {
  machine: { device: 'mps', torch: '2.7.1', transformers: '4.53.0' },
  base_models: [],
  teachers: [],
  last_run: null,
  progress: null,
  running: false,
};

const SETTINGS = {
  name: 'Luke',
  start_level: '0.0.0',
  level: '0.0.0',
  defaults: { name: 'Luke', start_level: '0.0.0' },
  levels: [],
};

const TRANSFER = {
  teachers: [],
  available: 0,
  limit: 100,
  by_kind: {},
  samples: [],
  running: false,
  progress: null,
  last: null,
};

const BRAIN = {
  trained: false,
  vocabulary: 0,
  words_ready: false,
  backend: 'untrained',
  backend_reason: '',
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
};

const state = { preview: 'ok', previewCalls: 0, dryRuns: 0, restores: 0 };
const failures = [];

function check(condition, label) {
  console.log(`${condition ? 'ok' : 'FAIL'} ${label}`);
  if (!condition) failures.push(label);
}

async function json(route, body, status = 200) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

const browser = await chromium.launch({ channel: 'chrome' });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await context.addInitScript(
  ([token, user]) => {
    localStorage.setItem('assistance.token.v1', token);
    localStorage.setItem('assistance.user.v1', user);
  },
  ['dev-token', JSON.stringify(USER)],
);

await context.route('**/auth/refresh', (route) => json(route, { access_token: 'dev' }));
await context.route('**/auth/me', (route) => json(route, USER));
await context.route('**/stats', (route) => json(route, { chunks: 12, faqs: 2, pending: 0 }));
await context.route('**/faq/inbox**', (route) => json(route, []));
await context.route('**/faq', (route) => json(route, []));
await context.route('**/documents**', (route) => json(route, []));
await context.route('**/language-model/brain**', (route) => json(route, BRAIN));
await context.route('**/language-model/settings', (route) => json(route, SETTINGS));
await context.route('**/language-model/huggingface', (route) => json(route, HUGGING_FACE));
await context.route('**/language-model/huggingface/transfer', (route) => json(route, TRANSFER));
await context.route('**/language-model/export/preview', (route) => {
  state.previewCalls += 1;
  if (state.preview === 'fail') return json(route, { detail: 'Cannot count the package.' }, 500);
  return json(route, PREVIEW);
});
await context.route('**/language-model/package/import**', (route) => {
  const dryRun = new URL(route.request().url()).searchParams.get('dry_run') === 'true';
  if (dryRun) state.dryRuns += 1;
  else state.restores += 1;
  return json(route, dryRun ? CHECK : APPLIED);
});

async function openBaseTab(page) {
  await page.goto('http://localhost:4200/trainer', { waitUntil: 'networkidle' });
  await page.locator('.tool-tab', { hasText: 'Base' }).click();
  await page.locator('.package-card').waitFor();
}

async function overflow(page) {
  return page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
}

const page = await context.newPage();
const errors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});
page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));

await openBaseTab(page);
const card = page.locator('.package-card');
await card.scrollIntoViewIfNeeded();
const full = await card.innerText();
check(full.includes('Luke · level 0.1.0'), 'shows the model and level');
check(full.includes('987654321 bytes · 25 files'), 'shows the measured full size');
check(full.includes('luke-full.zip'), 'shows the full filename');
check(full.includes('Qwen/Qwen2.5-0.5B-Instruct'), 'shows the base model');
check(full.includes('7ae557604adf67be50417f59c2c2f167def9a775'), 'shows the pinned revision');
check(full.includes('Includes foundation weights'), 'says the full mode carries weights');
check((await overflow(page)).scrollWidth <= 1440, 'no horizontal overflow at 1440');
await page.screenshot({ path: './verify-package-1440.png', fullPage: false });

await page.locator('.choice', { hasText: 'Slim' }).click();
await card.getByText('luke-slim.zip').waitFor();
const slim = await card.innerText();
check(slim.includes('2572268 bytes · 15 files'), 'shows the measured slim size');
check(slim.includes('luke-slim.zip'), 'shows the slim filename');
check(slim.includes('Foundation weights are not included'), 'says slim omits weights');
await page.screenshot({ path: './verify-package-slim-1440.png', fullPage: false });

await page.setInputFiles('input[type="file"]', {
  name: 'luke-restore.zip',
  mimeType: 'application/zip',
  buffer: Buffer.from('PK\u0003\u0004'),
});
const dialogBox = page.locator('app-modal', { hasText: 'Replace this workspace?' });
await dialogBox.waitFor();
await page.waitForTimeout(300);
const dialog = await dialogBox.innerText();
check(dialog.includes('15 files checked'), 'confirmation shows the checked file count');
check(dialog.includes('documents: 3'), 'confirmation shows the restored counts');
check(dialog.includes('The dry run made no changes.'), 'confirmation says nothing changed yet');
await page.screenshot({ path: './verify-package-confirm-1440.png', fullPage: false });

await page.getByRole('button', { name: 'Replace and restore' }).click();
await page.waitForFunction(() => document.body.innerText.includes('was restored'));
check(state.dryRuns === 1 && state.restores === 1, 'one dry run then one restore');
check(state.previewCalls === 2, 'refreshes the preview after restoring');
const restored = await card.innerText();
check(restored.includes('was restored'), 'reports the restore in the card');
await page.screenshot({ path: './verify-package-restored-1440.png', fullPage: false });

await page.setViewportSize({ width: 1024, height: 768 });
await openBaseTab(page);
await page.locator('.package-card').scrollIntoViewIfNeeded();
check((await overflow(page)).scrollWidth <= 1024, 'no horizontal overflow at 1024');
await page.screenshot({ path: './verify-package-1024.png', fullPage: false });

await page.setViewportSize({ width: 390, height: 844 });
await openBaseTab(page);
await page.locator('.package-card').scrollIntoViewIfNeeded();
await page.locator('.choice', { hasText: 'Slim' }).click();
await page.locator('.package-card').getByText('luke-slim.zip').waitFor();
check((await overflow(page)).scrollWidth <= 390, 'no horizontal overflow at 390');
const layout = await page.evaluate(() => {
  const pick = (selector) => {
    const element = document.querySelector(selector);
    if (!element) return null;
    const box = element.getBoundingClientRect();
    return {
      left: Math.round(box.left),
      right: Math.round(box.right),
      width: Math.round(box.width),
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
    };
  };
  return {
    content: pick('.trainer-content'),
    card: pick('.package-card'),
    choices: pick('.choices'),
    identity: pick('.base-identity'),
    actions: pick('.actions'),
    tabs: pick('.tool-tabs'),
  };
});
console.log('layout390', JSON.stringify(layout));
await page.screenshot({ path: './verify-package-390.png', fullPage: false });

state.preview = 'fail';
const errorPage = await context.newPage();
errorPage.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
await openBaseTab(errorPage);
await errorPage.setViewportSize({ width: 1440, height: 900 });
const errorCard = errorPage.locator('.package-card');
await errorCard.scrollIntoViewIfNeeded();
await errorCard.locator('.error').waitFor();
check(
  (await errorCard.locator('.error').innerText()).includes('Cannot count the package.'),
  'shows the preview failure',
);
check(
  await errorCard.locator('button[aria-label="Import ZIP package"]').isEnabled(),
  'keeps import available after a preview failure',
);
check(
  await errorCard.locator('button[aria-label="Download Luke"]').isDisabled(),
  'disables download when contents are unknown',
);
await errorPage.screenshot({ path: './verify-package-error-1440.png', fullPage: false });

console.log('console errors', JSON.stringify(errors));
console.log(failures.length ? `FAILURES ${failures.length}` : 'ALL CHECKS PASSED');
await browser.close();
process.exit(failures.length ? 1 : 0);
