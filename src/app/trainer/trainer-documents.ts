import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TrainerDocumentActions } from './trainer-doc.actions';
import { TrainerStore } from './trainer.store';
import { TRAINER_STYLES } from './trainer-styles';

@Component({
  selector: 'app-trainer-documents',
  standalone: true,
  templateUrl: './trainer-documents.html',
  styleUrls: [...TRAINER_STYLES],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainerDocuments {
  protected readonly store = inject(TrainerStore);
  protected readonly actions = inject(TrainerDocumentActions);
}
