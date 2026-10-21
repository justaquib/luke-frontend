import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TrainerMergeGroups } from './trainer-merge-groups';
import { TrainerMergeSearch } from './trainer-merge-search';
import { TrainerMergeTarget } from './trainer-merge-target';
import { TRAINER_STYLES } from './trainer-styles';

@Component({
  selector: 'app-trainer-merge',
  standalone: true,
  imports: [TrainerMergeSearch, TrainerMergeTarget, TrainerMergeGroups],
  templateUrl: './trainer-merge.html',
  styleUrls: [...TRAINER_STYLES],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainerMerge {}
