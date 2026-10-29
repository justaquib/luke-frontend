import { computed, inject, Injectable, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import type {
  DuplicateGroup,
  DuplicateLessonCard,
  DuplicateLessons,
  LanguageModelState,
} from '../core/api.service';
import { LanguageModelApiService } from '../core/api/language-model-api.service';
import { UiService } from '../shared/ui.service';
import { LearnerModelStore } from './learner-model.store';

/** The lessons that repeat each other, and the choice the trainer makes. */
@Injectable({ providedIn: 'root' })
export class LearnerDuplicatesStore {
  private readonly api = inject(LanguageModelApiService);
  private readonly model = inject(LearnerModelStore);
  private readonly ui = inject(UiService);

  private readonly _groups = signal<DuplicateGroup[]>([]);
  private readonly _duplicateCount = signal(0);
  private readonly _totalQuestions = signal(0);
  private readonly _panelOpen = signal(false);
  private readonly _busyId = signal<string | null>(null);
  private readonly _editId = signal<string | null>(null);
  private readonly _editQuestion = signal('');
  private readonly _editAnswer = signal('');
  private readonly _editSubject = signal('');

  readonly groups = this._groups.asReadonly();
  readonly duplicateCount = this._duplicateCount.asReadonly();
  readonly totalQuestions = this._totalQuestions.asReadonly();
  readonly panelOpen = this._panelOpen.asReadonly();
  readonly busyId = this._busyId.asReadonly();
  readonly editId = this._editId.asReadonly();
  readonly editQuestion = this._editQuestion.asReadonly();
  readonly editAnswer = this._editAnswer.asReadonly();
  readonly editSubject = this._editSubject.asReadonly();
  readonly duplicateCardIds = computed(() => {
    const ids = new Set<string>();
    for (const group of this._groups()) {
      for (const card of group.cards.slice(1)) {
        if (card.id) ids.add(card.id);
      }
    }
    return ids;
  });
  readonly label = computed(() => {
    const groups = this._groups().length;
    const lessons = this._duplicateCount();
    return `${groups} group${groups === 1 ? '' : 's'} · ${lessons} lesson${lessons === 1 ? '' : 's'} repeat another one.`;
  });
  readonly badgeLabel = computed(() => {
    const questions = this._totalQuestions();
    const duplicates = this._duplicateCount();
    return `${questions} question${questions === 1 ? '' : 's'} · ${duplicates} duplicate${duplicates === 1 ? '' : 's'}`;
  });

  /** Read the lessons that repeat each other. */
  load(): void {
    this.api.duplicateLessons().subscribe({
      next: (summary: DuplicateLessons) => {
        this._groups.set(summary.groups);
        this._duplicateCount.set(summary.duplicate_count);
        this._totalQuestions.set(summary.total_questions);
      },
      error: () => {
        this._groups.set([]);
        this._duplicateCount.set(0);
      },
    });
  }

  isDuplicate(cardId: string | undefined | null): boolean {
    if (!cardId) return false;
    return this.duplicateCardIds().has(cardId);
  }

  openPanel(): void {
    this._panelOpen.set(true);
    this.load();
  }

  closePanel(): void {
    this._panelOpen.set(false);
    this.cancelEdit();
  }

  /** Keep every lesson of a group: the repeat is on purpose. */
  acceptBoth(group: DuplicateGroup): void {
    this._busyId.set(group.key);
    this.api.acceptDuplicateLessons(group.key).subscribe({
      next: (state: LanguageModelState) => {
        this.model.apply(state);
        this._busyId.set(null);
        this.load();
        this.ui.success(`Both lessons were kept: ${group.label.toLowerCase()} is accepted.`);
      },
      error: (error: Error) => {
        this._busyId.set(null);
        this.ui.error(error.message);
      },
    });
  }

  /** Keep this lesson and remove the ones it repeats. */
  accept(group: DuplicateGroup, card: DuplicateLessonCard): void {
    const others = group.cards.filter((other) => other.id !== card.id);
    if (!others.length) {
      this.ui.info('There is nothing to remove: this is the only lesson in the group.');
      return;
    }
    this._busyId.set(card.id);
    forkJoin(others.map((other) => this.api.removeLanguageLesson(other.id))).subscribe({
      next: (states: LanguageModelState[]) => {
        const last = states[states.length - 1];
        if (last) this.model.apply(last);
        this._busyId.set(null);
        this.model.refresh();
        this.load();
        this.ui.success(`Kept the lesson and removed ${others.length} that repeated it.`);
      },
      error: () => {
        this._busyId.set(null);
        this.ui.error('The lesson could not be removed.');
      },
    });
  }

  /** Remove this lesson. */
  remove(card: DuplicateLessonCard): void {
    this._busyId.set(card.id);
    this.api.removeLanguageLesson(card.id).subscribe({
      next: (state: LanguageModelState) => {
        this.model.apply(state);
        this._busyId.set(null);
        this.model.refresh();
        this.load();
        this.ui.success('The lesson was removed.');
      },
      error: (error: Error) => {
        this._busyId.set(null);
        this.ui.error(error.message);
      },
    });
  }

  /** Start improving the question or the answer of a lesson. */
  startEdit(card: DuplicateLessonCard): void {
    this._editId.set(card.id);
    this._editQuestion.set(card.question);
    this._editAnswer.set(card.answer);
    this._editSubject.set(card.subjects.join(', ') || card.subject);
  }

  cancelEdit(): void {
    this._editId.set(null);
    this._editQuestion.set('');
    this._editAnswer.set('');
    this._editSubject.set('');
  }

  setEditQuestion(value: string): void {
    this._editQuestion.set(value);
  }

  setEditAnswer(value: string): void {
    this._editAnswer.set(value);
  }

  setEditSubject(value: string): void {
    this._editSubject.set(value);
  }

  /** Save the improved question, answer and topic of a lesson. */
  saveEdit(): void {
    const id = this._editId();
    if (!id) return;
    const question = this._editQuestion().trim();
    const answer = this._editAnswer().trim();
    const subject = this._editSubject().trim();
    if (!question || !answer) {
      this.ui.error('A lesson needs both a question and an answer.');
      return;
    }
    this._busyId.set(id);
    this.api
      .updateLanguageLessonAnswer(id, answer, question, undefined, subject || undefined)
      .subscribe({
        next: (state: LanguageModelState) => {
          this.model.apply(state);
          this._busyId.set(null);
          this.cancelEdit();
          this.load();
          this.ui.success('The lesson was improved.');
        },
        error: (error: Error) => {
          this._busyId.set(null);
          this.ui.error(error.message);
        },
      });
  }
}
