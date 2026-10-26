import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { AnswerPipeline } from './answer-pipeline';
import { applyStreamEvent, emptyTrace, type AnswerTrace } from './answer-trace';

function fullTrace(): AnswerTrace {
  return {
    reading: {
      words: [
        {
          word: 'circle',
          lemma: 'circle',
          part_of_speech: 'NOUN',
          meaning: 'a round shape',
          synonyms: ['round'],
        },
      ],
      question_type: 'definition',
      key_words: ['circle'],
    },
    thinking: {
      question_type: 'definition',
      key_words: ['circle'],
      plan: ['Taught lessons', 'Offline dictionary'],
    },
    connections: [
      {
        source: 'taught',
        outcome: 'match',
        detail: 'A lesson answers this.',
        matched_question: 'What is a circle?',
      },
      { source: 'dictionary', outcome: 'miss', detail: 'No dictionary entry.' },
    ],
  };
}

async function render(
  trace: AnswerTrace,
  phase: 'reading' | 'thinking' | 'connecting' | 'answer' | null = null,
  live = false,
): Promise<{ fixture: ComponentFixture<AnswerPipeline>; compiled: HTMLElement }> {
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({ imports: [AnswerPipeline] }).compileComponents();
  const fixture = TestBed.createComponent(AnswerPipeline);
  fixture.componentRef.setInput('trace', trace);
  fixture.componentRef.setInput('phase', phase);
  fixture.componentRef.setInput('live', live);
  fixture.detectChanges();
  return { fixture, compiled: fixture.nativeElement as HTMLElement };
}

describe('AnswerPipeline', () => {
  it('shows no stage before the backend has produced one', async () => {
    const { compiled } = await render(emptyTrace(), 'reading', true);

    expect(compiled.textContent).toContain('Reading the question');
    expect(compiled.textContent).not.toContain('Thinking');
    expect(compiled.textContent).not.toContain('Connecting dots');
    expect(compiled.querySelectorAll('.word').length).toBe(0);
  });

  it('reads the words with their part of speech, meaning and synonyms', async () => {
    const { compiled } = await render({ ...emptyTrace(), reading: fullTrace().reading });

    expect(compiled.querySelector('.stage-label')?.textContent?.trim()).toBe('Reading');
    expect(compiled.querySelector('.word-text')?.textContent?.trim()).toBe('circle');
    expect(compiled.querySelector('.word-meta')?.textContent).toContain('noun');
    expect(compiled.textContent).toContain('a round shape');
    expect(compiled.textContent).toContain('same as round');
  });

  it('names the question type and the planned sources', async () => {
    const { compiled } = await render({ ...emptyTrace(), thinking: fullTrace().thinking });

    expect(compiled.textContent).toContain('definition question');
    expect(compiled.textContent).toContain('Taught lessons');
    expect(compiled.querySelectorAll('.plan li').length).toBe(2);
  });

  it('renders one row per real connection with its outcome and detail', async () => {
    const { compiled } = await render({ ...emptyTrace(), connections: fullTrace().connections });

    const rows = compiled.querySelectorAll('.connection');
    expect(rows.length).toBe(2);
    expect(rows[0].classList).toContain('hit');
    expect(rows[0].textContent).toContain('Taught lessons');
    expect(rows[0].textContent).toContain('match');
    expect(rows[0].textContent).toContain('A lesson answers this.');
    expect(rows[0].textContent).toContain('What is a circle?');
    expect(rows[1].classList).not.toContain('hit');
    expect(rows[1].textContent).toContain('No dictionary entry.');
  });

  it('shows the active row only while the answer is live', async () => {
    const live = await render(fullTrace(), 'connecting', true);
    expect(live.compiled.textContent).toContain('Checking the sources');

    const stored = await render(fullTrace(), 'connecting', false);
    expect(stored.compiled.textContent).not.toContain('Checking the sources');
  });

  it('keeps the trace append-only as events arrive', () => {
    let trace = emptyTrace();
    trace = applyStreamEvent(trace, {
      type: 'reading',
      reading: { words: [], question_type: 'fact', key_words: [] },
    });
    trace = applyStreamEvent(trace, {
      type: 'connecting',
      connection: { source: 'faq', outcome: 'miss', detail: 'No saved answer.' },
    });

    expect(trace.reading?.question_type).toBe('fact');
    expect(trace.connections.length).toBe(1);
    expect(applyStreamEvent(trace, { type: 'done' })).toBe(trace);
  });
});
