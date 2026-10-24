import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { PageInfoService } from '../shared/page-info.service';
import { Brain } from './brain';

const level = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  level: '0.0.0',
  measured_level: '0.0.0',
  approval_ready: false,
  level_value: 0,
  name: 'Newborn',
  title: 'Newborn',
  description: 'It knows a few words.',
  reference: 'Seed',
  next_level: '0.0.1',
  next_requirement: 'Pass the first rung.',
  capabilities: [],
  max_level: '0.1.0',
  ladder_size: 2,
  levels: [],
  training_volume: { title: 'Newborn', detail: '', items: 0, stages: [], next_stage: null },
  rungs: [],
  next_steps: [],
  coverage: {
    documents: 0,
    chunks: 0,
    trained_answers: 0,
    lessons: 0,
    passed_grades: 0,
    current_stage: 'nursery',
  },
  generality: 0,
  generality_cap: null,
  generality_probes: [],
  instruction_following: 0,
  instruction_probes: [],
  instruction_total: 0,
  instruction_measured: false,
  ladder_share: 0,
  frontier_level: 6,
  frontier_title: 'Frontier',
  frontier_note: '',
  model_name: 'Luke',
  ...overrides,
});

const engine = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  schema: 0,
  device: 'cpu',
  torch: '2.9.0',
  answer: { trained: false },
  words: { trained: false, backend: 'untrained', backend_reason: 'no word model' },
  runs: [],
  ...overrides,
});

const brain = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  trained: false,
  vocabulary: 10,
  transformer: {},
  transformer_ready: false,
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
  engine: engine(),
  model_level: level(),
  ...overrides,
});

const trainedBrain = (): Record<string, unknown> =>
  brain({
    trained: true,
    vocabulary: 1742,
    corrections: 12,
    engine: engine({
      schema: 2,
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
    }),
    model_level: level({
      coverage: {
        documents: 3,
        chunks: 90,
        trained_answers: 120,
        lessons: 40,
        passed_grades: 2,
        current_stage: 'nursery',
      },
      ladder_share: 0.35,
      instruction_following: 0.75,
      instruction_total: 12,
      instruction_written: 9,
      instruction_looked_up: 3,
      instruction_measured: true,
      adversarial: { score: 0.25, passed: 2, total: 8 },
    }),
  });

const store = (): Record<string, unknown> => ({
  documents: [],
  totals: { files: 0, chunks: 0, answers: 0, pending: 0, lessons: 0, vocabulary: 0 },
  model: {
    name: 'Luke',
    level: 0,
    title: 'Newborn',
    vocabulary: 0,
    parameters: 0,
    trained: false,
    steps: 0,
    loss: null,
    corpus_sentences: 0,
    corpus_tokens: 0,
  },
  disk: { learner_bytes: 0, vector_store_bytes: 0, uploads_bytes: 0 },
});

const read = async (
  fixture: ComponentFixture<Brain>,
  http: HttpTestingController,
  state: object,
): Promise<void> => {
  fixture.detectChanges();
  http.expectOne((req) => req.url.endsWith('/language-model/store')).flush(store());
  http.expectOne((req) => req.url.endsWith('/language-model/brain')).flush(state);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
};

/** Open the shared info panel, where the page actions now live. */
const openInfo = (fixture: ComponentFixture<Brain>, http: HttpTestingController): void => {
  (fixture.nativeElement as HTMLElement)
    .querySelector<HTMLButtonElement>('.top-bar .info-btn')
    ?.click();
  fixture.detectChanges();
  http.expectOne((req) => req.url.endsWith('/language-model/brain')).flush(brain());
  http
    .expectOne((req) => req.url.endsWith('/language-model/settings'))
    .flush({ name: 'Luke', start_level: '0.0.0', level: '0.0.0' });
  fixture.detectChanges();
};

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
    expect(text).toContain('35% of 0.1.0');
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
