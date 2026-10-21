import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Learner } from './learner';

function learnerState(lessonCards: unknown[] = []) {
  return {
    model_name: 'Tiny Word Trigram',
    description: 'A small learner.',
    stage: 'Nursery',
    foundation_lessons: 0,
    trainer_lessons: 0,
    sentence_count: 0,
    token_count: 0,
    vocabulary_size: 24,
    transition_count: 0,
    next_words: [],
    examples: [],
    generated_example: null,
    current_stage_id: 'nursery',
    passed_stages: [],
    stages: [{ id: 'nursery', title: 'Nursery', description: 'First ideas.', subjects: ['Language'], lesson_count: 0, completed: false, attempt_count: 0, pass_count: 0 }],
    letters: 'abcdefghijklmnopqrstuvwxyz',
    word_cards: [],
    lesson_cards: lessonCards,
    active_test: null,
    test_history: [],
  };
}

const duplicateCard = {
  id: 'card-2',
  question: 'What is a magnet?',
  answer: 'A magnet pulls iron.',
  kind: 'trainer',
  grade_id: 'nursery',
  subject: 'Science',
  subjects: ['Science'],
  confidence: 0.5,
};

const duplicates = {
  groups: [
    {
      kind: 'same_question',
      label: 'Same question',
      detail: 'These ask the same thing.',
      key: 'question:what is a magnet?',
      cards: [
        { id: 'card-1', question: 'What is a magnet?', answer: 'It pulls iron.', subject: 'Science', subjects: ['Science'], grade_id: 'nursery', confidence: 0.5 },
        { id: 'card-2', question: 'What is a magnet?', answer: 'A magnet pulls iron.', subject: 'Science', subjects: ['Science'], grade_id: 'nursery', confidence: 0.5 },
      ],
    },
  ],
  total_questions: 12,
  duplicate_count: 1,
};

