import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { UiService } from '../shared/ui.service';
import { TrainerBase } from './trainer-base';

const MODEL = 'HuggingFaceTB/SmolLM2-135M';
const TEACHER = 'teacher-HuggingFaceTB-SmolLM2-135M';

function state(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    machine: { device: 'mps', torch: '2.12.0', transformers: '5.20.2' },
    base_models: [
      {
        id: MODEL,
        name: 'SmolLM2 135M',
        parameters: '135M',
        note: 'Small enough to fine-tune on this machine.',
        trained: true,
      },
    ],
    teachers: [
      {
        folder: TEACHER,
        model_id: MODEL,
        name: 'SmolLM2 135M',
        steps: 200,
        loss: 1.2345,
        trained_at: '2026-10-26T10:00:00Z',
        bytes: 268435456,
        ready: true,
      },
    ],
    last_run: {
      model_id: MODEL,
      stage: 'done',
      stages: { download: 'done', tune: 'done' },
      steps_done: 200,
      steps_total: 200,
      loss: 1.2345,
      finished: 1790000000,
      examples: 42,
    },
    progress: null,
    running: false,
    ...overrides,
  };
}

describe('TrainerBase', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrainerBase],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  const render = (initial: Record<string, unknown> = state()): HTMLElement => {
    const fixture = TestBed.createComponent(TrainerBase);
    fixture.detectChanges();
    http.expectOne((request) => request.url.endsWith('/language-model/huggingface')).flush(initial);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  it('reads the machine, the last run and the saved teachers from the backend', () => {
    const compiled = render();

    expect(compiled.textContent).toContain('mps');
    expect(compiled.textContent).toContain('transformers 5.20.2');
    expect((compiled.querySelector('.select') as HTMLSelectElement).value).toBe(MODEL);
    expect(compiled.querySelector('.stage-chip')?.textContent).toContain('download · done');
    expect(compiled.querySelector('.progress-bar')?.getAttribute('aria-valuenow')).toBe('100');
    expect(compiled.textContent).toContain('step 200 / 200');
    expect(compiled.textContent).toContain('loss 1.2345');
    expect(compiled.textContent).toContain('42 examples from your material.');

    const teacher = compiled.querySelector('.teacher');
    expect(teacher?.textContent).toContain('SmolLM2 135M');
    expect(teacher?.textContent).toContain('200 steps');
    expect(teacher?.textContent).toContain('256 MB');
  });

  it('starts one fine-tune with the chosen steps', () => {
    const fixture = TestBed.createComponent(TrainerBase);
    fixture.detectChanges();
    http
      .expectOne((request) => request.url.endsWith('/language-model/huggingface'))
      .flush(state({ teachers: [], last_run: null }));
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const steps = compiled.querySelector('.input') as HTMLInputElement;
    steps.value = '50';
    steps.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const start = [...compiled.querySelectorAll<HTMLButtonElement>('button')].find((button) =>
      button.textContent?.includes('Fine-tune'),
    );
    start?.click();

    const request = http.expectOne((call) =>
      call.url.endsWith('/language-model/huggingface/train'),
    );
    expect(request.request.body).toEqual({ model_id: MODEL, steps: 50 });
    request.flush(
      state({
        teachers: [],
        last_run: null,
        running: true,
        progress: {
          model_id: MODEL,
          stage: 'tune',
          stages: { download: 'done', tune: 'running' },
          steps_done: 10,
          steps_total: 50,
        },
      }),
    );
    fixture.detectChanges();

    expect(compiled.textContent).toContain('Training…');
    expect(compiled.textContent).toContain('step 10 / 50');
    fixture.destroy();
  });

  it('removes a teacher only after the confirmation', () => {
    const fixture = TestBed.createComponent(TrainerBase);
    fixture.detectChanges();
    http.expectOne((request) => request.url.endsWith('/language-model/huggingface')).flush(state());
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    (compiled.querySelector('.teacher button') as HTMLButtonElement).click();
    const ui = TestBed.inject(UiService);
    expect(ui.confirm()?.message).toContain('SmolLM2 135M');
    ui.resolveConfirm(true);

    const request = http.expectOne((call) => call.method === 'DELETE');
    expect(request.request.url).toContain(`/language-model/huggingface/teachers/${TEACHER}`);
    request.flush(state({ teachers: [] }));
    fixture.detectChanges();

    expect(compiled.textContent).toContain('No teacher is saved yet');
  });
});
