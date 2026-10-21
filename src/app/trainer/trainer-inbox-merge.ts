import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import type { PendingItem } from '../core/api/api-models';
import { TrainerInboxActions } from './trainer-inbox.actions';
import { TrainerStore } from './trainer.store';
import { TRAINER_STYLES } from './trainer-styles';

@Component({
  selector: 'app-trainer-inbox-merge',
  standalone: true,
  templateUrl: './trainer-inbox-merge.html',
  styleUrls: [...TRAINER_STYLES],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainerInboxMerge {
  protected readonly store = inject(TrainerStore);
  protected readonly actions = inject(TrainerInboxActions);
  readonly pending = input.required<PendingItem>();
}
