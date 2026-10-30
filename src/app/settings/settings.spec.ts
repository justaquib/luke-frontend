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

const foundation = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  installed: true,
  identity: {
    name: 'Luke',
    version: '0.0.1',
    base_model: 'Qwen/Qwen2.5-0.5B-Instruct',
    revision: '7ae557604adf67be50417f59c2c2f167def9a775',
    license: 'Apache-2.0',
    parameters: 494032768,
    context_limit: 32768,
    weight_sha256: 'fdf756fa7fcbe7404d5c60e26bff1a0c8b8aa1f72ced49e7dd0210fe288fb7fe',
    weight_bytes: 988097824,
    dtypes: ['BF16'],
    display: 'Luke 0.0.1 · Qwen2.5-0.5B-Instruct · revision 7ae5576',
  },
  loaded: true,
  device: 'mps',
  memory_bytes: 2229 * 1024 * 1024,
  error: null,
  ...overrides,
});

const webStatus = (): Record<string, unknown> => ({
  policy: {
    enabled: false,
    provider: 'searxng',
    provider_name: 'SearXNG',
    endpoint: '',
    allowlist: [],
    ttl_hours: 168,
    min_score: 0.45,
    results: 3,
    providers: [
      { id: 'searxng', name: 'SearXNG' },
      { id: 'brave', name: 'Brave Search' },
      { id: 'tavily', name: 'Tavily' },
    ],
    max_sources: 50,
  },
  sources: [],
  counts: { indexed: 0, candidate: 0, superseded: 0 },
});

function flushWeb(http: HttpTestingController): void {
  http.expectOne((req) => req.url.endsWith('/web/status')).flush(webStatus());
}

function flushFoundation(http: HttpTestingController): void {
  http.expectOne((req) => req.url.endsWith('/language-model/foundation')).flush(foundation());
}

function flushVoice(http: HttpTestingController): void {
  http
    .expectOne((req) => req.url.endsWith('/voice/status'))
    .flush({
      available: true,
      active_module: 'melo-whisper',
      tts_module: 'facebook/mms-tts-eng',
      stt_module: 'openai/whisper-tiny',
      voices: [{ id: 'default', name: 'Default' }],
    });
}

