import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Brain } from './brain';

describe('Brain', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Brain],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
  });

  it('renders the 3d brain with knowledge nodes', async () => {
    const fixture = TestBed.createComponent(Brain);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.brain-model')).toBeTruthy();
    expect(compiled.querySelectorAll('.brain-node').length).toBe(40);
    // The level card falls back to a placeholder until the model answers.
    expect(compiled.querySelector('.brain-readout h2')?.textContent?.trim()).toBeTruthy();
  });

  it('shows the shared frame, the same as the other dashboard pages', async () => {
    const fixture = TestBed.createComponent(Brain);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-shell')).toBeTruthy();
    expect(compiled.querySelector('app-sidebar')).toBeTruthy();
    expect(compiled.querySelector('app-page-header')).toBeTruthy();
    expect(compiled.querySelector('.page-header h1')?.textContent?.trim()).toBe('Assistance Brain');

    const links = [...compiled.querySelectorAll('app-sidebar a.nav-item')].map((link) =>
      link.getAttribute('href'),
    );
    expect(links).toEqual(['/chat', '/trainer', '/learner', '/brain', '/settings']);
  });

  it('keeps testing the level apart from training the brain', async () => {
    const fixture = TestBed.createComponent(Brain);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const buttons = [...compiled.querySelectorAll('button')];
    const testButton = buttons.find((button) => button.textContent?.trim() === 'Test my level');
    const trainButton = buttons.find((button) => button.textContent?.trim() === 'Train the brain');
    expect(testButton).toBeTruthy();
    expect(trainButton).toBeTruthy();

    testButton?.click();
    const tested = http.expectOne((req) => req.url.endsWith('/language-model/brain/test'));
    expect(tested.request.method).toBe('POST');
    tested.flush({
      state: {
        vocabulary: 10,
        emotions: [],
        trained: false,
        transformer_ready: false,
        transformer: {},
        corrections: 0,
        feedback_entries: 0,
        model_level: {
          level: 0,
          levels: [],
          rungs: [],
          generality_probes: [],
          training_volume: { level: 0 },
        },
      },
      rungs: [],
      passed: 3,
      total: 9,
    });
    await fixture.whenStable();
    fixture.detectChanges();

    trainButton?.click();
    const trained = http.expectOne((req) => req.url.endsWith('/language-model/brain/train'));
    expect(trained.request.method).toBe('POST');
    trained.flush({
      state: {
        vocabulary: 10,
        emotions: [],
        trained: false,
        transformer_ready: false,
        transformer: {},
        corrections: 0,
        feedback_entries: 0,
        model_level: {
          level: 0,
          levels: [],
          rungs: [],
          generality_probes: [],
          training_volume: { level: 0 },
        },
      },
      sentence: 'a cat sat',
      training: false,
    });
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('opens the training panel while the brain trains', async () => {
    const fixture = TestBed.createComponent(Brain);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-brain-training-panel')).toBeNull();

    const trainButton = [...compiled.querySelectorAll('button')].find(
      (button) => button.textContent?.trim() === 'Train the brain',
    );
    trainButton?.click();

    const trained = http.expectOne((req) => req.url.endsWith('/language-model/brain/train'));
    trained.flush({
      state: {
        vocabulary: 10,
        emotions: [],
        trained: false,
        transformer_ready: false,
        transformer: {},
        corrections: 0,
        feedback_entries: 0,
        training: true,
        model_level: {
          level: 0,
          levels: [],
          rungs: [],
          generality_probes: [],
          training_volume: { level: 0 },
        },
      },
      sentence: null,
      training: true,
    });
    await fixture.whenStable();
    fixture.detectChanges();

    // The panel is open, so the trainer can see what it learns from while it
    // learns it.
    expect(compiled.querySelector('app-brain-training-panel')).toBeTruthy();
  });

  it('opens the training sources beside the training button', async () => {
    const fixture = TestBed.createComponent(Brain);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const infoButton = compiled.querySelector<HTMLButtonElement>('.info-button');
    expect(infoButton).toBeTruthy();
    expect(infoButton?.getAttribute('aria-label')).toBe('Show what the brain trains from');

    infoButton?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    const panel = compiled.querySelector('app-brain-training-panel');
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
    await fixture.whenStable();
    fixture.detectChanges();

    const text = compiled.querySelector('.training-panel')?.textContent ?? '';
    expect(text).toContain('Lessons you taught');
    expect(text).toContain('Your documents');
    expect(text).toContain('Collect');
  });
});
