import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AppIcon } from '../shared/app-icon';
import { TrainerInboxActions } from './trainer-inbox.actions';
import { TrainerInboxMerge } from './trainer-inbox-merge';
import { TrainerStore } from './trainer.store';

/** Pending questions waiting for a trained answer. */
@Component({
  selector: 'app-trainer-inbox',
  standalone: true,
  imports: [AppIcon, TrainerInboxMerge],
  templateUrl: './trainer-inbox.html',
  styleUrls: [
    './styles/trainer-common.css',
    './styles/trainer-controls.css',
    './styles/trainer-inbox.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainerInbox {
  protected readonly store = inject(TrainerStore);
  protected readonly actions = inject(TrainerInboxActions);
}
