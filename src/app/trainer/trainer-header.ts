import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TrainerDataService } from './trainer-data.service';
import { TrainerStore } from './trainer.store';
import { TRAINER_STYLES } from './trainer-styles';
import { TrainerUiStore } from './trainer-ui.store';

@Component({
  selector: 'app-trainer-header',
  standalone: true,
  templateUrl: './trainer-header.html',
  styleUrls: [...TRAINER_STYLES],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainerHeader {
  protected readonly store = inject(TrainerStore);
  private readonly ui = inject(TrainerUiStore);
  private readonly data = inject(TrainerDataService);

  protected readonly sidebarOpen = this.ui.sidebarOpen;

  toggleSidebar(): void {
    this.ui.toggleSidebar();
  }

  refresh(): void {
    this.data.refresh();
  }
}
