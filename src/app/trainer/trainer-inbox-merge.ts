import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import type { PendingItem } from '../core/api/api-models';
import { AppIcon } from '../shared/app-icon';
import { TrainerInboxActions } from './trainer-inbox.actions';
import { TrainerStore } from './trainer.store';

/** The pending row's merge panel: similar questions and one shared answer. */
@Component({
  selector: 'app-trainer-inbox-merge',
  standalone: true,
  imports: [AppIcon],
  templateUrl: './trainer-inbox-merge.html',
  styleUrls: [
    './styles/trainer-common.css',
    './styles/trainer-controls.css',
    './styles/trainer-inbox.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainerInboxMerge {
  protected readonly store = inject(TrainerStore);
  protected readonly actions = inject(TrainerInboxActions);
  readonly pending = input.required<PendingItem>();
}