function flushTools(http: HttpTestingController): void {
  http.expectOne((req) => req.url.endsWith('/tools')).flush([]);
  http.expectOne((req) => req.url.endsWith('/tools/permissions')).flush([]);
  http.expectOne((req) => req.url.endsWith('/tools/apps')).flush([]);
  http.expectOne((req) => req.url.endsWith('/tools/apps/allowlist')).flush([]);
}

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
    flushFoundation(http);
    flushWeb(http);
    flushVoice(http);
    flushTools(http);
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-shell')).toBeTruthy();
    expect(compiled.querySelector('app-page-header')).toBeNull();
    expect(compiled.querySelector('.settings-page')?.firstElementChild?.tagName).toBe(
      'APP-ENGINE-FACTS',
    );
    expect(compiled.querySelector('#settings-store-title')).toBeNull();
    expect(compiled.textContent).toContain('Live sources');
    expect(compiled.textContent).toContain('Connected');
    expect(compiled.querySelector('#settings-model-title')?.textContent?.trim()).toBe(
      'Model identity',
    );
    expect(compiled.querySelector('button[aria-label="Use my current location"]')).toBeTruthy();
    http.expectNone((req) => req.url.endsWith('/language-model/store'));
    http.verify();
  });

  it('shows the measured foundation checkpoint and its runtime', async () => {
    const fixture = TestBed.createComponent(Settings);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    http.expectOne((req) => req.url.endsWith('/health')).flush({ status: 'ok' });
    http.expectOne((req) => req.url.endsWith('/language-model/settings')).flush(modelSettings());
    flushFoundation(http);
    flushWeb(http);
    flushVoice(http);
    flushTools(http);
    await fixture.whenStable();
    fixture.detectChanges();

    const card = (fixture.nativeElement as HTMLElement).querySelector('app-foundation-card');
    expect(card?.textContent).toContain('Luke 0.0.1 · Qwen2.5-0.5B-Instruct · revision 7ae5576');
    expect(card?.textContent).toContain('494,032,768');
    expect(card?.textContent).toContain('32,768 tokens');
    expect(card?.textContent).toContain('Apache-2.0');
    expect(card?.textContent).toContain('BF16 · 942.3 MB');
    expect(card?.textContent).toContain('Installed · loaded on mps');
    expect(card?.textContent).toContain('2229 MB');
    http.verify();
  });

  it('says why a missing checkpoint cannot answer', async () => {
    const fixture = TestBed.createComponent(Settings);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    http.expectOne((req) => req.url.endsWith('/health')).flush({ status: 'ok' });
    http.expectOne((req) => req.url.endsWith('/language-model/settings')).flush(modelSettings());
    http
      .expectOne((req) => req.url.endsWith('/language-model/foundation'))
      .flush(
        foundation({
          installed: false,
          identity: null,
          loaded: false,
          device: null,
          memory_bytes: null,
          error:
            "Luke's foundation checkpoint is not installed. Run `python scripts/install_foundation.py`.",
        }),
      );
    flushWeb(http);
    flushVoice(http);
    flushTools(http);
    await fixture.whenStable();
    fixture.detectChanges();

    const card = (fixture.nativeElement as HTMLElement).querySelector('app-foundation-card');
    expect(card?.textContent).toContain('No checkpoint installed');
    expect(card?.textContent).toContain('install_foundation.py');
    http.verify();
  });

  it('summarizes the engine state before the cards', async () => {
    const fixture = TestBed.createComponent(Settings);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    http.expectOne((req) => req.url.endsWith('/health')).flush({ status: 'ok' });
    http.expectOne((req) => req.url.endsWith('/language-model/settings')).flush(modelSettings());
    flushFoundation(http);
    flushWeb(http);
    flushVoice(http);
    flushTools(http);
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
      '0/3',
      'Frost',
    ]);
    expect(facts?.textContent).toContain('version 0.0.0');
    expect(facts?.textContent).toContain('weather, Wikipedia and web');
    expect(facts?.textContent).toContain('Medium text · Sans type');
    http.verify();
  });

  it('keeps card explanations folded until the info button is used', async () => {
    const fixture = TestBed.createComponent(Settings);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    http.expectOne((req) => req.url.endsWith('/health')).flush({ status: 'ok' });
    http.expectOne((req) => req.url.endsWith('/language-model/settings')).flush(modelSettings());
    flushFoundation(http);
    flushWeb(http);
    flushVoice(http);
    flushTools(http);
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

  it('names a failed model reading instead of quoting the transport', async () => {
    const fixture = TestBed.createComponent(Settings);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    http.expectOne((req) => req.url.endsWith('/health')).flush({ status: 'ok' });
    http
      .expectOne((req) => req.url.endsWith('/language-model/settings'))
      .error(new ErrorEvent('offline'));
    flushFoundation(http);
    flushWeb(http);
    flushVoice(http);
    flushTools(http);
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const card = compiled.querySelector('app-model-identity')?.textContent ?? '';
    expect(card).toContain('The model identity could not be read');
    expect(card).toContain('Could not reach the Luke Lab backend');
    expect(card).not.toContain('Http failure response');
    // A read that failed is not a read still in progress.
    const facts = compiled.querySelector('app-engine-facts')?.textContent ?? '';
    expect(facts).toContain('not read');
    expect(facts).not.toContain('reading the model…');
    http.verify();
  });

  it('applies an appearance choice as soon as it is picked', async () => {
    const fixture = TestBed.createComponent(Settings);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    http.expectOne((req) => req.url.endsWith('/health')).flush({ status: 'ok' });
    http.expectOne((req) => req.url.endsWith('/language-model/settings')).flush(modelSettings());
    flushFoundation(http);
    flushWeb(http);
    flushVoice(http);
    flushTools(http);
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
    flushFoundation(http);
    flushWeb(http);
    flushVoice(http);
    flushTools(http);
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const name = pick(compiled, 'input[name="model-name"]');
    expect(name.value).toBe('Luke');

    name.value = 'Nova';
    name.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const start = compiled.querySelector<HTMLInputElement>('input[name="model-start-level"]');
    if (!start) throw new Error('Missing control: input[name="model-start-level"]');
    const datalist = compiled.querySelector<HTMLDataListElement>('datalist#version-suggestions');
    if (!datalist) throw new Error('Missing datalist: datalist#version-suggestions');
    const options = Array.from(datalist.querySelectorAll('option')).map((opt) => opt.value);
    expect(options).toEqual(['0.0.0', '0.1.0']);
    start.value = '0.1.0';
    start.dispatchEvent(new Event('input'));
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
