import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppCardInfo } from '../shared/app-card-info';
import { AppIcon } from '../shared/app-icon';
import { LearnerModelStore } from './learner-model.store';
import { LearnerTestsStore } from './learner-tests.store';

/** The grade test, its questions, scores and measured history. */
@Component({
  selector: 'app-learner-tests-panel',
  standalone: true,
  imports: [DecimalPipe, FormsModule, AppCardInfo, AppIcon],
  templateUrl: './learner-tests-panel.html',
  styleUrls: [
    './learner.css',
    './learner-tests.css',
    './learner-forms.css',
    './learner-knowledge.css',
    '../shared/controls.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LearnerTestsPanel {
  protected readonly model = inject(LearnerModelStore);
  protected readonly tests = inject(LearnerTestsStore);
}
