import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Learner } from './learner';

describe('Learner', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Learner],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
  });

  it('warns before adding a lesson that is already taught', async () => {
    const fixture = TestBed.createComponent(Learner);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne((req) => req.url.endsWith('/language-model/state')).flush({
      model_name: 'Tiny Word Trigram',
      description: 'A small learner.',
      stage: 'Nursery',
      foundation_lessons: 0,
      trainer_lessons: 0,
      sentence_count: 0,
      token_count: 0,
      vocabulary_size: 0,
      transition_count: 0,
      next_words: [],
      examples: [],
      generated_example: null,
      current_stage_id: 'nursery',
      passed_stages: [],
      stages: [{ id: 'nursery', title: 'Nursery', description: 'First ideas.', subjects: ['Language'], lesson_count: 0, completed: false, attempt_count: 0, pass_count: 0 }],
      letters: 'abcdefghijklmnopqrstuvwxyz',
      word_cards: [],
      lesson_cards: [],
      active_test: null,
      test_history: [],
    });
    await fixture.whenStable();
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      lessonQuestionDraft: { set: (value: string) => void };
      lessonAnswerDraft: { set: (value: string) => void };
      learnerTab: { set: (value: string) => void };
      languageLessonWarning: () => unknown;
    };
    component.learnerTab.set('lessons');
    component.lessonQuestionDraft.set('What is a circle?');
    component.lessonAnswerDraft.set('A round shape with no corners.');

    fixture.componentInstance.teachLanguageModel();
    const check = http.expectOne((req) => req.url.endsWith('/language-model/lessons/check'));
    check.flush({
      pairs: [{ question: 'What is a circle?', answer: 'A round shape with no corners.' }],
      exact: [{
        question: 'What is a circle?',
        answer: 'A round shape with no corners.',
        subject: 'Shapes',
        grade_id: 'nursery',
        kind: 'trainer',
      }],
      same_question: [],
      similar: [{ question: 'What is a circle?', answer: 'A round shape.', kind: 'starter', similarity: 0.9 }],
      duplicate_words: [],
      duplicate: true,
      faqs: [],
      intents: [],
    });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(component.languageLessonWarning()).toBeTruthy();
    expect(compiled.querySelector('.lesson-duplicate-warning')).toBeTruthy();
    expect(compiled.querySelectorAll('.lesson-duplicate-list li').length).toBe(2);
    expect(compiled.textContent).toContain('What is a circle?');
    http.verify();
  });
});
