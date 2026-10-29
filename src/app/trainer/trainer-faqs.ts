import { ChangeDetectionStrategy, Component, inject, viewChild } from '@angular/core';
import type { FaqItem } from '../core/api/api-models';
import { AppIcon } from '../shared/app-icon';
import { TrainerFaqActions } from './trainer-faq.actions';
import { TrainerFaqDetails } from './trainer-faq-details';
import { TrainerFaqDuplicates } from './trainer-faq-duplicates';
import { TrainerStore } from './trainer.store';

/** The trained-answer list with its status filters and duplicate groups. */
@Component({
  selector: 'app-trainer-faqs',
  standalone: true,
  imports: [AppIcon, TrainerFaqDuplicates, TrainerFaqDetails],
  templateUrl: './trainer-faqs.html',
  styleUrls: [
    './styles/trainer-common.css',
    './styles/trainer-controls.css',
    './styles/trainer-faqs.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainerFaqs {
  protected readonly store = inject(TrainerStore);
  protected readonly actions = inject(TrainerFaqActions);
  private readonly details = viewChild.required(TrainerFaqDetails);

  protected open(faq: FaqItem): void {
    this.actions.openFaq(faq, this.details().template());
  }
}
