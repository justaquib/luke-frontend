import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, toArray } from 'rxjs';
import { AuthService } from '../auth.service';
import { AssessmentApiService } from './assessment-api.service';
import type { AssessmentRun } from './assessment.types';

function bodyOf(...chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

function reply(chunks: string[]): Response {
  return {
    ok: true,
    status: 200,
    body: bodyOf(...chunks),
    json: () => Promise.resolve({}),
  } as unknown as Response;
}

function run(status: AssessmentRun['status'], done: number): AssessmentRun {
  return {
    id: 4,
    mode: 'unaided',
    status,
    step: `${done} of 240`,
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

function frames(): string[] {
  return [
    `event: run\ndata: ${JSON.stringify(run('running', 1))}\n\n`,
    `event: run\ndata: ${JSON.stringify(run('done', 240))}\n\n`,
  ];
}

describe('AssessmentApiService', () => {
  let service: AssessmentApiService;
  let http: HttpTestingController;
  let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;

  beforeEach(() => {
    fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { token: () => 'test-token' } },
      ],
    });
    service = TestBed.inject(AssessmentApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    http.verify();
  });

  it('asks for the cards of one mode, or of one run when it is named', () => {
    service.profiles('assisted').subscribe();
    http.expectOne((req) => req.url.endsWith('/assessment/profiles?mode=assisted')).flush({});

    service.profiles('unaided', 7).subscribe();
    http
      .expectOne((req) => req.url.endsWith('/assessment/profiles?mode=unaided&run_id=7'))
      .flush({});
  });

  it('starts a run of the requested mode and scores a rubric answer', () => {
    service.start('assisted').subscribe();
    const start = http.expectOne((req) => req.url.endsWith('/assessment/runs'));
    expect(start.request.method).toBe('POST');
    expect(start.request.body).toEqual({ mode: 'assisted' });
    start.flush({ run_id: 4, run: run('queued', 0) });

    service.review(11, 0.9, 'clear story').subscribe();
    const review = http.expectOne((req) => req.url.endsWith('/assessment/results/11/review'));
    expect(review.request.method).toBe('POST');
    expect(review.request.body).toEqual({ score: 0.9, note: 'clear story' });
    review.flush({});
  });

  it('follows a run until it is finished', async () => {
    fetchMock.mockResolvedValue(reply(frames()));

    const seen = await firstValueFrom(service.watch(4).pipe(toArray()));

    expect(seen.map((entry) => entry.status)).toEqual(['running', 'done']);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/assessment/runs/4/events');
    expect((init.headers as Record<string, string>)['Accept']).toBe('text/event-stream');
  });

  it('refuses a stream that ends before the run reaches a terminal state', async () => {
    fetchMock.mockResolvedValue(reply(frames().slice(0, 1)));

    await expect(firstValueFrom(service.watch(4).pipe(toArray()))).rejects.toThrow(
      'The run stopped before it was finished. Please try again.',
    );
  });
});