describe('Learner', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Learner],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
  });

  function flushState(http: HttpTestingController, cards: unknown[] = []) {
    http.expectOne((req) => req.url.endsWith('/language-model/state')).flush(learnerState(cards));
    http.expectOne((req) => req.url.endsWith('/language-model/lessons/duplicates')).flush(duplicates);
  }

  it('shows the shared frame, the same as the other dashboard pages', async () => {
    const fixture = TestBed.createComponent(Learner);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    flushState(http);
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-shell')).toBeTruthy();
    expect(compiled.querySelector('app-sidebar')).toBeTruthy();
    expect(compiled.querySelector('app-page-header')).toBeTruthy();
    expect(compiled.querySelector('.page-header h1')?.textContent?.trim()).toBe('Language Learner');

    const links = [...compiled.querySelectorAll('app-sidebar a.nav-item')].map((link) => link.getAttribute('href'));
    expect(links).toEqual(['/chat', '/trainer', '/learner', '/brain', '/settings']);
    http.verify();
  });

  it('folds the shared navigation away when the toggle is used', async () => {
    const fixture = TestBed.createComponent(Learner);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    flushState(http);
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    compiled.querySelector<HTMLButtonElement>('app-sidebar .sidebar-toggle')?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(compiled.querySelector('app-sidebar')?.classList.contains('sidebar-collapsed')).toBe(true);
    expect(compiled.querySelector('app-sidebar .nav-label')).toBeNull();
    http.verify();
  });

  it('adds a lesson without checking for duplicates first', async () => {
    const fixture = TestBed.createComponent(Learner);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    flushState(http);
    await fixture.whenStable();
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      lessonQuestionDraft: { set: (value: string) => void };
      lessonAnswerDraft: { set: (value: string) => void };
      learnerTab: { set: (value: string) => void };
    };
    component.learnerTab.set('lessons');
    component.lessonQuestionDraft.set('What is a magnet?');
    component.lessonAnswerDraft.set('A magnet pulls iron.');

    fixture.componentInstance.teachLanguageModel();
    await fixture.whenStable();

    // The lesson is taught straight away: nothing is checked first.
    http.expectNone((req) => req.url.endsWith('/language-model/lessons/check'));
    const taught = http.expectOne((req) => req.url.endsWith('/language-model/lessons'));
    expect(taught.request.body.lesson).toContain('What is a magnet?');
    taught.flush({ ...learnerState([duplicateCard]), added_lessons: 1 });
    http.expectOne((req) => req.url.endsWith('/language-model/lessons/duplicates')).flush(duplicates);
    await fixture.whenStable();
    fixture.detectChanges();
    http.verify();
  });

  it('teaches a story as one passage with the name it was given', async () => {
    const fixture = TestBed.createComponent(Learner);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    flushState(http);
    await fixture.whenStable();
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      lessonEntryMode: { set: (value: string) => void };
      lessonTitleDraft: { set: (value: string) => void };
      lessonPassageDraft: { set: (value: string) => void };
    };
    component.lessonEntryMode.set('story');
    component.lessonTitleDraft.set('The Cat on the Mat');
    component.lessonPassageDraft.set('The cat sat on the mat. It was a warm afternoon.');

    fixture.componentInstance.teachLanguageModel();
    await fixture.whenStable();

    const taught = http.expectOne((req) => req.url.endsWith('/language-model/lessons'));
    expect(taught.request.body.kind).toBe('story');
    expect(taught.request.body.title).toBe('The Cat on the Mat');
    expect(taught.request.body.lesson).toContain('The cat sat on the mat.');
    taught.flush({ ...learnerState([duplicateCard]), added_lessons: 1 });
    http.expectOne((req) => req.url.endsWith('/language-model/lessons/duplicates')).flush(duplicates);
    await fixture.whenStable();
    fixture.detectChanges();
    http.verify();
  });

  it('counts the questions and the duplicates and marks the repeats', async () => {
    const fixture = TestBed.createComponent(Learner);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    flushState(http, [duplicateCard]);
    await fixture.whenStable();
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as { learnerTab: { set: (value: string) => void } };
    component.learnerTab.set('knowledge');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const badge = compiled.querySelector('.grade-qa-button');
    expect(badge?.textContent?.trim()).toBe('12 questions · 1 duplicate');
    expect(compiled.querySelector('.duplicate-badge')?.textContent?.trim()).toBe('D');
    http.verify();
  });

  it('keeps both lessons of a group when the trainer accepts both', async () => {
    const fixture = TestBed.createComponent(Learner);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    flushState(http, [duplicateCard]);
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    compiled.querySelector<HTMLButtonElement>('.grade-qa-button')?.click();
    http.expectOne((req) => req.url.endsWith('/language-model/lessons/duplicates')).flush(duplicates);
    await fixture.whenStable();
    fixture.detectChanges();

    const acceptBoth = [...compiled.querySelectorAll<HTMLButtonElement>('.duplicate-group > header button')]
      .find((button) => button.textContent?.trim() === 'Accept both');
    expect(acceptBoth).toBeTruthy();

    acceptBoth?.click();
    const accepted = http.expectOne((req) => req.url.endsWith('/language-model/lessons/duplicates/accept'));
    expect(accepted.request.body.key).toBe('question:what is a magnet?');
    accepted.flush(learnerState([duplicateCard]));
    http.expectOne((req) => req.url.endsWith('/language-model/lessons/duplicates')).flush({
      ...duplicates,
      groups: [],
      duplicate_count: 0,
    });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(compiled.querySelector('.duplicate-group')).toBeNull();
    http.verify();
  });

  it('opens the duplicates panel with the choices for every lesson', async () => {
    const fixture = TestBed.createComponent(Learner);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    flushState(http, [duplicateCard]);
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    compiled.querySelector<HTMLButtonElement>('.grade-qa-button')?.click();
    http.expectOne((req) => req.url.endsWith('/language-model/lessons/duplicates')).flush(duplicates);
    await fixture.whenStable();
    fixture.detectChanges();

    const panel = compiled.querySelector('.duplicate-panel');
    expect(panel).toBeTruthy();
    expect(panel?.textContent).toContain('What is a magnet?');
    const cards = [...(panel?.querySelectorAll('.duplicate-card') ?? [])];
    expect(cards.length).toBe(2);
    for (const card of cards) {
      const actions = [...card.querySelectorAll('.duplicate-card-actions button')].map((button) => button.textContent?.trim());
      expect(actions).toEqual(['Accept this one', 'Improve', 'Change the topic', 'Remove']);
    }
    http.verify();
  });
});
