import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import type { FaqItem, FaqMergePreview } from '../core/api/api-models';
import { TrainerMergeActions } from './trainer-merge.actions';
import { TrainerStore } from './trainer.store';
import { TRAINER_STYLES } from './trainer-styles';

@Component({
  selector: 'app-trainer-merge-candidates',
  standalone: true,
  templateUrl: './trainer-merge-candidates.html',
  styleUrls: [...TRAINER_STYLES],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainerMergeCandidates {
  protected readonly store = inject(TrainerStore);
  protected readonly merge = inject(TrainerMergeActions);
  readonly target = input.required<FaqItem>();
  readonly preview = input.required<FaqMergePreview>();
}
