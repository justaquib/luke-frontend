import { inject, Injectable, signal } from '@angular/core';
import {
  ApiService,
  type LanguageLessonCard,
  type LanguageModelState,
  type LanguageTrainerAnswer,
} from '../core/api.service';
import { LanguageModelApiService } from '../core/api/language-model-api.service';
import { UiService } from '../shared/ui.service';
import { lessonTopics } from './learner-lessons.model';
import { LearnerModelStore } from './learner-model.store';

interface LessonRemoval {
  id: string;
  question: string;
}

interface AnswerRemoval {
  id: number;
  question: string;
}

/** Editing and removing one of the learner's own lessons. */
@Injectable()
export class LearnerLessonEditorStore {
  private readonly api = inject(LanguageModelApiService);
  private readonly model = inject(LearnerModelStore);
  private readonly ui = inject(UiService);

  readonly editingId = signal<string | null>(null);
  readonly editingQuestion = signal('');
  readonly editingAnswer = signal('');
  readonly editingSubject = signal('');
  readonly savingId = signal<string | null>(null);
  readonly deletePrompt = signal<LessonRemoval | null>(null);
  readonly deletingId = signal<string | null>(null);

  beginEdit(lesson: LanguageLessonCard): void {
    if (lesson.kind !== 'trainer' || !lesson.id) return;
    this.editingId.set(lesson.id);
    this.editingQuestion.set(lesson.question);
    this.editingAnswer.set(lesson.answer);
    this.editingSubject.set(lessonTopics(lesson).join(', '));
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.editingQuestion.set('');
    this.editingAnswer.set('');
    this.editingSubject.set('');
  }

  save(id: string): void {
    const answer = this.editingAnswer().trim();
    const question = this.editingQuestion().trim();
    const subject = this.editingSubject().trim();
    if (!answer || this.savingId()) return;
    this.savingId.set(id);
    this.api
      .updateLanguageLessonAnswer(
        id,
        answer,
        question || undefined,
        undefined,
        subject || undefined,
      )
      .subscribe({
        next: (state: LanguageModelState) => {
          this.model.apply(state);
          this.cancelEdit();
          this.savingId.set(null);
          this.ui.success('Learner answer updated.');
        },
        error: (error: Error) => {
          this.model.fail(error.message);
          this.savingId.set(null);
        },
      });
  }

  promptRemoval(id: string, question: string): void {
    this.deletePrompt.set({ id, question });
  }

  cancelRemoval(): void {
    this.deletePrompt.set(null);
  }

  confirmRemoval(): void {
    const lesson = this.deletePrompt();
    if (!lesson || this.deletingId()) return;
    this.deletingId.set(lesson.id);
    this.api.removeLanguageLesson(lesson.id).subscribe({
      next: (state: LanguageModelState) => {
        this.model.apply(state);
        this.deletePrompt.set(null);
        this.deletingId.set(null);
        if (this.editingId() === lesson.id) this.cancelEdit();
        this.ui.success('Learner lesson removed.');
      },
      error: (error: Error) => {
        this.model.fail(error.message);
        this.deletingId.set(null);
      },
    });
  }
}

/** Editing and removing one trainer-approved answer. */
@Injectable()
export class LearnerTrainerAnswerEditorStore {
  private readonly api = inject(ApiService);
  private readonly model = inject(LearnerModelStore);
  private readonly ui = inject(UiService);

  readonly editingId = signal<number | null>(null);
  readonly editingDraft = signal('');
  readonly savingId = signal<number | null>(null);
  readonly deletePrompt = signal<AnswerRemoval | null>(null);
  readonly deletingId = signal<number | null>(null);

  beginEdit(item: LanguageTrainerAnswer): void {
    this.editingId.set(item.id);
    this.editingDraft.set(item.answer);
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.editingDraft.set('');
  }

  save(id: number): void {
    const answer = this.editingDraft().trim();
    if (!answer || this.savingId()) return;
    this.savingId.set(id);
    this.api.updateFaq(id, answer).subscribe({
      next: () => {
        this.cancelEdit();
        this.savingId.set(null);
        this.model.refresh();
        this.ui.success('Trainer-approved answer updated.');
      },
      error: (error: Error) => {
        this.model.fail(error.message);
        this.savingId.set(null);
      },
    });
  }

  promptRemoval(id: number, question: string): void {
    this.deletePrompt.set({ id, question });
  }

  cancelRemoval(): void {
    this.deletePrompt.set(null);
  }

  confirmRemoval(): void {
    const item = this.deletePrompt();
    if (!item || this.deletingId()) return;
    this.deletingId.set(item.id);
    this.api.deleteFaq(item.id).subscribe({
      next: () => {
        this.deletePrompt.set(null);
        this.deletingId.set(null);
        if (this.editingId() === item.id) this.cancelEdit();
        this.model.refresh();
        this.ui.success('Trainer answer removed from the approved dataset.');
      },
      error: (error: Error) => {
        this.model.fail(error.message);
        this.deletingId.set(null);
      },
    });
  }
}
