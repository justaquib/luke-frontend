import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppCardInfo } from '../shared/app-card-info';
import { AppIcon } from '../shared/app-icon';
import { LearnerKnowledgeStore } from './learner-knowledge.store';
import { LearnerLessonRow } from './learner-lesson-row';
import { LearnerModelStore } from './learner-model.store';

/** Review the built-in and taught questions of one grade and topic. */
@Component({
  selector: 'app-learner-grade-browser',
  standalone: true,
  imports: [FormsModule, AppCardInfo, AppIcon, LearnerLessonRow],
  templateUrl: './learner-grade-browser.html',
  styleUrls: [
    './learner.css',
    './learner-lessons.css',
    './learner-forms.css',
    './learner-knowledge.css',
    '../shared/controls.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LearnerGradeBrowser {
  protected readonly model = inject(LearnerModelStore);
  protected readonly knowledge = inject(LearnerKnowledgeStore);
}
