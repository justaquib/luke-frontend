import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppIcon } from '../shared/app-icon';
import { LearnerDuplicatesStore } from './learner-duplicates.store';
import { LearnerModelStore } from './learner-model.store';
import { LearnerSearchStore, type LearnerSearchResult } from './learner-search.store';

/** One found question, with its confidence and its edit controls. */
@Component({
  selector: 'app-learner-search-row',
  standalone: true,
  imports: [DecimalPipe, FormsModule, AppIcon],
  templateUrl: './learner-search-row.html',
  styleUrls: [
    './learner-search.css',
    './learner-forms.css',
    './learner-knowledge.css',
    '../shared/controls.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LearnerSearchRow {
  readonly result = input.required<LearnerSearchResult>();

  protected readonly search = inject(LearnerSearchStore);
  protected readonly duplicates = inject(LearnerDuplicatesStore);
  protected readonly model = inject(LearnerModelStore);

  protected onConfidenceInput(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    if (target) this.search.setEditConfidence(Number(target.value) / 100);
  }
}
