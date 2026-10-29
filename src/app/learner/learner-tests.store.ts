import { computed, inject, Injectable, signal } from '@angular/core';
import type {
  LanguageTestFinishResult,
  LanguageTestKind,
  LanguageTestResult,
} from '../core/api.service';
import { LanguageModelApiService } from '../core/api/language-model-api.service';
import { UiService } from '../shared/ui.service';
import { LearnerLessonsStore } from './learner-lessons.store';
import { LearnerModelStore } from './learner-model.store';

/** The open grade test, its questions and the measured result. */
@Injectable()
export class LearnerTestsStore {
  private readonly api = inject(LanguageModelApiService);
  private readonly model = inject(LearnerModelStore);
  private readonly lessons = inject(LearnerLessonsStore);
  private readonly ui = inject(UiService);

  readonly question = signal('');
  readonly result = signal<LanguageTestFinishResult['result'] | null>(null);
  readonly busy = signal(false);

  readonly activeTest = this.model.activeTest;
  readonly history = this.model.testHistory;
  readonly stageName = computed(() => this.model.state()?.stage ?? '');
  readonly allPassed = computed(
    () => this.model.currentStageId() === 'complete' && !this.activeTest(),
  );

  start(kind: LanguageTestKind = 'trainer'): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.model.clearError();
    this.result.set(null);
    this.question.set('');
    this.api.startLanguageTest(this.lessons.teachingStage(), kind).subscribe({
      next: (started) => {
        this.model.apply(started.state);
        const test = started.state.active_test;
        if (test) this.lessons.followTestStage(test.stage);
        this.busy.set(false);
        if (!test) this.ui.info(started.message || 'All learning stages are passed.');
      },
      error: (error: Error) => {
        this.model.fail(error.message);
        this.busy.set(false);
      },
    });
  }

  ask(): void {
    const question = this.question().trim();
    if (!question || !this.activeTest() || this.busy()) return;
    this.busy.set(true);
    this.model.clearError();
    this.api.askLanguageTestQuestion(question).subscribe({
      next: (answer) => {
        this.model.apply(answer.state);
        this.question.set('');
        this.busy.set(false);
      },
      error: (error: Error) => {
        this.model.fail(error.message);
        this.busy.set(false);
      },
    });
  }

  score(passed: boolean): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.api.scoreLanguageTestAnswer(passed).subscribe({
      next: (answer) => {
        this.model.apply(answer.state);
        this.busy.set(false);
      },
      error: (error: Error) => {
        this.model.fail(error.message);
        this.busy.set(false);
      },
    });
  }

  finish(passed: boolean): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.api.finishLanguageTest(passed).subscribe({
      next: (finished: LanguageTestFinishResult) => {
        this.model.apply(finished.state);
        this.result.set(finished.result);
        this.busy.set(false);
        if (finished.result.passed && finished.state.current_stage_id !== 'complete') {
          // Passing opens the next grade, so the form and the grade cards
          // follow the learner there instead of staying on the passed one.
          this.lessons.followTestStage(finished.state.current_stage_id);
        }
        this.ui.info(this.resultMessage(finished.result));
      },
      error: (error: Error) => {
        this.model.fail(error.message);
        this.busy.set(false);
      },
    });
  }

  /** The kind of test, named the way the backend decides it. */
  kindLabel(kind: LanguageTestKind | undefined | null): string {
    if (kind === 'mock') return 'Mock test';
    if (kind === 'exam') return 'Final exam';
    return 'Trainer-led test';
  }

  /** How a finished test reads in the history list. */
  historyOutcome(result: LanguageTestResult): string {
    if (result.passed) return 'Passed';
    if (result.kind === 'mock') return 'Practice';
    return 'Not passed';
  }

  /** What the measured result means, worded for the test that produced it. */
  resultMessage(result: LanguageTestResult): string {
    const stage = this.model.stageTitle(result.stage);
    const score = `You scored ${result.answers_passed} of ${result.questions_asked} answers as passed.`;
    if (result.kind === 'mock') {
      return `${stage} mock test complete. ${score} A mock is practice and never moves the grade.`;
    }
    if (result.kind === 'exam') {
      const required = Math.round((result.required_pass_rate ?? 0.8) * 100);
      return result.passed
        ? `${stage} final exam passed. ${score} The required ${required}% was met and the next grade is now open.`
        : `${stage} final exam not passed. ${score} The final exam requires ${required}%. Teach or review the material, then take it again.`;
    }
    return result.passed
      ? `${stage} passed. ${score} The next grade is now open.`
      : `${stage} needs more learning. ${score} Teach or review the material, then take the grade test again.`;
  }
}
