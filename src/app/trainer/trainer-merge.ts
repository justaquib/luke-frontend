import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TrainerMergeGroups } from './trainer-merge-groups';
import { TrainerMergeSearch } from './trainer-merge-search';
import { TrainerMergeTarget } from './trainer-merge-target';

/** The merge tab: search for an intent, refine it, browse existing groups. */
@Component({
  selector: 'app-trainer-merge',
  standalone: true,
  imports: [TrainerMergeSearch, TrainerMergeTarget, TrainerMergeGroups],
  templateUrl: './trainer-merge.html',
  styleUrls: ['./styles/trainer-common.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainerMerge {}
