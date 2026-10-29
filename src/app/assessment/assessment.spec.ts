import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type {
  AssessmentProfile,
  AssessmentProfiles,
  AssessmentResult,
  AssessmentRun,
} from '../core/api/assessment.types';
import { PageInfoService } from '../shared/page-info.service';
import { Assessment } from './assessment';

const SKILLS = [
  'grammar',
  'conversation',
  'reading',
  'creative_writing',
  'mathematics',
  'programming',
  'general_knowledge',
  'science',
];

function profile(skill: string, overrides: Partial<AssessmentProfile> = {}): AssessmentProfile {
  return {
    skill,
    title: skill.replace('_', ' '),
    status: 'unassessed',
    score: null,
    stage: null,
    confidence: 'none',
    verdict: 'not measured yet',
    delta: null,
    strengths: [],
    weaknesses: [],
    untested: [],
    waiting: 0,
    items_scored: 0,
    next_step: 'Run the held-out items in unaided mode to get a first score.',
    ...overrides,
  };
}

function run(status: AssessmentRun['status'], done = 0): AssessmentRun {
  return {
    id: 4,
    mode: 'unaided',
    status,
    step: done ? `${done} of 240` : 'Starting',
    progress: done / 240,
    done,
    total: 240,
    model_id: 'Luke 0.0.1',
    model_artifact: 'Qwen/Qwen2.5-0.5B-Instruct@rev#0123456789abcdef',
    tokenizer_id: 'tokenizer#0123456789abcdef',
    generation: {},
    bank: { version: 1, salt: 'luke-assessment-v1', eval_items: 240 },
    error: null,
    created_at: null,
    started_at: null,
    finished_at: null,
  };
}

function sheet(runState: AssessmentRun | null, profiles: AssessmentProfile[]): AssessmentProfiles {
  return { run: runState, profiles };
}

function rubric(): AssessmentResult {
  return {
    id: 11,
    run_id: 4,
    item_id: 'creative_writing:dolly_creative:10644',
    skill: 'creative_writing',
    split: 'eval',
    kind: 'rubric',
    stage: 1,
    topic: 'scene or paragraph',
    response: 'Mix flour and water.',
    method: 'rubric',
    score: null,
    correct: null,
    latency_ms: 10,
    prompt: 'Write me a recipe for pizza dough',
    criteria: ['It follows the request.'],
    reference: null,
    reviewed_by: null,
    reviewed_at: null,
    review_note: null,
  };
}

function controlledStream(): {
  response: Response;
  push: (chunk: string) => void;
  close: () => void;
} {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController<Uint8Array> | null = null;
  const body = new ReadableStream<Uint8Array>({
    start(source) {
      controller = source;
    },
  });
  return {
    response: {
      ok: true,
      status: 200,
      body,
      json: () => Promise.resolve({}),
    } as unknown as Response,
    push: (chunk) => controller?.enqueue(encoder.encode(chunk)),
    close: () => controller?.close(),
  };
}

function button(compiled: HTMLElement, selector: string): HTMLButtonElement {
  const element = compiled.querySelector<HTMLButtonElement>(selector);
  if (!element) throw new Error(`Missing control: ${selector}`);
  return element;
}

