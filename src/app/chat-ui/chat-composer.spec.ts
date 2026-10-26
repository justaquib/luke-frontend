import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ChatComposer } from './chat-composer';

const TEACHER = 'hf:teacher-SmolLM2-135M';

describe('ChatComposer', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatComposer],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('shows the model saved on this browser as the chosen one', () => {
    localStorage.clear();
    localStorage.setItem('luke.answer-model', TEACHER);

    const fixture = TestBed.createComponent(ChatComposer);
    fixture.detectChanges();
    http
      .match((request) => request.url.endsWith('/health'))
      .forEach((request) => request.flush({ status: 'ok' }));
    http
      .match((request) => request.url.endsWith('/language-model/models'))
      .forEach((request) =>
        request.flush({
          default: 'luke',
          models: [
            {
              id: 'luke',
              name: 'Luke',
              kind: 'luke',
              detail: 'Answers from the taught material.',
              ready: true,
            },
            {
              id: TEACHER,
              name: 'SmolLM2 135M',
              kind: 'teacher',
              detail: 'Fine-tuned on this tenant’s material.',
              ready: true,
            },
          ],
        }),
      );
    fixture.detectChanges();

    const select = (fixture.nativeElement as HTMLElement).querySelector(
      '.model-select',
    ) as HTMLSelectElement;
    expect(select.value).toBe(TEACHER);
    expect([...select.options].map((option) => option.textContent?.trim())).toEqual([
      'Luke',
      'SmolLM2 135M',
    ]);
  });
});
