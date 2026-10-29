import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import type { FaqItem, FaqMergePreview } from '../core/api/api-models';
import { AppIcon } from '../shared/app-icon';
import { TrainerMergeActions } from './trainer-merge.actions';
import { TrainerStore } from './trainer.store';

/** The FAQs one merge can absorb, the manually added ones and the search. */
@Component({
  selector: 'app-trainer-merge-candidates',
  standalone: true,
  imports: [AppIcon],
  templateUrl: './trainer-merge-candidates.html',
  styleUrls: [
    './styles/trainer-common.css',
    './styles/trainer-controls.css',
    './styles/trainer-merge.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainerMergeCandidates {
  protected readonly store = inject(TrainerStore);
  protected readonly merge = inject(TrainerMergeActions);
  readonly target = input.required<FaqItem>();
  readonly preview = input.required<FaqMergePreview>();
}
