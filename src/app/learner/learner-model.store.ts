import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, computed, inject, Injectable, signal } from '@angular/core';
import type {
  LanguageExample,
  LanguageLessonCard,
  LanguageModelState,
  LanguageStage,
  LanguageTest,
  LanguageTestResult,
  LanguageTrainerAnswer,
  LanguageWordCard,
} from '../core/api.service';
import { LanguageModelApiService } from '../core/api/language-model-api.service';

/** The measured totals the learner summary and the learned card show. */
export interface LearnerLearnedTotals {
  starterLessons: number;
  ownLessons: number;
  wordCards: number;
  trainerAnswers: number;
  sentenceExamples: number;
}

type RefreshListener = (state: LanguageModelState, firstLoad: boolean) => void;

/** The one saved learner state every learner panel reads and writes. */
@Injectable({ providedIn: 'root' })
export class LearnerModelStore {
  private readonly api = inject(LanguageModelApiService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly listeners: RefreshListener[] = [];

  private readonly _state = signal<LanguageModelState | null>(null);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly state = this._state.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  readonly lessons = computed<LanguageLessonCard[]>(() => this._state()?.lesson_cards ?? []);
  readonly stages = computed<LanguageStage[]>(() => this._state()?.stages ?? []);
  readonly activeTest = computed<LanguageTest | null>(() => this._state()?.active_test ?? null);
  readonly testHistory = computed<LanguageTestResult[]>(() => this._state()?.test_history ?? []);
  readonly wordCards = computed<LanguageWordCard[]>(() => this._state()?.word_cards ?? []);
  readonly examples = computed<LanguageExample[]>(() => this._state()?.examples ?? []);
  readonly trainerAnswers = computed<LanguageTrainerAnswer[]>(
    () => this._state()?.trainer_answers ?? [],
  );
  readonly letters = computed(() => this._state()?.letters ?? '');
  readonly currentStageId = computed(() => this._state()?.current_stage_id ?? '');
  readonly lessonTotal = computed(() => this.lessons().length);
  readonly ownLessons = computed(() =>
    this.lessons().filter((lesson) => lesson.kind === 'trainer'),
  );
  readonly starterLessons = computed(() =>
    this.lessons().filter((lesson) => lesson.kind !== 'trainer'),
  );
  readonly learnedTotals = computed<LearnerLearnedTotals>(() => {
    const state = this._state();
    return {
      starterLessons: this.starterLessons().length,
      ownLessons: this.ownLessons().length,
      wordCards: state?.word_cards.length ?? 0,
      trainerAnswers: state?.trainer_answers?.length ?? 0,
      sentenceExamples: state?.example_total ?? 0,
    };
  });
  readonly sidebarSubtitle = computed(() => {
    const state = this._state();
    return state ? `${state.model_name} · ${state.stage}` : 'Reading the learner…';
  });

  /** Read the saved learner material, and say whether it is the first read. */
  refresh(prefix = ''): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const firstLoad = !this._state();
    this._loading.set(true);
    this._error.set(null);
    this.api.languageModelState(prefix).subscribe({
      next: (state: LanguageModelState) => {
        this.apply(state);
        this._loading.set(false);
        for (const listener of this.listeners) {
          listener(state, firstLoad);
        }
      },
      error: (error: Error) => {
        this._error.set(error.message);
        this._loading.set(false);
      },
    });
  }

  /** Keep the state a lesson or test call answered with. */
  apply(state: LanguageModelState): void {
    const current = this._state();
    this._state.set({
      ...state,
      trainer_answers: state.trainer_answers ?? current?.trainer_answers ?? [],
    });
  }

  /** A refresh that moved the grade lets the page follow the learner there. */
  onRefreshed(listener: RefreshListener): void {
    this.listeners.push(listener);
  }

  fail(message: string): void {
    this._error.set(message);
  }

  clearError(): void {
    this._error.set(null);
  }

  stageTitle(stageId: string | undefined): string {
    return this._state()?.stages.find((stage) => stage.id === stageId)?.title ?? stageId ?? '';
  }

  isStageLocked(stageId: string, state: LanguageModelState): boolean {
    if (state.current_stage_id === 'complete') return false;
    const current = state.stages.findIndex((stage) => stage.id === state.current_stage_id);
    const selected = state.stages.findIndex((stage) => stage.id === stageId);
    return selected > current;
  }
}
