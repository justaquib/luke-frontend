import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { AnswerModel, AnswerModelCatalog } from '../core/api/api-models';
import { AnswerModelService } from './answer-model.service';

const KEY = 'luke.answer-model';

function catalog(withTeacher: boolean): AnswerModelCatalog {
  const models: AnswerModel[] = [
    {
      id: 'luke',
      name: 'Luke',
      kind: 'luke',
      detail: 'Answers from the taught material.',
      ready: true,
    },
  ];
  if (withTeacher) {
    models.push({
      id: 'teacher-HuggingFaceTB-SmolLM2-135M',
      name: 'SmolLM2 135M',
      kind: 'huggingface',
      detail: 'Fine-tuned on this material.',
      ready: true,
    });
  }
  return { default: 'luke', models };
}

describe('AnswerModelService', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => localStorage.clear());

  it('starts with Luke so the picker is never empty', () => {
    const service = TestBed.inject(AnswerModelService);

    expect(service.models().map((model) => model.id)).toEqual(['luke']);
    expect(service.selectedId()).toBe('luke');
    expect(service.selectionName()).toBe('Luke');
  });

  it('keeps a saved teacher that the backend still lists', () => {
    const teacher = 'teacher-HuggingFaceTB-SmolLM2-135M';
    localStorage.setItem(KEY, teacher);
    const service = TestBed.inject(AnswerModelService);

    service.load();
    http
      .expectOne((request) => request.url.endsWith('/language-model/models'))
      .flush(catalog(true));

    expect(service.selectedId()).toBe(teacher);
    expect(service.selectionName()).toBe('SmolLM2 135M');
  });

  it('falls back to the default when the saved teacher is gone', () => {
    localStorage.setItem(KEY, 'teacher-gone');
    const service = TestBed.inject(AnswerModelService);

    service.load();
    http
      .expectOne((request) => request.url.endsWith('/language-model/models'))
      .flush(catalog(false));

    expect(service.selectedId()).toBe('luke');
    expect(localStorage.getItem(KEY)).toBe('luke');
  });

  it('reads the catalog once and remembers the choice', () => {
    const service = TestBed.inject(AnswerModelService);
    service.load();
    http
      .expectOne((request) => request.url.endsWith('/language-model/models'))
      .flush(catalog(true));
    service.load();
    http.expectNone((request) => request.url.endsWith('/language-model/models'));

    expect(service.models().length).toBe(2);
    expect(service.nameOf('luke')).toBe('Luke');
    expect(service.nameOf('teacher-gone')).toBeNull();
  });
});
