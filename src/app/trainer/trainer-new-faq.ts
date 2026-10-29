import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AppIcon } from '../shared/app-icon';
import { TrainerNewFaqActions } from './trainer-new-faq.actions';
import { TrainerStore } from './trainer.store';

/** A brand-new question and answer, checked against similar intents first. */
@Component({
  selector: 'app-trainer-new-faq',
  standalone: true,
  imports: [AppIcon],
  templateUrl: './trainer-new-faq.html',
  styleUrls: [
    './styles/trainer-common.css',
    './styles/trainer-controls.css',
    './styles/trainer-merge.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainerNewFaq {
  protected readonly store = inject(TrainerStore);
  protected readonly actions = inject(TrainerNewFaqActions);

  protected openInbox(): void {
    this.store.setTab('inbox');
  }
}
