import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { IntegrationsService } from '../core/integrations.service';
import { WebSources } from './web-sources';

const policy = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
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
  ...overrides,
});

const status = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  policy: policy(),
  sources: [],
  counts: { indexed: 0, candidate: 0, superseded: 0 },
  ...overrides,
});

const source = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: 4,
  url: 'https://docs.example.com/guide',
  domain: 'docs.example.com',
  enabled: true,
  title: 'Guide',
  status: 'indexed',
  checked_at: '2026-10-28T09:00:00',
  ...overrides,
});

function build(): { fixture: ComponentFixture<WebSources>; http: HttpTestingController } {
  const fixture = TestBed.createComponent(WebSources);
  const http = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  return { fixture, http };
}

describe('WebSources', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [WebSources],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  afterEach(() => localStorage.clear());

  it('reads the policy and shows what each source holds', () => {
    const { fixture, http } = build();
    http
      .expectOne((req) => req.url.endsWith('/web/status'))
      .flush(
        status({
          sources: [source()],
          counts: { indexed: 1, candidate: 2, superseded: 3 },
        }),
      );
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('docs.example.com');
    expect(compiled.textContent).toContain('indexed');
    expect(compiled.textContent).toContain('checked 2026-10-28');
    expect(compiled.textContent).toContain('1 indexed');
    expect(compiled.textContent).toContain('2 waiting');
    expect(compiled.textContent).toContain('3 replaced');
    http.verify();
  });

  it('saves a source and reports the measured refresh run', () => {
    const { fixture, http } = build();
    http
      .expectOne((req) => req.url.endsWith('/web/status'))
      .flush(status({ policy: policy({ enabled: true, endpoint: 'http://search.local:8080' }) }));
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const addRow = compiled.querySelectorAll('.web-add')[1] as HTMLElement;
    const input = addRow.querySelector('input') as HTMLInputElement;
    input.value = 'https://docs.example.com/guide';
    input.dispatchEvent(new Event('input'));
    (addRow.querySelector('button') as HTMLButtonElement).click();

    const added = http.expectOne((req) => req.url.endsWith('/web/sources'));
    expect(added.request.body).toEqual({ url: 'https://docs.example.com/guide' });
    added.flush({ source: { id: 4, url: input.value, domain: 'docs.example.com' } });
    http
      .expectOne((req) => req.url.endsWith('/web/status'))
      .flush(status({ policy: policy({ enabled: true }), sources: [source({ status: 'new' })] }));
    fixture.detectChanges();

    (compiled.querySelector('.web-actions button') as HTMLButtonElement).click();
    http
      .expectOne((req) => req.url.endsWith('/web/refresh'))
      .flush({
        report: { checked: 1, changed: 1, unchanged: 0, failed: 0, expired: 0 },
        sources: [source()],
      });
    http
      .expectOne((req) => req.url.endsWith('/web/status'))
      .flush(status({ policy: policy({ enabled: true }), sources: [source()] }));
    fixture.detectChanges();

    expect(compiled.textContent).toContain('checked 1 · changed 1');
    http.verify();
  });

  it('turns the web preference on with the policy', () => {
    const { fixture, http } = build();
    http.expectOne((req) => req.url.endsWith('/web/status')).flush(status({}));
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const box = compiled.querySelector<HTMLInputElement>('.toggle-row input') as HTMLInputElement;
    box.checked = true;
    box.dispatchEvent(new Event('change'));

    const saved = http.expectOne((req) => req.method === 'PUT');
    expect((saved.request.body as { enabled: boolean }).enabled).toBe(true);
    saved.flush(policy({ enabled: true }));
    fixture.detectChanges();

    expect(TestBed.inject(IntegrationsService).webEnabled()).toBe(true);
    http.verify();
  });
});
