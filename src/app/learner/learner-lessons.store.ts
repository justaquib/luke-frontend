import { computed, inject, Injectable, signal } from '@angular/core';
import type { LanguageModelState, LanguageStage } from '../core/api.service';
import { LanguageModelApiService, type LessonKind } from '../core/api/language-model-api.service';
import { UiService } from '../shared/ui.service';
import { LearnerDuplicatesStore } from './learner-duplicates.store';
import type { LessonEntryMode } from './lesson-form';
import {
  canonicalLessonSubject,
  lessonsBySubjectFor,
  type LearnerLessonGroup,
} from './learner-lessons.model';
import { LearnerModelStore } from './learner-model.store';

function firstSubject(state: LanguageModelState, stageId: string): string {
  return state.stages.find((stage) => stage.id === stageId)?.subjects[0] ?? 'General';
}

/** The grade being taught, the lesson form and the material filed under it. */
@Injectable()
export class LearnerLessonsStore {
  private readonly api = inject(LanguageModelApiService);
  private readonly model = inject(LearnerModelStore);
  private readonly duplicates = inject(LearnerDuplicatesStore);
  private readonly ui = inject(UiService);

  readonly teachingStage = signal('nursery');
  readonly entryMode = signal<LessonEntryMode>('own_words');
  readonly subjectDraft = signal('Language');
  readonly questionDraft = signal('');
  readonly answerDraft = signal('');
  readonly titleDraft = signal('');
  readonly passageDraft = signal('');
  readonly pairsDraft = signal('');
  readonly selectedSubject = signal('');
  readonly saving = signal(false);

  readonly selectedStage = computed<LanguageStage | null>(
    () => this.model.stages().find((stage) => stage.id === this.teachingStage()) ?? null,
  );
  readonly stageTitle = computed(
    () => this.selectedStage()?.title ?? this.model.state()?.stage ?? '',
  );
  readonly cardInfo = computed(() => {
    const description = this.selectedStage()?.description ?? '';
    return `${description} Add question and answer lessons, or a story, a lesson or a topic, to teach facts and concepts.`.trim();
  });
  readonly groups = computed<LearnerLessonGroup[]>(() =>
    lessonsBySubjectFor(this.model.state(), this.teachingStage()),
  );
  readonly subjects = computed(() => {
    const suggested = (this.selectedStage()?.subjects ?? []).map(canonicalLessonSubject);
    const taught = this.groups().map((group) => group.subject);
    return [...new Set([...suggested, ...taught])];
  });
  readonly total = computed(() =>
    this.groups().reduce((total, group) => total + group.lessons.length, 0),
  );

  constructor() {
    this.model.onRefreshed((state, firstLoad) => this.followRefresh(state, firstLoad));
  }

  private followRefresh(state: LanguageModelState, firstLoad: boolean): void {
    if (state.current_stage_id === 'complete') return;
    this.teachingStage.set(state.current_stage_id);
    if (firstLoad) {
      this.subjectDraft.set(firstSubject(state, state.current_stage_id));
    }
  }

  isLocked(stageId: string): boolean {
    const state = this.model.state();
    return state ? this.model.isStageLocked(stageId, state) : false;
  }

  selectStage(stageId: string): void {
    const state = this.model.state();
    if (!state || this.model.isStageLocked(stageId, state)) return;
    this.teachingStage.set(stageId);
    this.pairsDraft.set('');
    this.questionDraft.set('');
    this.answerDraft.set('');
    this.selectedSubject.set('');
    this.subjectDraft.set(firstSubject(state, stageId));
  }

  selectSubject(subject: string): void {
    this.selectedSubject.set(subject);
  }

  /** Follow the learner to the grade a passed test opened. */
  followTestStage(stageId: string): void {
    this.teachingStage.set(stageId);
    const state = this.model.state();
    if (state) this.subjectDraft.set(firstSubject(state, stageId));
  }

  /** Put the next lesson under a topic without writing the lesson yet. */
  useSubject(subject: string): void {
    this.subjectDraft.set(subject);
  }

  teach(): void {
    if (this.saving()) return;
    const lesson = this.lessonText();
    if (!lesson.text) return;
    this.model.clearError();
    const stage = this.teachingStage();
    const subject = canonicalLessonSubject(this.subjectDraft());
    this.save(lesson.text, stage, subject, lesson.kind, lesson.title);
  }

  /** What the trainer wrote down, and the kind of lesson it is. */
  private lessonText(): { text: string; kind: LessonKind; title: string } {
    if (this.entryMode() === 'story') {
      return {
        text: this.passageDraft().trim(),
        kind: 'story',
        title: this.titleDraft().trim(),
      };
    }
    if (this.entryMode() === 'formatted') {
      return { text: this.pairsDraft().trim(), kind: 'qa', title: '' };
    }
    const question = this.questionDraft().trim();
    const answer = this.answerDraft().trim();
    if (!question || !answer) return { text: '', kind: 'qa', title: '' };
    return { text: `Q: ${question}\nA: ${answer}`, kind: 'qa', title: '' };
  }

  private save(
    lesson: string,
    stage: string,
    subject: string,
    kind: LessonKind,
    title: string,
  ): void {
    this.saving.set(true);
    this.model.clearError();
    this.api.teachLesson(lesson, stage, subject, kind, title).subscribe({
      next: (state: LanguageModelState) => {
        this.model.apply(state);
        this.selectedSubject.set(subject);
        this.subjectDraft.set(subject);
        this.resetDrafts();
        this.saving.set(false);
        this.duplicates.load();
        const added = state.added_lessons ?? 0;
        this.ui.success(`Added ${added} lesson${added === 1 ? '' : 's'} to ${this.stageTitle()}.`);
      },
      error: (error: Error) => {
        this.model.fail(error.message);
        this.saving.set(false);
      },
    });
  }

  private resetDrafts(): void {
    this.pairsDraft.set('');
    this.questionDraft.set('');
    this.answerDraft.set('');
    this.titleDraft.set('');
    this.passageDraft.set('');
  }
}
