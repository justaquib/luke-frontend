import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AppIcon } from '../shared/app-icon';
import { TrainerFaqActions } from './trainer-faq.actions';
import { TrainerStore } from './trainer.store';

/** The collapsed list of questions that repeat word for word. */
@Component({
  selector: 'app-trainer-faq-duplicates',
  standalone: true,
  imports: [AppIcon],
  templateUrl: './trainer-faq-duplicates.html',
  styleUrls: [
    './styles/trainer-common.css',
    './styles/trainer-controls.css',
    './styles/trainer-duplicates.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainerFaqDuplicates {
  protected readonly store = inject(TrainerStore);
  protected readonly actions = inject(TrainerFaqActions);
}
