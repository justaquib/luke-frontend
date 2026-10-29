import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AppIcon } from '../shared/app-icon';
import { TrainerDataService } from './trainer-data.service';
import { TrainerFaqActions } from './trainer-faq.actions';
import { TrainerStore } from './trainer.store';
import type { TrainerTab } from './trainer.types';

/** The tool strip of the training room. */
@Component({
  selector: 'app-trainer-tabs',
  standalone: true,
  imports: [AppIcon],
  templateUrl: './trainer-tabs.html',
  styleUrl: './styles/trainer-tabs.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainerTabs {
  protected readonly store = inject(TrainerStore);
  private readonly data = inject(TrainerDataService);
  private readonly faqs = inject(TrainerFaqActions);

  protected select(tab: TrainerTab): void {
    if (tab === 'documents') {
      this.data.refreshDocuments();
    }
    this.store.setTab(tab);
    this.faqs.closeFaq();
  }
}
