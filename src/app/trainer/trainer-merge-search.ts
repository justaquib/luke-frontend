import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import type { FaqSuggestion, PendingSuggestionItem } from '../core/api/api-models';
import { AppIcon } from '../shared/app-icon';
import { TrainerInboxActions } from './trainer-inbox.actions';
import { TrainerMergeActions } from './trainer-merge.actions';
import { TrainerStore } from './trainer.store';

/** Finds trained and pending questions that share an intent. */
@Component({
  selector: 'app-trainer-merge-search',
  standalone: true,
  imports: [AppIcon],
  templateUrl: './trainer-merge-search.html',
  styleUrls: [
    './styles/trainer-common.css',
    './styles/trainer-controls.css',
    './styles/trainer-merge.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainerMergeSearch {
  protected readonly store = inject(TrainerStore);
  protected readonly merge = inject(TrainerMergeActions);
  private readonly inbox = inject(TrainerInboxActions);

  protected openFaq(faq: FaqSuggestion): void {
    const target = this.store.faqById(faq.faq_id);
    if (target) {
      this.merge.pickFaqMergeTarget(target);
    }
  }

  protected openPending(pending: PendingSuggestionItem): void {
    this.store.setTab('inbox');
    const item = this.store.pendingById(pending.pending_id);
    if (item) {
      this.inbox.toggleMergeRow(item);
    }
  }
}
