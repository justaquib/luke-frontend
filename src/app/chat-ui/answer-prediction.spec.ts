import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  type TestRequest,
} from '@angular/common/http/testing';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { WordPrediction } from '../core/api/api-models';
import { AnswerPrediction } from './answer-prediction';
import type { ChatMessage } from './chat.types';

function prediction(text: string): WordPrediction {
  const tokens = text.split(' ').filter(Boolean);
  return {
    tokens,
    attention: tokens.map((_token, row) => tokens.map((_word, column) => (row === column ? 1 : 0))),
    next: [{ word: 'because', probability: 0.5, count: null }],
    model: 'hf:teacher',
    model_name: 'SmolLM2 135M',
    kind: 'huggingface',
    heads: 9,
    layers: 30,
  };
}

function catalog(): Record<string, unknown> {
  return {
    default: 'luke',
    models: [
      { id: 'luke', name: 'Luke', kind: 'luke', detail: '', ready: true },
      {
        id: 'hf:teacher',
        name: 'SmolLM2 135M',
        kind: 'huggingface',
        detail: '',
        ready: true,
      },
    ],
  };
}

function answer(): ChatMessage {
  return {
    id: 2,
    role: 'assistant',
    text: 'Sunlight scatters blue light.',
    timestamp: new Date('2026-10-24T10:01:00Z'),
    model: 'hf:teacher',
    modelName: 'SmolLM2 135M',
  };
}

describe('AnswerPrediction', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnswerPrediction],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    localStorage.clear();
  });

  afterEach(() => http.verify());

  const predictBodies = (): string[] =>
    http
      .match((request) => request.url.endsWith('/language-model/predict'))
      .map((request) => (request.request.body as { text: string }).text);

  const pendingPredictions = (): TestRequest[] =>
    http.match((request) => request.url.endsWith('/language-model/predict'));

  const build = (
    question: string | null = 'Why is the sky blue?',
  ): ComponentFixture<AnswerPrediction> => {
    const fixture = TestBed.createComponent(AnswerPrediction);
    fixture.componentRef.setInput('message', answer());
    fixture.componentRef.setInput('question', question);
    fixture.detectChanges();
    http
      .match((request) => request.url.endsWith('/language-model/models'))
      .forEach((request) => request.flush(catalog()));
    fixture.detectChanges();
    return fixture;
  };

  it('asks the model to read both the question and the answer', () => {
    build();

    expect(predictBodies()).toEqual(['Why is the sky blue?', 'Sunlight scatters blue light.']);
    pendingPredictions().forEach((request) =>
      request.flush(prediction((request.request.body as { text: string }).text)),
    );
  });

  it('shows one heatmap per text with its own lab button', () => {
    const fixture = build();
    pendingPredictions().forEach((request) =>
      request.flush(prediction((request.request.body as { text: string }).text)),
    );
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const reads = compiled.querySelectorAll('app-heat-read');

    expect(reads.length).toBe(2);
    expect(reads[0].querySelector('.read-label')?.textContent?.trim()).toBe('Question');
    expect(reads[1].querySelector('.read-label')?.textContent?.trim()).toBe('Answer');
    expect(compiled.querySelectorAll('.heat-grid').length).toBe(2);
    expect(compiled.querySelectorAll('.heat-cell').length).toBe(5 * 5 + 4 * 4);
    expect(compiled.textContent).toContain('30 layers · 9 heads');
  });

  it('opens the answer heatmap in the lab seeded with the answer', () => {
    const fixture = build();
    pendingPredictions().forEach((request) =>
      request.flush(prediction((request.request.body as { text: string }).text)),
    );
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    const buttons = compiled.querySelectorAll<HTMLButtonElement>('app-heat-read button');
    buttons[1].click();
    fixture.detectChanges();

    const lab = compiled.querySelector('app-prediction-lab');
    const prefix = lab?.querySelector('.lab-prefix') as HTMLTextAreaElement;
    expect(prefix.value).toBe('Sunlight scatters blue light.');
    const replays = pendingPredictions();
    expect(replays.map((request) => (request.request.body as { text: string }).text)).toEqual([
      'Sunlight scatters blue light.',
    ]);
    replays.forEach((request) => request.flush(prediction('Sunlight scatters blue light.')));
  });

  it('points an untrained workspace at the training page instead of empty reads', () => {
    const fixture = build();
    pendingPredictions().forEach((request) =>
      request.flush(
        { detail: 'This model has no trained weights to predict with yet.' },
        { status: 409, statusText: 'Conflict' },
      ),
    );
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelectorAll('app-heat-read').length).toBe(0);
    expect(compiled.textContent).toContain('no trained word model yet');
    const link = compiled.querySelector('a.training-link') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/dashboard/brain');
  });

  it('offers a re-read after a failed read and shows the answer when it returns', () => {
    const fixture = build();
    pendingPredictions().forEach((request) =>
      request.error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' }),
    );
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelectorAll('.read-failed').length).toBe(2);
    const retry = compiled.querySelector<HTMLButtonElement>('.read-failed button');
    retry?.click();
    fixture.detectChanges();

    const retries = pendingPredictions();
    expect(retries.length).toBe(2);
    retries.forEach((request) =>
      request.flush(prediction((request.request.body as { text: string }).text)),
    );
    fixture.detectChanges();

    expect(compiled.querySelectorAll('.read-failed').length).toBe(0);
    expect(compiled.querySelectorAll('.heat-grid').length).toBe(2);
  });

  it('records no question read when the question was not kept', () => {
    const fixture = build(null);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(predictBodies()).toEqual(['Sunlight scatters blue light.']);
    expect(compiled.querySelectorAll('app-heat-read')[0].textContent).toContain(
      'No question was recorded before this answer.',
    );
    pendingPredictions().forEach((request) =>
      request.flush(prediction('Sunlight scatters blue light.')),
    );
  });
});