describe('Assessment', () => {
  let http: HttpTestingController;
  let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;

  beforeEach(async () => {
    fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);
    await TestBed.configureTestingModule({
      imports: [Assessment],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function open(
    load: AssessmentProfiles,
  ): Promise<{ fixture: ComponentFixture<Assessment>; compiled: HTMLElement }> {
    const fixture = TestBed.createComponent(Assessment);
    fixture.detectChanges();
    http.expectOne((req) => req.url.endsWith('/assessment/profiles?mode=unaided')).flush(load);
    http.expectOne((req) => req.url.endsWith('/assessment/runs')).flush([]);
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, compiled: fixture.nativeElement as HTMLElement };
  }

  it('shows eight skill cards and keeps an unmeasured skill unmeasured', async () => {
    const { compiled } = await open(
      sheet(
        null,
        SKILLS.map((skill) => profile(skill)),
      ),
    );

    expect(compiled.querySelectorAll('.skill-card').length).toBe(8);
    expect(compiled.textContent).toContain('Not measured yet');
    expect(compiled.textContent).toContain('No unaided run has been recorded yet.');
    const info = TestBed.inject(PageInfoService);
    expect(info.facts()).toBeTruthy();
    http.verify();
  });

  it('asks for the mode the trainer chose and shows its own run', async () => {
    const { fixture, compiled } = await open(
      sheet(run('done', 240), [
        profile('grammar', {
          status: 'assessed',
          score: 0.82,
          stage: 2,
          confidence: 'medium',
          verdict: 'benchmark passed',
          items_scored: 30,
          delta: 0.04,
        }),
        ...SKILLS.filter((skill) => skill !== 'grammar').map((skill) => profile(skill)),
      ]),
    );

    expect(compiled.textContent).toContain('82%');
    expect(compiled.textContent).toContain('Stage 2 cleared');
    expect(compiled.textContent).toContain('+4 pts since the last run');

    button(compiled, '.mode-tab:last-of-type').click();
    http
      .expectOne((req) => req.url.endsWith('/assessment/profiles?mode=assisted'))
      .flush(
        sheet(
          null,
          SKILLS.map((skill) => profile(skill)),
        ),
      );
    await fixture.whenStable();
    fixture.detectChanges();

    expect(compiled.textContent).toContain('Saved passages and lessons were available');
    expect(compiled.textContent).not.toContain('82%');
  });

  it('starts a check and follows its stream to the finished cards', async () => {
    const { fixture, compiled } = await open(
      sheet(
        null,
        SKILLS.map((skill) => profile(skill)),
      ),
    );
    const stream = controlledStream();
    fetchMock.mockResolvedValue(stream.response);

    button(compiled, '.top-run').click();
    http
      .expectOne((req) => req.url.endsWith('/assessment/runs') && req.method === 'POST')
      .flush({ run_id: 4, run: run('queued') });
    http.expectOne((req) => req.url.endsWith('/assessment/runs')).flush([run('queued')]);
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
    expect(compiled.textContent).toContain('Queued');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/assessment/runs/4/events'),
      expect.anything(),
    );

    stream.push(`event: run\ndata: ${JSON.stringify(run('running', 120))}\n\n`);
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
    expect(compiled.textContent).toContain('Running');
    expect(compiled.textContent).toContain('120 / 240');

    stream.push(`event: run\ndata: ${JSON.stringify(run('done', 240))}\n\n`);
    stream.close();
    await new Promise((resolve) => setTimeout(resolve, 0));
    http
      .expectOne((req) => req.url.endsWith('/assessment/profiles?mode=unaided'))
      .flush(
        sheet(
          run('done', 240),
          SKILLS.map((skill) => profile(skill)),
        ),
      );
    http.expectOne((req) => req.url.endsWith('/assessment/runs')).flush([run('done', 240)]);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(compiled.textContent).toContain('Done');
  });

  it('opens a waiting rubric and saves the trainer score', async () => {
    const { fixture, compiled } = await open(
      sheet(run('done', 240), [
        ...SKILLS.filter((skill) => skill !== 'creative_writing').map((skill) => profile(skill)),
        profile('creative_writing', { waiting: 1 }),
      ]),
    );

    button(compiled, '.review').click();
    http.expectOne((req) => req.url.endsWith('/assessment/runs/4/results')).flush([rubric()]);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(compiled.textContent).toContain('Write me a recipe for pizza dough');
    expect(compiled.textContent).toContain('It follows the request.');
    const score = compiled.querySelector<HTMLInputElement>('input[name="rubric-score"]');
    if (!score) throw new Error('Missing the rubric score input');
    score.value = '90';
    score.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const save = [...compiled.querySelectorAll('button')].find(
      (element) => element.textContent?.trim() === 'Save score',
    );
    if (!save) throw new Error('Missing the save decision');
    save.click();

    const review = http.expectOne((req) => req.url.endsWith('/assessment/results/11/review'));
    expect(review.request.body).toEqual({ score: 0.9, note: '' });
    review.flush({ ...rubric(), score: 0.9, correct: true });
    http
      .expectOne((req) => req.url.endsWith('/assessment/profiles?mode=unaided'))
      .flush(
        sheet(
          run('done', 240),
          SKILLS.map((skill) => profile(skill)),
        ),
      );
    await fixture.whenStable();
    fixture.detectChanges();

    expect(compiled.textContent).not.toContain('Write me a recipe for pizza dough');
  });

  it('says the read failed rather than that nothing was recorded', async () => {
    const fixture = TestBed.createComponent(Assessment);
    fixture.detectChanges();
    http
      .expectOne((req) => req.url.endsWith('/assessment/profiles?mode=unaided'))
      .error(new ErrorEvent('offline'));
    http.expectOne((req) => req.url.endsWith('/assessment/runs')).flush([]);
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).not.toContain('run has been recorded yet');
    expect(compiled.textContent).toContain('could not be read');
    expect(compiled.textContent).toContain('not read');
  });
});
