import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TrainerFaqActions } from './trainer-faq.actions';
import { TrainerStore } from './trainer.store';
import { TRAINER_STYLES } from './trainer-styles';

@Component({
  selector: 'app-trainer-faq-duplicates',
  standalone: true,
  templateUrl: './trainer-faq-duplicates.html',
  styleUrls: [...TRAINER_STYLES],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainerFaqDuplicates {
  protected readonly store = inject(TrainerStore);
  protected readonly actions = inject(TrainerFaqActions);
}
