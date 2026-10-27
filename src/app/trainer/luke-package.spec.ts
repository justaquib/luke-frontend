import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { BrowserService } from '../core/browser.service';
import { LukePackage } from './luke-package';

const MODEL = 'HuggingFaceTB/SmolLM2-135M';

function preview(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    model: { name: 'Luke', start_level: '0.0.0', approved_level: '0.1.0' },
    available: 1622,
    by_kind: { lesson: 500, starter_lesson: 533, document: 387 },
    checkpoints: [
      { name: 'words-0.pt', bytes: 2557967 },
      { name: 'brain-0-intent.pt', bytes: 14301 },
    ],
    teachers: [
      {
        name: 'SmolLM2 135M',
        model_id: MODEL,
        steps: 200,
        bytes: 268435456,
      },
    ],
    pending: 12,
    bytes: 2572268,
    filename: 'luke-0-2026-10-26.zip',
    ...overrides,
  };
}

describe('LukePackage', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LukePackage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  const render = (
    initial: Record<string, unknown> = preview(),
  ): { fixture: ComponentFixture<LukePackage>; compiled: HTMLElement } => {
    const fixture = TestBed.createComponent(LukePackage);
    fixture.detectChanges();
    http
      .expectOne((request) => request.url.endsWith('/language-model/export/preview'))
      .flush(initial);
    fixture.detectChanges();
    return { fixture, compiled: fixture.nativeElement as HTMLElement };
  };

  const button = (compiled: HTMLElement, label: string): HTMLButtonElement =>
    [...compiled.querySelectorAll<HTMLButtonElement>('button')].find(
      (item): boolean => !!item.textContent?.includes(label),
    )!;

  it('counts what the package would hold', () => {
    const { compiled } = render();

    expect(compiled.textContent).toContain('Download Luke');
    expect(compiled.textContent).toContain('Luke · level 0.1.0');
    expect(compiled.textContent).toContain('1622 line(s)');
    expect(compiled.textContent).toContain('2 · 2.5 MB');
    expect(compiled.textContent).toContain('luke-0-2026-10-26.zip');
    expect(compiled.textContent).toContain('Lessons · 500');
    expect(compiled.textContent).toContain('Starter lessons · 533');
    expect(compiled.textContent).toContain('Documents · 387');
    expect(compiled.textContent).toContain('12 unanswered question(s)');
    expect(compiled.textContent).toContain('1 fine-tuned teacher(s) are left out');
    expect(button(compiled, 'Download Luke').disabled).toBe(false);
  });

  it('downloads the zip the backend builds and names it from the preview', () => {
    const browser = TestBed.inject(BrowserService);
    const download = vi.spyOn(browser, 'downloadBlob').mockImplementation((): void => undefined);
    const { fixture, compiled } = render();

    button(compiled, 'Download Luke').click();
    fixture.detectChanges();
    expect(compiled.textContent).toContain('Packing…');

    const request = http.expectOne(
      (call) => call.url.endsWith('/language-model/export') && call.method === 'GET',
    );
    expect(request.request.responseType).toBe('blob');
    const zip = new Blob(['PK'], { type: 'application/zip' });
    request.flush(zip);
    fixture.detectChanges();

    expect(download).toHaveBeenCalledWith(zip, 'luke-0-2026-10-26.zip');
    expect(compiled.textContent).not.toContain('Packing…');
    fixture.destroy();
  });

  it('reports a preview the backend refused', () => {
    const fixture = TestBed.createComponent(LukePackage);
    fixture.detectChanges();
    http
      .expectOne((request) => request.url.endsWith('/language-model/export/preview'))
      .flush({ detail: 'The package could not be counted.' }, { status: 500, statusText: 'Error' });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('The package could not be counted.');
    expect(compiled.querySelector('.actions')).toBeNull();
    fixture.destroy();
  });

  it('says so when Luke has no checkpoint yet', () => {
    const { compiled } = render(preview({ checkpoints: [], bytes: 0 }));

    expect(compiled.textContent).toContain('Luke has no checkpoint yet.');
    expect(button(compiled, 'Download Luke').disabled).toBe(false);
  });
});
