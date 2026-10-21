import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { TrainerFaqActions } from './trainer-faq.actions';
import { TrainerFaqCard } from './trainer-faq-card';
import { TrainerFaqDuplicates } from './trainer-faq-duplicates';
import { TrainerStore } from './trainer.store';
import { TRAINER_STYLES } from './trainer-styles';
import type { StatusFilter } from './trainer.types';

@Component({
  selector: 'app-trainer-faqs',
  standalone: true,
  imports: [TitleCasePipe, TrainerFaqCard, TrainerFaqDuplicates],
  templateUrl: './trainer-faqs.html',
  styleUrls: [...TRAINER_STYLES],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainerFaqs {
  protected readonly store = inject(TrainerStore);
  protected readonly actions = inject(TrainerFaqActions);

  protected readonly filters: StatusFilter[] = [
    'all',
    'pending',
    'approved',
    'declined',
    'duplicate',
  ];
}
