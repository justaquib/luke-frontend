import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import type { FaqItem } from '../core/api/api-models';
import { AppIcon } from '../shared/app-icon';
import { TrainerFaqActions } from './trainer-faq.actions';
import { TrainerMergeActions } from './trainer-merge.actions';
import { TrainerStore } from './trainer.store';

/** The decisions a trained answer offers in its detail panel. */
@Component({
  selector: 'app-trainer-faq-actions-bar',
  standalone: true,
  imports: [AppIcon],
  templateUrl: './trainer-faq-actions.html',
  styleUrls: [
    './styles/trainer-common.css',
    './styles/trainer-controls.css',
    './styles/trainer-details.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainerFaqActionsBar {
  protected readonly store = inject(TrainerStore);
  protected readonly actions = inject(TrainerFaqActions);
  private readonly merge = inject(TrainerMergeActions);
  readonly faq = input.required<FaqItem>();

  protected startEdit(): void {
    this.actions.startEdit(this.faq());
  }

  protected mergeFaq(): void {
    const faq = this.faq();
    this.actions.closeFaq();
    this.store.setTab('merge');
    this.merge.pickFaqMergeTarget(faq);
  }
}
