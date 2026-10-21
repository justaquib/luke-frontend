import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { FaqSuggestion } from '../core/api/api-models';
import { TrainerMergeActions } from './trainer-merge.actions';
import { TrainerNewFaqActions } from './trainer-new-faq.actions';
import { TrainerStore } from './trainer.store';
import { TRAINER_STYLES } from './trainer-styles';

@Component({
  selector: 'app-trainer-new-faq',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './trainer-new-faq.html',
  styleUrls: [...TRAINER_STYLES],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainerNewFaq {
  protected readonly store = inject(TrainerStore);
  protected readonly actions = inject(TrainerNewFaqActions);
  protected readonly merge = inject(TrainerMergeActions);

  protected openInbox(): void {
    this.store.setTab('inbox');
  }

  protected canMerge(faq: FaqSuggestion): boolean {
    return !!this.store.faqById(faq.faq_id);
  }
}
