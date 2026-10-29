import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AppIcon } from '../shared/app-icon';
import { LearnerDictionaryCard } from './learner-dictionary-card';
import { LearnerGradeBrowser } from './learner-grade-browser';
import { LearnerLearnedCard } from './learner-learned-card';
import { LearnerModelStore } from './learner-model.store';
import { LearnerSearchCard } from './learner-search-card';
import { LearnerViewStore } from './learner-view.store';

/** The three ways to review what the learner holds. */
@Component({
  selector: 'app-learner-knowledge-panel',
  standalone: true,
  imports: [
    DecimalPipe,
    AppIcon,
    LearnerSearchCard,
    LearnerDictionaryCard,
    LearnerGradeBrowser,
    LearnerLearnedCard,
  ],
  templateUrl: './learner-knowledge-panel.html',
  styleUrls: [
    './learner.css',
    './learner-navigation.css',
    './learner-knowledge.css',
    '../shared/controls.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LearnerKnowledgePanel {
  protected readonly model = inject(LearnerModelStore);
  protected readonly view = inject(LearnerViewStore);
}
