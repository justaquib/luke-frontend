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

const browser = await chromium.launch({ channel: 'chrome' });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

await context.addInitScript(([token, user]) => {
  localStorage.setItem('assistance.token.v1', token);
  localStorage.setItem('assistance.user.v1', user);
}, ['dev-token', JSON.stringify(USER)]);

await context.route('**/auth/refresh', (route) =>
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: '{"access_token":"dev-token"}',
  }),
);
await context.route('**/auth/me', (route) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(USER) }),
);

const page = await context.newPage();
const errors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});
page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));

await page.goto('http://localhost:4200/settings', { waitUntil: 'networkidle' });
await page.waitForSelector('#settings-appearance-title');

async function state(label) {
  const data = await page.evaluate(() => ({
    colorMode: document.documentElement.getAttribute('data-color-mode'),
    theme: document.documentElement.getAttribute('data-theme'),
    textSize: document.documentElement.getAttribute('data-text-size'),
    bodyBg: getComputedStyle(document.body).backgroundColor,
    bodyColor: getComputedStyle(document.body).color,
    accent: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    scrollHeight: document.documentElement.scrollHeight,
    innerHeight: window.innerHeight,
  }));
  console.log(label, JSON.stringify(data));
  return data;
}

await state('initial');
await page.screenshot({ path: './verify-appearance-initial.png', fullPage: false });

const choices = await page.locator('.choice').allTextContents();
console.log('choices', JSON.stringify(choices));

await page.locator('input[name="color-mode"][value="light"]').check({ force: true });
await page.locator('input[name="theme"][value="mint"]').check({ force: true });
await page.waitForTimeout(150);
await state('light-mint');
await page.screenshot({ path: './verify-appearance-light-mint.png', fullPage: false });

await page.locator('input[name="color-mode"][value="dark"]').check({ force: true });
await page.locator('input[name="theme"][value="bee"]').check({ force: true });
await page.locator('input[name="text-size"][value="large"]').check({ force: true });
await page.waitForTimeout(200);
const large = await state('dark-bee-large');
await page.screenshot({ path: './verify-appearance-dark-bee-large.png', fullPage: false });

const selected = await page.evaluate(() =>
  [...document.querySelectorAll('.choice.selected')].map((el) => el.textContent?.trim()),
);
console.log('selected', JSON.stringify(selected));

await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('#settings-appearance-title');
const reloaded = await state('after-reload');

await page.locator('input[name="color-mode"][value="system"]').check({ force: true });
await page.locator('input[name="text-size"][value="medium"]').check({ force: true });
await page.waitForTimeout(150);
await state('system-medium');

await page.setViewportSize({ width: 390, height: 844 });
await page.locator('input[name="theme"][value="frost"]').check({ force: true });
await page.waitForTimeout(150);
const narrow = await state('narrow-system-frost');
await page.screenshot({ path: './verify-appearance-narrow.png', fullPage: false });

await page.locator('input[name="text-size"][value="large"]').check({ force: true });
await page.waitForTimeout(150);
const narrowLarge = await state('narrow-large');
await page.screenshot({ path: './verify-appearance-narrow-large.png', fullPage: false });

await page.emulateMedia({ colorScheme: 'dark' });
await page.waitForTimeout(150);
await state('system-dark');

console.log('narrow overflow', narrow.scrollWidth > narrow.innerWidth ? 'YES' : 'no');
console.log('narrow large overflow', narrowLarge.scrollWidth > narrowLarge.innerWidth ? 'YES' : 'no');
console.log('errors', JSON.stringify(errors));
console.log('large overflow', large.scrollWidth > large.innerWidth ? 'YES' : 'no');
console.log(
  'reload keeps choice',
  reloaded.colorMode === 'dark' && reloaded.theme === 'bee' && reloaded.textSize === 'large'
    ? 'YES'
    : 'NO',
);

await browser.close();
