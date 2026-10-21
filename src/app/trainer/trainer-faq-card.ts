import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import type { FaqItem } from '../core/api/api-models';
import { TrainerFaqActions } from './trainer-faq.actions';
import { TrainerMergeActions } from './trainer-merge.actions';
import { TrainerStore } from './trainer.store';
import { TRAINER_STYLES } from './trainer-styles';

@Component({
  selector: 'app-trainer-faq-card',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './trainer-faq-card.html',
  styleUrls: [...TRAINER_STYLES],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainerFaqCard {
  protected readonly store = inject(TrainerStore);
  protected readonly actions = inject(TrainerFaqActions);
  private readonly merge = inject(TrainerMergeActions);
  readonly faq = input.required<FaqItem>();

  protected openMerge(): void {
    this.store.setTab('merge');
    this.merge.pickFaqMergeTarget(this.faq());
  }
}
