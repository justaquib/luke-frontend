import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppCardInfo } from '../shared/app-card-info';
import { AppIcon } from '../shared/app-icon';
import { LearnerDuplicatesStore } from './learner-duplicates.store';
import { LearnerSearchRow } from './learner-search-row';
import { LearnerSearchStore } from './learner-search.store';

/** Search across every taught question and approved answer. */
@Component({
  selector: 'app-learner-search-card',
  standalone: true,
  imports: [FormsModule, AppCardInfo, AppIcon, LearnerSearchRow],
  templateUrl: './learner-search-card.html',
  styleUrls: [
    './learner.css',
    './learner-search.css',
    './learner-forms.css',
    './learner-knowledge.css',
    '../shared/controls.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LearnerSearchCard {
  protected readonly search = inject(LearnerSearchStore);
  protected readonly duplicates = inject(LearnerDuplicatesStore);
}
