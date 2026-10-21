import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TrainerMergeActions } from './trainer-merge.actions';
import { TrainerMergeCandidates } from './trainer-merge-candidates';
import { TrainerStore } from './trainer.store';
import { TRAINER_STYLES } from './trainer-styles';

@Component({
  selector: 'app-trainer-merge-target',
  standalone: true,
  imports: [TrainerMergeCandidates],
  templateUrl: './trainer-merge-target.html',
  styleUrls: [...TRAINER_STYLES],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainerMergeTarget {
  protected readonly store = inject(TrainerStore);
  protected readonly merge = inject(TrainerMergeActions);
}
