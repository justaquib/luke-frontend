import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppCardInfo } from '../shared/app-card-info';
import { AppIcon } from '../shared/app-icon';
import { LearnerLessonsStore } from './learner-lessons.store';
import { LearnerPracticeStore } from './learner-practice.store';

/** Look a word up in the offline dictionary and teach one meaning. */
@Component({
  selector: 'app-learner-dictionary-card',
  standalone: true,
  imports: [FormsModule, AppCardInfo, AppIcon],
  templateUrl: './learner-dictionary-card.html',
  styleUrls: [
    './learner.css',
    './learner-knowledge.css',
    './learner-forms.css',
    '../shared/controls.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LearnerDictionaryCard {
  protected readonly practice = inject(LearnerPracticeStore);
  protected readonly lessons = inject(LearnerLessonsStore);
}
