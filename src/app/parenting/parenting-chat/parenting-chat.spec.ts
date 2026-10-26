import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Subject, of, type Observable } from 'rxjs';

import { ParentingApiService } from '../../core/api/parenting-api.service';
import type {
  AnswerStreamEvent,
  CoachingSession,
  CoachingTurn,
  QuestionUnderstanding,
} from '../../core/api/api-models';
import { ParentingChat } from './parenting-chat';

const SESSION: CoachingSession = {
  id: 'session-1',
  topic: 'General',
  child_age_band: '',
  status: 'open',
  turns: 0,
  created_at: '2026-10-25T08:00:00Z',
  updated_at: '2026-10-25T08:00:00Z',
};

const UNDERSTANDING: QuestionUnderstanding = {
  words: [
    {
      word: 'sleep',
      lemma: 'sleep',
      part_of_speech: 'NOUN',
      meaning: 'a natural rest',
      synonyms: ['rest'],
    },
  ],
  question_type: 'fact',
  key_words: ['sleep'],
  plan: ['Taught lessons'],
  connections: [{ source: 'taught', outcome: 'match', detail: 'A lesson answers this.' }],
  grammar_notes: [],
  verified: true,
  verification: 'The answer comes from a taught lesson.',
};

describe('ParentingChat', () => {
  let fixture: ComponentFixture<ParentingChat>;
  let turn$: Subject<AnswerStreamEvent<CoachingTurn>>;
  let createCoachingSession: ReturnType<typeof vi.fn>;
  let streamCoachingTurn: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    createCoachingSession = vi.fn<() => Observable<CoachingSession>>(() => of(SESSION));
    streamCoachingTurn = vi.fn<
      (
        sessionId: string,
        message: string,
        signal?: AbortSignal,
      ) => Observable<AnswerStreamEvent<CoachingTurn>>
    >(() => {
      turn$ = new Subject<AnswerStreamEvent<CoachingTurn>>();
      return turn$;
    });

    await TestBed.configureTestingModule({
      imports: [ParentingChat],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ParentingApiService,
          useValue: { createCoachingSession, streamCoachingTurn },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ParentingChat);
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders the coaching frame around the shell', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-shell')).toBeTruthy();
    expect(compiled.querySelector('main.coach-main')).toBeTruthy();
  });

  it('streams the reading, the connections and the taught answer', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    ask(fixture, 'My child will not sleep');

    expect(streamCoachingTurn).toHaveBeenCalledWith(
      'session-1',
      'My child will not sleep',
      expect.any(AbortSignal),
    );
    expect(compiled.querySelector('app-answer-pipeline')).toBeTruthy();
    expect(compiled.querySelector('.coach-bubble.typing')).toBeNull();
    expect(compiled.textContent).toContain('Reading the question');

    turn$.next({
      type: 'reading',
      reading: {
        words: UNDERSTANDING.words,
        question_type: 'fact',
        key_words: ['sleep'],
      },
    });
    turn$.next({
      type: 'thinking',
      thinking: { question_type: 'fact', key_words: ['sleep'], plan: ['Taught lessons'] },
    });
    fixture.detectChanges();

    expect(compiled.querySelector('.word-text')?.textContent?.trim()).toBe('sleep');
    expect(compiled.textContent).toContain('a natural rest');
    expect(compiled.textContent).toContain('Planning where to look');

    turn$.next({
      type: 'connecting',
      connection: { source: 'taught', outcome: 'match', detail: 'A lesson answers this.' },
    });
    fixture.detectChanges();

    expect(compiled.textContent).toContain('Connecting dots');
    expect(compiled.querySelector('.connection')?.textContent).toContain('A lesson answers this.');

    turn$.next({
      type: 'answer',
      answer: {
        status: 'answered',
        answer: {
          text: 'A regular bedtime helps a child settle.',
          confidence: 0.8,
          grounded: true,
          source: 'taught',
        },
        understanding: UNDERSTANDING,
      },
    });
    fixture.detectChanges();

    expect(compiled.querySelector('app-answer-pipeline')).toBeNull();
    const coach = compiled.querySelector('.coach-bubble.coach');
    expect(coach).toBeTruthy();
    expect(coach?.querySelector('.sr-only')?.textContent).toBe(
      'A regular bedtime helps a child settle.',
    );
    expect(coach?.textContent).toContain('taught');
  });

  it('clears the pipeline and adds no answer when the turn fails', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    ask(fixture, 'My child will not sleep');

    turn$.next({ type: 'error', message: 'The answer stopped before it was finished.' });
    fixture.detectChanges();

    expect(compiled.querySelector('app-answer-pipeline')).toBeNull();
    expect(compiled.querySelector('.coach-bubble.coach')).toBeNull();
    expect(compiled.querySelector<HTMLTextAreaElement>('.coach-input')?.disabled).toBe(false);
  });
});

function ask(fixture: ComponentFixture<ParentingChat>, text: string): void {
  const compiled = fixture.nativeElement as HTMLElement;
  const input = compiled.querySelector<HTMLTextAreaElement>('.coach-input');
  input!.value = text;
  input!.dispatchEvent(new Event('input'));
  fixture.detectChanges();
  compiled.querySelector<HTMLButtonElement>('.coach-send')!.click();
  fixture.detectChanges();
}
