import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, toArray, type Observable } from 'rxjs';
import { AuthService } from '../auth.service';
import { AnswerStreamService } from './answer-stream.service';
import type { AnswerStreamEvent, QueryResponse } from './api-models';

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

function failure(status: number, detail: string): Response {
  return {
    ok: false,
    status,
    body: null,
    json: () => Promise.resolve({ detail }),
  } as unknown as Response;
}

function frames(): string[] {
  return [
    'event: reading\ndata: {"words":[],"question_type":"definition","key_words":["circle"]}\n\n',
    'event: thinking\ndata: {"question_type":"definition","key_words":["circle"],"plan":["Taught lessons"]}\n\n',
    'event: connecting\ndata: {"source":"taught","outcome":"match","detail":"A lesson answers this."}\n\n',
    'event: answer\ndata: {"question":"What is a circle?","source":"lesson_cards","answer":"A round shape.","hits":[],"entities":[],"pending_id":null}\n\n',
    'event: done\ndata: {}\n\n',
  ];
}

describe('AnswerStreamService', () => {
  let service: AnswerStreamService;
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
    service = TestBed.inject(AnswerStreamService);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function collect<T>(
    stream: Observable<AnswerStreamEvent<T>>,
  ): Promise<AnswerStreamEvent<T>[]> {
    return firstValueFrom(stream.pipe(toArray()));
  }

  it('yields the stages in the order the backend sent them', async () => {
    fetchMock.mockResolvedValue(reply(frames()));

    const events = await collect<QueryResponse>(service.streamQuery('What is a circle?'));

    expect(events.map((event) => event.type)).toEqual([
      'reading',
      'thinking',
      'connecting',
      'answer',
    ]);
    const answer = events.at(-1);
    expect(answer?.type === 'answer' && answer.answer.answer).toBe('A round shape.');
  });

  it('posts to the stream endpoint with the event-stream accept header and the token', async () => {
    fetchMock.mockResolvedValue(reply(frames()));

    await collect(service.streamQuery('What is a circle?', 4, { apps: { wiki: false } }));

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/query/stream');
    expect(init?.method).toBe('POST');
    const headers = init?.headers as Record<string, string>;
    expect(headers['Accept']).toBe('text/event-stream');
    expect(headers['Authorization']).toBe('Bearer test-token');
    expect(JSON.parse(String(init?.body))).toEqual({
      question: 'What is a circle?',
      n_results: 4,
      apps: { wiki: false },
    });
  });

  it('surfaces the backend detail when the request is refused', async () => {
    fetchMock.mockResolvedValue(failure(403, 'User is not assigned to a tenant'));

    await expect(collect(service.streamQuery('hello'))).rejects.toThrow(
      'User is not assigned to a tenant',
    );
  });

  it('fails when the stream ends without its closing done', async () => {
    fetchMock.mockResolvedValue(reply(frames().slice(0, 2)));

    await expect(collect(service.streamQuery('hello'))).rejects.toThrow(
      'The answer stopped before it was finished. Please ask again.',
    );
  });

  it('completes without events when the caller aborted before the request', async () => {
    const controller = new AbortController();
    controller.abort();

    const events = await collect(service.streamQuery('hello', 4, undefined, controller.signal));

    expect(events).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uses the preview and coaching paths for their own streams', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(reply(['event: done\ndata: {}\n\n'])));

    await collect(service.streamPreview('What is a circle?', true));
    await collect(service.streamCoachingTurn('abc123', 'He will not listen'));

    expect(String(fetchMock.mock.calls[0][0])).toContain('/language-model/preview/stream');
    expect(String(fetchMock.mock.calls[1][0])).toContain(
      '/parenting/chat/session/abc123/turn/stream',
    );
  });
});
