import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { PageInfoService } from '../shared/page-info.service';
import { Brain } from './brain';
import { brain, level, openInfo, read, trainedBrain } from './brain.fixtures';

describe('Brain', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Brain],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
  });

  it('reads the engine and both models from the flat state', async () => {
    const fixture = TestBed.createComponent(Brain);
    const http = TestBed.inject(HttpTestingController);
    await read(fixture, http, trainedBrain());

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-brain-engine')).toBeTruthy();
    expect(compiled.querySelector('app-brain-models')).toBeTruthy();
    expect(compiled.querySelector('app-brain-measurements')).toBeTruthy();
    expect(compiled.querySelector('app-brain-runs')).toBeTruthy();
    expect(compiled.querySelector('app-brain-ladder')).toBeTruthy();

    const text = compiled.textContent ?? '';
    expect(text).toContain('Held-out loss');
    expect(text).toContain('4.371');
    expect(text).toContain('7.463');
    expect(text).toContain('neural');
    expect(text).toContain('35% of 1.0.0');
    expect(text).toContain('Ladder to 1.0.0');
    expect(text).toContain('1 of 4 passed');
    expect(text).toContain('3200');

    // The decorative brain and its forty glowing nodes are gone.
    expect(compiled.querySelector('.brain-model')).toBeNull();
    expect(compiled.querySelectorAll('.brain-node').length).toBe(0);
  });

  it('shows the shared frame, the same as the other dashboard pages', async () => {
    const fixture = TestBed.createComponent(Brain);
    const http = TestBed.inject(HttpTestingController);
    await read(fixture, http, brain());

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-shell')).toBeTruthy();
    expect(compiled.querySelector('app-sidebar')).toBeTruthy();
    expect(compiled.querySelector('app-page-header')).toBeNull();
    expect(compiled.querySelector('app-page-actions')).toBeNull();

    // The status stays in the info panel; the train action is in the top bar.
    expect(TestBed.inject(PageInfoService).actions()).toBeTruthy();
    expect(TestBed.inject(PageInfoService).topActions()).toBeTruthy();
    expect(compiled.querySelector('.top-bar .bar-actions .train-button')).toBeTruthy();

    const links = [...compiled.querySelectorAll('app-sidebar a.nav-item')].map((link) =>
      link.getAttribute('href'),
    );
    expect(links).toEqual([
      '/chat',
      '/dashboard/trainer',
      '/dashboard/parenting',
      '/dashboard/learner',
      '/dashboard/brain',
      '/dashboard/design',
      '/dashboard/settings',
    ]);
  });

  it('keeps testing the level apart from training the brain', async () => {
    const fixture = TestBed.createComponent(Brain);
    const http = TestBed.inject(HttpTestingController);
    await read(fixture, http, brain());

    const compiled = fixture.nativeElement as HTMLElement;
    const testButton = compiled.querySelector<HTMLButtonElement>(
      'button[aria-label="Test my level"]',
    );
    const trainButton = compiled.querySelector<HTMLButtonElement>(
      'button[aria-label="Train the brain"]',
    );
    expect(testButton).toBeTruthy();
    expect(trainButton).toBeTruthy();

    testButton?.click();
    const tested = http.expectOne((req) => req.url.endsWith('/language-model/brain/test'));
    expect(tested.request.method).toBe('POST');
    tested.flush({
      state: brain(),
      rungs: [],
      instruction: { score: 0.5, passed: 6, total: 12, measured: true },
      passed: 3,
      total: 9,
    });
    fixture.detectChanges();

    trainButton?.click();
    const trained = http.expectOne((req) => req.url.endsWith('/language-model/brain/train'));
    expect(trained.request.method).toBe('POST');
    trained.flush({ state: brain(), sentence: 'a cat sat', training: false });
    fixture.detectChanges();
  });

  it('opens the training panel while the brain trains', async () => {
    const fixture = TestBed.createComponent(Brain);
    const http = TestBed.inject(HttpTestingController);
    await read(fixture, http, brain());

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-brain-training-panel')).toBeNull();

    const trainButton = compiled.querySelector<HTMLButtonElement>(
      'button[aria-label="Train the brain"]',
    );
    trainButton?.click();

    const trained = http.expectOne((req) => req.url.endsWith('/language-model/brain/train'));
    trained.flush({ state: brain({ training: true }), sentence: null, training: true });
    fixture.detectChanges();

    // The panel is open in the shared sidebar, so the trainer can see what it
    // learns from while it learns it.
    expect(compiled.querySelector('.right-sidebar app-brain-training-panel')).toBeTruthy();
  });

  it('opens the training sources in the shared sidebar', async () => {
    const fixture = TestBed.createComponent(Brain);
    const http = TestBed.inject(HttpTestingController);
    await read(fixture, http, brain());
    openInfo(fixture, http);

    const compiled = fixture.nativeElement as HTMLElement;
    const infoButton = compiled.querySelector<HTMLButtonElement>(
      'button[aria-label="Show what the brain trains from"]',
    );
    expect(infoButton).toBeTruthy();
    expect(infoButton?.getAttribute('aria-label')).toBe('Show what the brain trains from');

    infoButton?.click();
    fixture.detectChanges();

    expect(compiled.querySelector('#right-sidebar-title')?.textContent?.trim()).toBe(
      'Training sources',
    );
    expect(compiled.querySelector('.sidebar-tasks')).toBeNull();
    const panel = compiled.querySelector('.right-sidebar app-brain-training-panel');
    expect(panel).toBeTruthy();

    const report = http.expectOne((req) => req.url.endsWith('/language-model/brain/sources'));
    expect(report.request.method).toBe('GET');
    report.flush({
      sources: [
        {
          key: 'lesson',
          label: 'Lessons you taught',
          detail: 'Every lesson.',
          items: 3,
          words: 40,
        },
        { key: 'document', label: 'Your documents', detail: 'Every document.', items: 0, words: 0 },
      ],
      steps: [{ title: 'Collect', detail: 'Every source is gathered.' }],
      totals: { items: 3, words: 40, sentences: 6, requests: 9 },
      model: { trained: true, vocabulary: 40 },
    });
    fixture.detectChanges();

    const text = compiled.querySelector('.training-panel')?.textContent ?? '';
    expect(text).toContain('Lessons you taught');
    expect(text).toContain('Your documents');
    expect(text).toContain('Collect');
    http.verify();
  });

  it('asks the trainer for the word before the level moves', async () => {
    const fixture = TestBed.createComponent(Brain);
    const http = TestBed.inject(HttpTestingController);
    let state = brain({
      model_level: level({ measured_level: '0.0.2', approval_ready: true }),
    });
    await read(fixture, http, state);

    const compiled = fixture.nativeElement as HTMLElement;
    const approveButton = compiled.querySelector<HTMLButtonElement>('.level-approval button');
    expect(approveButton?.getAttribute('aria-label')).toBe('Approve 0.0.2');

    approveButton?.click();
    const requested = http.expectOne((req) =>
      req.url.endsWith('/language-model/brain/level/approve'),
    );
    expect(requested.request.method).toBe('POST');
    state = brain({
      model_level: level({ level: '0.0.2', measured_level: '0.0.2', approval_ready: false }),
    });
    requested.flush({ state, approved_level: '0.0.2', previous_level: '0.0.0' });
    fixture.detectChanges();

    // The level moves on the trainer's word, so the banner asks no more.
    expect(compiled.querySelector('.level-approval button')).toBeNull();
  });

  it('says a missing measurement is missing instead of showing zero', async () => {
    const fixture = TestBed.createComponent(Brain);
    const http = TestBed.inject(HttpTestingController);
    await read(fixture, http, brain());

    const compiled = fixture.nativeElement as HTMLElement;
    const text = compiled.textContent ?? '';
    expect(text).toContain('not measured yet');
    expect(text).not.toContain('0.000');
    expect(text).not.toContain('NaN');
  });
});
