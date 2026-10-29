import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AppIcon } from '../shared/app-icon';
import { TrainerMergeActions } from './trainer-merge.actions';
import { TrainerMergeCandidates } from './trainer-merge-candidates';
import { TrainerStore } from './trainer.store';

/** The canonical answer a merge is building, with its absorbable neighbours. */
@Component({
  selector: 'app-trainer-merge-target',
  standalone: true,
  imports: [AppIcon, TrainerMergeCandidates],
  templateUrl: './trainer-merge-target.html',
  styleUrls: [
    './styles/trainer-common.css',
    './styles/trainer-controls.css',
    './styles/trainer-merge.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainerMergeTarget {
  protected readonly store = inject(TrainerStore);
  protected readonly merge = inject(TrainerMergeActions);
}
