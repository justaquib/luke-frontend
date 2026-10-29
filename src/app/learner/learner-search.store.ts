import { computed, inject, Injectable, signal } from '@angular/core';
import { ApiService, type LanguageModelState } from '../core/api.service';
import { LanguageModelApiService } from '../core/api/language-model-api.service';
import { UiService } from '../shared/ui.service';
import { LearnerLessonEditorStore, LearnerTrainerAnswerEditorStore } from './learner-editor.store';
import { LearnerKnowledgeStore } from './learner-knowledge.store';
import { canonicalLessonSubject } from './learner-lessons.model';
import { LearnerModelStore } from './learner-model.store';
import { LearnerViewStore } from './learner-view.store';

export interface LearnerSearchResult {
  key: string;
  kind: 'lesson' | 'starter' | 'trainer';
  badge: string;
  lessonId?: string;
  faqId?: number;
  question: string;
  answer: string;
  subject: string;
  grade: string;
  confidence: number;
  editable: boolean;
  showInGrade: boolean;
}

/** Finding one taught question or approved answer, and correcting it. */
@Injectable()
export class LearnerSearchStore {
  private readonly api = inject(ApiService);
  private readonly languageApi = inject(LanguageModelApiService);
  private readonly model = inject(LearnerModelStore);
  private readonly knowledge = inject(LearnerKnowledgeStore);
  private readonly view = inject(LearnerViewStore);
  private readonly lessons = inject(LearnerLessonEditorStore);
  private readonly answers = inject(LearnerTrainerAnswerEditorStore);
  private readonly ui = inject(UiService);

  readonly query = signal('');
  readonly editKey = signal<string | null>(null);
  readonly editQuestion = signal('');
  readonly editAnswer = signal('');
  readonly editConfidence = signal(0.5);
  readonly savingKey = signal<string | null>(null);

  readonly results = computed<LearnerSearchResult[]>(() => {
    const query = this.query().trim().toLowerCase();
    const state = this.model.state();
    if (!query || !state) return [];
    return [...this.lessonResults(state, query), ...this.trainerResults(state, query)].sort(
      (a, b) =>
        this.weight(a, query) - this.weight(b, query) || a.question.localeCompare(b.question),
    );
  });

  private lessonResults(state: LanguageModelState, query: string): LearnerSearchResult[] {
    const results: LearnerSearchResult[] = [];
    for (const lesson of state.lesson_cards) {
      if (!this.matches(query, lesson.question, lesson.answer)) continue;
      const subject = canonicalLessonSubject(lesson.subject ?? 'General');
      const own = lesson.kind === 'trainer' && !!lesson.id;
      results.push({
        key: `lesson:${lesson.id ?? lesson.question}`,
        kind: own ? 'lesson' : 'starter',
        badge: own ? `Your lesson · ${subject}` : `Starter · ${subject}`,
        lessonId: lesson.id,
        question: lesson.question,
        answer: lesson.answer,
        subject,
        grade: lesson.grade_id ?? 'nursery',
        confidence: lesson.confidence ?? 0.5,
        editable: own,
        showInGrade: true,
      });
    }
    return results;
  }

  private trainerResults(state: LanguageModelState, query: string): LearnerSearchResult[] {
    const results: LearnerSearchResult[] = [];
    for (const item of state.trainer_answers ?? []) {
      if (!this.matches(query, item.question, item.answer)) continue;
      results.push({
        key: `faq:${item.id}`,
        kind: 'trainer',
        badge: 'Trainer-approved answer',
        faqId: item.id,
        question: item.question,
        answer: item.answer,
        subject: '',
        grade: '',
        confidence: item.confidence ?? 0.5,
        editable: true,
        showInGrade: false,
      });
    }
    return results;
  }

  private matches(query: string, ...texts: Array<string | undefined>): boolean {
    const haystack = texts.filter(Boolean).join(' ').toLowerCase();
    return query.split(/\s+/).every((term) => haystack.includes(term));
  }

  readonly matchLabel = computed(() => {
    const results = this.results();
    const editable = results.filter((result) => result.editable).length;
    return `${results.length} match${results.length === 1 ? '' : 'es'} · ${editable} editable`;
  });

  private weight(result: LearnerSearchResult, query: string): number {
    const question = result.question.toLowerCase();
    if (question.startsWith(query)) return 0;
    if (question.includes(query)) return 1;
    return 2;
  }

  setQuery(value: string): void {
    this.query.set(value);
    this.cancelEdit();
  }

  beginEdit(result: LearnerSearchResult): void {
    this.editKey.set(result.key);
    this.editQuestion.set(result.question);
    this.editAnswer.set(result.answer);
    this.editConfidence.set(result.confidence);
  }

  cancelEdit(): void {
    this.editKey.set(null);
    this.editQuestion.set('');
    this.editAnswer.set('');
    this.editConfidence.set(0.5);
  }

  setEditConfidence(value: number): void {
    this.editConfidence.set(value);
  }

  save(result: LearnerSearchResult): void {
    const question = this.editQuestion().trim();
    const answer = this.editAnswer().trim();
    if (!question || !answer || this.savingKey()) return;
    this.savingKey.set(result.key);
    const confidence = Math.round(this.editConfidence() * 100) / 100;
    if (result.kind === 'lesson' && result.lessonId) {
      this.saveLesson(result.lessonId, question, answer, confidence);
      return;
    }
    if (result.kind === 'trainer' && result.faqId !== undefined) {
      this.saveApproved(result.faqId, answer);
    }
  }

  private saveLesson(id: string, question: string, answer: string, confidence: number): void {
    this.languageApi.updateLanguageLessonAnswer(id, answer, question, confidence).subscribe({
      next: (state: LanguageModelState) => {
        this.model.apply(state);
        this.cancelEdit();
        this.savingKey.set(null);
        this.ui.success('Lesson question and answer updated.');
      },
      error: (error: Error) => {
        this.model.fail(error.message);
        this.savingKey.set(null);
      },
    });
  }

  private saveApproved(id: number, answer: string): void {
    this.api.updateFaq(id, answer).subscribe({
      next: () => {
        this.cancelEdit();
        this.savingKey.set(null);
        this.model.refresh();
        this.ui.success('Approved answer updated.');
      },
      error: (error: Error) => {
        this.model.fail(error.message);
        this.savingKey.set(null);
      },
    });
  }

  remove(result: LearnerSearchResult): void {
    if (result.kind === 'lesson' && result.lessonId) {
      this.lessons.promptRemoval(result.lessonId, result.question);
      return;
    }
    if (result.kind === 'trainer' && result.faqId !== undefined) {
      this.answers.promptRemoval(result.faqId, result.question);
    }
  }

  focusInGrade(result: LearnerSearchResult): void {
    if (!this.model.state()) return;
    this.knowledge.focus(result.grade, result.subject);
    this.view.showKnowledgeTab('grades');
    this.view.learnerTab.set('knowledge');
  }
}
