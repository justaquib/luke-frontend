import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import type { LanguageStage } from '../core/api.service';
import { AppCardInfo } from '../shared/app-card-info';
import { AppIcon } from '../shared/app-icon';
import { LessonForm } from './lesson-form';
import { LearnerLessonsStore } from './learner-lessons.store';
import { LearnerModelStore } from './learner-model.store';

/** The grade ladder and the lesson form. */
@Component({
  selector: 'app-learner-lessons-panel',
  standalone: true,
  imports: [AppCardInfo, AppIcon, LessonForm],
  templateUrl: './learner-lessons-panel.html',
  styleUrls: [
    './learner.css',
    './learner-lessons.css',
    './learner-forms.css',
    '../shared/controls.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LearnerLessonsPanel {
  protected readonly model = inject(LearnerModelStore);
  protected readonly lessons = inject(LearnerLessonsStore);

  protected stageStatus(stage: LanguageStage): string {
    const status = stage.completed
      ? 'Passed'
      : stage.id === this.model.currentStageId()
        ? 'Current grade'
        : 'Locked';
    return `${status} · ${stage.pass_count} pass(es) · ${stage.attempt_count} test(s)`;
  }
}
