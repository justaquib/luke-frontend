import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TrainerInboxActions } from './trainer-inbox.actions';
import { TrainerInboxMerge } from './trainer-inbox-merge';
import { TrainerStore } from './trainer.store';
import { TRAINER_STYLES } from './trainer-styles';

@Component({
  selector: 'app-trainer-inbox',
  standalone: true,
  imports: [TrainerInboxMerge],
  templateUrl: './trainer-inbox.html',
  styleUrls: [...TRAINER_STYLES],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainerInbox {
  protected readonly store = inject(TrainerStore);
  protected readonly actions = inject(TrainerInboxActions);
}
