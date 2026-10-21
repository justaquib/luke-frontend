import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppPrefsService } from '../core/app-prefs.service';
import { TrainerDocumentActions } from './trainer-doc.actions';
import { TrainerStore } from './trainer.store';
import { TRAINER_STYLES } from './trainer-styles';
import { TrainerUiStore } from './trainer-ui.store';

@Component({
  selector: 'app-trainer-sidebar',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './trainer-sidebar.html',
  styleUrls: [...TRAINER_STYLES],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainerSidebar {
  protected readonly store = inject(TrainerStore);
  protected readonly prefs = inject(AppPrefsService);
  protected readonly documents = inject(TrainerDocumentActions);
  private readonly ui = inject(TrainerUiStore);

  protected readonly sidebarOpen = this.ui.sidebarOpen;

  toggle(): void {
    this.ui.toggleSidebar();
  }

  openDocuments(): void {
    this.store.setTab('documents');
    this.documents.refreshDocuments();
  }
}
