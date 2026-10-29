import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LearnerModelStore } from './learner-model.store';
import { LearnerTrainerAnswerRow } from './learner-trainer-answer-row';

/** The Trainer-approved answers held by the learner, editable in place. */
@Component({
  selector: 'app-learner-trainer-answers',
  standalone: true,
  imports: [LearnerTrainerAnswerRow],
  templateUrl: './learner-trainer-answers.html',
  styleUrls: ['./learner.css', './learner-knowledge.css', '../shared/controls.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LearnerTrainerAnswers {
  protected readonly model = inject(LearnerModelStore);
}
