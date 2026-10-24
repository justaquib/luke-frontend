import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AppPrefsService } from '../core/app-prefs.service';
import { Settings } from './settings';

function text(node: Element): string {
  return node.textContent?.trim() ?? '';
}

function pick(compiled: HTMLElement, selector: string): HTMLInputElement {
  const input = compiled.querySelector<HTMLInputElement>(selector);
  if (!input) throw new Error(`Missing control: ${selector}`);
  return input;
}

const modelSettings = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  name: 'Luke',
  start_level: '0.0.0',
  level: '0.0.0',
  defaults: { name: 'Luke', start_level: '0.0.0' },
  levels: [
    { level: '0.0.0', name: 'Newborn', title: 'Luke 0.0.0', description: 'Seed' },
    { level: '0.1.0', name: 'Curious', title: 'Luke 0.1.0', description: 'Top of the scale' },
  ],
  ...overrides,
});

describe('Settings', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [Settings],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
  });

  afterEach(() => {
    localStorage.clear();
    const root = document.documentElement;
    root.removeAttribute('data-color-mode');
    root.removeAttribute('data-theme');
    root.removeAttribute('data-text-size');
    root.removeAttribute('data-font');
  });

  it('keeps the store on the brain page and shows the connection here', async () => {
    const fixture = TestBed.createComponent(Settings);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    http.expectOne((req) => req.url.endsWith('/health')).flush({ status: 'ok' });
    http.expectOne((req) => req.url.endsWith('/language-model/settings')).flush(modelSettings());
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-shell')).toBeTruthy();
    expect(compiled.querySelector('app-page-header')).toBeNull();
    expect(compiled.querySelector('.settings-page')?.firstElementChild?.tagName).toBe(
      'APP-ENGINE-FACTS',
    );
    expect(compiled.querySelector('#settings-store-title')).toBeNull();
    expect(compiled.textContent).not.toContain('The store');
    expect(compiled.textContent).toContain('Live sources');
    expect(compiled.textContent).toContain('Connected');
    expect(compiled.querySelector('#settings-model-title')?.textContent?.trim()).toBe(
      'Model identity',
    );
    expect(compiled.querySelector('button[aria-label="Use my current location"]')).toBeTruthy();
    http.expectNone((req) => req.url.endsWith('/language-model/store'));
    http.verify();
  });

  it('summarizes the engine state before the cards', async () => {
    const fixture = TestBed.createComponent(Settings);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    http.expectOne((req) => req.url.endsWith('/health')).flush({ status: 'ok' });
    http.expectOne((req) => req.url.endsWith('/language-model/settings')).flush(modelSettings());
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const facts = compiled.querySelector('app-engine-facts');
    expect(facts?.querySelector('.engine-facts')?.getAttribute('aria-label')).toBe(
      'Engine settings state',
    );
    expect(Array.from(facts?.querySelectorAll('.fact dt') ?? []).map(text)).toEqual([
      'Connection',
      'Model',
      'Live sources',
      'Appearance',
    ]);
    expect(Array.from(facts?.querySelectorAll('.fact dd') ?? []).map(text)).toEqual([
      'Connected',
      'Luke',
      '0/2',
      'Frost',
    ]);
    expect(facts?.textContent).toContain('version 0.0.0');
    expect(facts?.textContent).toContain('weather and Wikipedia');
    expect(facts?.textContent).toContain('Medium text · Sans type');
    http.verify();
  });

  it('keeps card explanations folded until the info button is used', async () => {
    const fixture = TestBed.createComponent(Settings);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    http.expectOne((req) => req.url.endsWith('/health')).flush({ status: 'ok' });
    http.expectOne((req) => req.url.endsWith('/language-model/settings')).flush(modelSettings());
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const toggle = compiled.querySelector<HTMLButtonElement>(
      'button[aria-label="Show info about the engine connection"]',
    );
    expect(compiled.textContent).not.toContain('The backend address this workspace calls');
    expect(toggle).toBeTruthy();

    toggle?.click();
    fixture.detectChanges();

    expect(compiled.textContent).toContain('The backend address this workspace calls');
    expect(toggle?.getAttribute('aria-haspopup')).toBe('dialog');
    expect(compiled.querySelector('[role="dialog"] h2')?.textContent?.trim()).toBe(
      'About the engine connection',
    );
    http.verify();
  });

  it('applies an appearance choice as soon as it is picked', async () => {
    const fixture = TestBed.createComponent(Settings);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    http.expectOne((req) => req.url.endsWith('/health')).flush({ status: 'ok' });
    http.expectOne((req) => req.url.endsWith('/language-model/settings')).flush(modelSettings());
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('#settings-appearance-title')).toBeTruthy();

    pick(compiled, 'input[name="color-mode"][value="dark"]').click();
    fixture.detectChanges();
    expect(document.documentElement.getAttribute('data-color-mode')).toBe('dark');

    pick(compiled, 'input[name="theme"][value="mint"]').click();
    fixture.detectChanges();
    expect(document.documentElement.getAttribute('data-theme')).toBe('mint');

    pick(compiled, 'input[name="text-size"][value="large"]').click();
    fixture.detectChanges();
    expect(document.documentElement.getAttribute('data-text-size')).toBe('large');

    pick(compiled, 'input[name="font"][value="serif"]').click();
    fixture.detectChanges();
    expect(document.documentElement.getAttribute('data-font')).toBe('serif');

    http.verify();
  });

  it('saves the model name and starting version', async () => {
    const fixture = TestBed.createComponent(Settings);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    http.expectOne((req) => req.url.endsWith('/health')).flush({ status: 'ok' });
    http.expectOne((req) => req.url.endsWith('/language-model/settings')).flush(modelSettings());
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const name = pick(compiled, 'input[name="model-name"]');
    expect(name.value).toBe('Luke');

    name.value = 'Nova';
    name.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const start = compiled.querySelector<HTMLSelectElement>('select[name="model-start-level"]');
    expect(Array.from(start?.options ?? []).map((option) => option.value)).toEqual([
      '0.0.0',
      '0.1.0',
    ]);
    if (!start) throw new Error('Missing control: select[name="model-start-level"]');
    start.value = '0.1.0';
    start.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    compiled.querySelector('form.model-form')?.dispatchEvent(new Event('submit'));
    const saved = http.expectOne(
      (req) => req.url.endsWith('/language-model/settings') && req.method === 'PUT',
    );
    expect(saved.request.body).toEqual({ name: 'Nova', start_level: '0.1.0' });
    saved.flush(modelSettings({ name: 'Nova', start_level: '0.1.0', level: '0.1.0' }));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(TestBed.inject(AppPrefsService).botName()).toBe('Nova');
    expect(compiled.textContent).toContain('Displayed version');
    expect(compiled.querySelector('.model-current strong')?.textContent?.trim()).toBe('0.1.0');
    http.verify();
  });
});
