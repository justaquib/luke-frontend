import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AppCardInfo } from '../shared/app-card-info';
import { AppIcon } from '../shared/app-icon';
import { LearnerDuplicatesStore } from './learner-duplicates.store';
import { LearnerModelStore } from './learner-model.store';
import { LearnerTrainerAnswers } from './learner-trainer-answers';

/** Everything the learner holds right now, read from its saved state. */
@Component({
  selector: 'app-learner-learned-card',
  standalone: true,
  imports: [DecimalPipe, AppCardInfo, AppIcon, LearnerTrainerAnswers],
  templateUrl: './learner-learned-card.html',
  styleUrls: [
    './learner.css',
    './learner-knowledge.css',
    './learner-forms.css',
    '../shared/controls.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LearnerLearnedCard {
  protected readonly model = inject(LearnerModelStore);
  protected readonly duplicates = inject(LearnerDuplicatesStore);
}
