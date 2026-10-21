import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TrainerMergeActions } from './trainer-merge.actions';
import { TrainerStore } from './trainer.store';
import { TRAINER_STYLES } from './trainer-styles';

@Component({
  selector: 'app-trainer-merge-groups',
  standalone: true,
  templateUrl: './trainer-merge-groups.html',
  styleUrls: [...TRAINER_STYLES],
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
