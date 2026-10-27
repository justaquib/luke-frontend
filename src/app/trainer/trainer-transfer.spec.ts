import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { UiService } from '../shared/ui.service';
import { TrainerTransfer } from './trainer-transfer';

const MODEL = 'HuggingFaceTB/SmolLM2-135M';
const TEACHER = 'teacher-HuggingFaceTB-SmolLM2-135M';

function record(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    folder: TEACHER,
    model_id: MODEL,
    model_name: 'SmolLM2 135M',
    started: 0,
    finished: null,
    stage: 'done',
    total: 2,
    done: 2,
    kept: 2,
    skipped: 0,
    by_kind: { lesson: 2 },
    last_question: 'What is a drum?',
    last_answer: 'A drum is hit with a stick.',
    faq_ids: [11, 12],
    undone: 0,
    error: null,
    seconds: 3.2,
    ...overrides,
  };
}

function state(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
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
    available: 3,
    limit: 40,
    by_kind: { lesson: 2, document: 1 },
    samples: [
      { kind: 'lesson', question: 'What is a drum?' },
      { kind: 'document', question: 'Tell me about notes.' },
    ],
    running: false,
    progress: null,
    last: null,
    ...overrides,
  };
}

describe('TrainerTransfer', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrainerTransfer],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  const render = (
    initial: Record<string, unknown> = state(),
  ): { fixture: ComponentFixture<TrainerTransfer>; compiled: HTMLElement } => {
    const fixture = TestBed.createComponent(TrainerTransfer);
    fixture.detectChanges();
    http
      .expectOne((request) => request.url.endsWith('/language-model/huggingface/transfer'))
      .flush(initial);
    fixture.detectChanges();
    return { fixture, compiled: fixture.nativeElement as HTMLElement };
  };

  const button = (compiled: HTMLElement, label: string): HTMLButtonElement =>
    [...compiled.querySelectorAll<HTMLButtonElement>('button')].find(
      (item): boolean => !!item.textContent?.includes(label),
    )!;

  it('shows the teacher it will ask and what the material offers', () => {
    const { compiled } = render();

    expect(compiled.textContent).toContain('Move the teacher’s knowledge into Luke');
    expect((compiled.querySelector('.select') as HTMLSelectElement).value).toBe(TEACHER);
    expect(compiled.textContent).toContain('3 new question(s) from 2 source(s)');
    expect(compiled.textContent).toContain('Lessons · 2');
    expect(compiled.textContent).toContain('Documents · 1');
    expect(compiled.querySelector('.samples')?.textContent).toContain('What is a drum?');
    expect(button(compiled, 'Transfer into Luke').disabled).toBe(false);
  });

  it('starts the transfer with the chosen teacher and question count', () => {
    const { fixture, compiled } = render();
    const limit = compiled.querySelector('.limit input') as HTMLInputElement;
    limit.value = '25';
    limit.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    button(compiled, 'Transfer into Luke').click();

    const request = http.expectOne(
      (call) => call.url.endsWith('/language-model/huggingface/transfer') && call.method === 'POST',
    );
    expect(request.request.body).toEqual({ folder: TEACHER, limit: 25 });
    request.flush(
      state({
        available: 0,
        running: true,
        progress: record({
          stage: 'asking',
          total: 4,
          done: 1,
          kept: 1,
          skipped: 0,
          faq_ids: [11],
        }),
      }),
    );
    fixture.detectChanges();

    expect(compiled.textContent).toContain('Asking the teacher · SmolLM2 135M');
    expect(compiled.textContent).toContain('1 / 4 asked · 1 kept · 0 skipped');
    expect(compiled.querySelector('.progress-bar')?.getAttribute('aria-valuenow')).toBe('25');
    fixture.destroy();
  });

  it('undoes the batch only after the confirmation', () => {
    const { fixture, compiled } = render(state({ last: record() }));

    button(compiled, 'Undo transfer').click();
    const ui = TestBed.inject(UiService);
    expect(ui.confirm()?.message).toContain('2 answer(s)');
    ui.resolveConfirm(true);

    const request = http.expectOne((call) =>
      call.url.endsWith('/language-model/huggingface/transfer/undo'),
    );
    request.flush(
      state({
        last: record({ stage: 'undone', faq_ids: [], undone: 2 }),
      }),
    );
    fixture.detectChanges();

    expect(compiled.textContent).toContain('Undone · SmolLM2 135M');
    expect(compiled.textContent).not.toContain('Undo transfer');
    fixture.destroy();
  });

  it('offers the fine-tune first when no teacher is installed', () => {
    const { compiled } = render(state({ teachers: [], available: 0 }));

    expect(compiled.textContent).toContain('Fine-tune a teacher above first.');
    expect(compiled.querySelector('.select')).toBeNull();
  });
});
