import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AppIcon } from '../shared/app-icon';
import { TrainerMergeActions } from './trainer-merge.actions';
import { TrainerStore } from './trainer.store';

/** The intents the corpus already shares one answer across. */
@Component({
  selector: 'app-trainer-merge-groups',
  standalone: true,
  imports: [AppIcon],
  templateUrl: './trainer-merge-groups.html',
  styleUrls: [
    './styles/trainer-common.css',
    './styles/trainer-controls.css',
    './styles/trainer-merge.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainerMergeGroups {
  protected readonly store = inject(TrainerStore);
  private readonly merge = inject(TrainerMergeActions);

  protected refine(canonicalId: number): void {
    const faq = this.store.faqById(canonicalId);
    if (faq) {
      this.merge.pickFaqMergeTarget(faq);
    }
  }
}
