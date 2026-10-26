import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  type TestRequest,
} from '@angular/common/http/testing';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { WordPrediction } from '../core/api/api-models';
import { PredictionLab } from './prediction-lab';

function prediction(text: string, words: string[] = ['blue', 'dark']): WordPrediction {
  const tokens = text.split(' ').filter(Boolean);
  return {
    tokens,
    attention: tokens.map((_token, row) => tokens.map((_word, column) => (row === column ? 1 : 0))),
    next: words.map((word, index) => ({
      word,
      probability: 0.42 - index * 0.1,
      count: null,
    })),
    model: 'hf-teacher',
    model_name: 'SmolLM2 135M',
    kind: 'huggingface',
    heads: 9,
    layers: 30,
  };
}

interface PredictBody {
  text?: string;
  model?: string;
  limit?: number;
}

function bodyOf(request: { request: { body: unknown } }): PredictBody {
  return request.request.body as PredictBody;
}

describe('PredictionLab', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PredictionLab],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  const openLab = (seed = 'the sky is'): ComponentFixture<PredictionLab> => {
    const fixture = TestBed.createComponent(PredictionLab);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('seed', seed);
    fixture.componentRef.setInput('model', 'hf-teacher');
    fixture.componentRef.setInput('modelName', 'SmolLM2 135M');
    fixture.detectChanges();
    return fixture;
  };

  const pending = (): TestRequest =>
    http.expectOne((request) => request.url.endsWith('/language-model/predict'));

  it('asks the selected model for the words after the seed', () => {
    const fixture = openLab();
    const compiled = fixture.nativeElement as HTMLElement;
    const request = pending();

    expect(bodyOf(request)).toEqual({ text: 'the sky is', model: 'hf-teacher', limit: 5 });
    request.flush(prediction('the sky is'));
    fixture.detectChanges();

    expect(compiled.querySelector('h2')?.textContent?.trim()).toBe('Prediction lab');
    expect((compiled.querySelector('.lab-prefix') as HTMLTextAreaElement).value).toBe('the sky is');
    const next = [...compiled.querySelectorAll('.next-word')].map((node) => ({
      word: node.querySelector('.next-text')?.textContent?.trim(),
      chance: node.querySelector('.next-prob')?.textContent?.trim(),
    }));
    expect(next).toEqual([
      { word: 'blue', chance: '42%' },
      { word: 'dark', chance: '32%' },
    ]);
    expect(compiled.textContent).toContain('30 layers · 9 heads');
    expect(compiled.querySelectorAll('.heat-cell').length).toBe(9);
  });

  it('continues from a picked word and lets it be removed again', () => {
    const fixture = openLab();
    const compiled = fixture.nativeElement as HTMLElement;
    pending().flush(prediction('the sky is'));
    fixture.detectChanges();

    (compiled.querySelector('.next-word') as HTMLButtonElement).click();
    fixture.detectChanges();
    const afterPick = pending();
    expect(bodyOf(afterPick).text).toBe('the sky is blue');
    afterPick.flush(prediction('the sky is blue', ['because']));
    fixture.detectChanges();

    const picked = compiled.querySelector('.picked-word');
    expect(picked?.textContent).toContain('blue');

    (picked as HTMLButtonElement).click();
    fixture.detectChanges();
    const afterRemove = pending();
    expect(bodyOf(afterRemove).text).toBe('the sky is');
    afterRemove.flush(prediction('the sky is'));
  });

  it('replaces the prediction with a typed word', () => {
    const fixture = openLab();
    const compiled = fixture.nativeElement as HTMLElement;
    pending().flush(prediction('the sky is'));
    fixture.detectChanges();

    const input = compiled.querySelector('.lab-input') as HTMLInputElement;
    input.value = 'night';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    (compiled.querySelector('.lab-custom .primary') as HTMLButtonElement).click();

    const request = pending();
    expect(bodyOf(request).text).toBe('the sky is night');
    request.flush(prediction('the sky is night'));
    fixture.detectChanges();

    expect(compiled.querySelector('.picked-word')?.textContent).toContain('night');
  });

  it('predicts again from an edited prefix', () => {
    const fixture = openLab();
    const compiled = fixture.nativeElement as HTMLElement;
    pending().flush(prediction('the sky is'));
    fixture.detectChanges();

    const area = compiled.querySelector('.lab-prefix') as HTMLTextAreaElement;
    area.value = 'a cat';
    area.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    const again = [...compiled.querySelectorAll<HTMLButtonElement>('.lab-custom button')].find(
      (button) => button.textContent?.includes('Predict again'),
    );
    again?.click();

    const request = pending();
    expect(bodyOf(request).text).toBe('a cat');
    request.flush(prediction('a cat'));
  });

  it('shows the backend reason when the model cannot predict', () => {
    const fixture = openLab();
    const compiled = fixture.nativeElement as HTMLElement;

    pending().flush(
      { detail: 'No trained weights for this model.' },
      { status: 409, statusText: 'Conflict' },
    );
    fixture.detectChanges();

    expect(compiled.querySelector('.lab-error')?.textContent).toContain(
      'No trained weights for this model.',
    );
  });

  it('asks nothing while the lab is closed', () => {
    const fixture = TestBed.createComponent(PredictionLab);
    fixture.componentRef.setInput('open', false);
    fixture.componentRef.setInput('seed', 'the sky is');
    fixture.detectChanges();

    http.expectNone((request) => request.url.endsWith('/language-model/predict'));
  });
});
