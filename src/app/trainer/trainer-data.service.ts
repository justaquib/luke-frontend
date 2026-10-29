import { Injectable, inject } from '@angular/core';
import { DocumentsApiService } from '../core/api/documents-api.service';
import { TrainerApiService } from '../core/api/trainer-api.service';
import { TrainerStore } from './trainer.store';

/** Loads the trainer's corpus and documents into the shared store. */
@Injectable({ providedIn: 'root' })
export class TrainerDataService {
  private readonly api = inject(TrainerApiService);
  private readonly documents = inject(DocumentsApiService);
  private readonly store = inject(TrainerStore);

  refresh(): void {
    this.store.corpusError.set(null);
    this.api.listInbox().subscribe({
      next: (rows) => this.store.inbox.set(rows),
      error: (error: Error) => this.store.corpusError.set(error.message),
    });
    this.api.listFaqs().subscribe({
      next: (rows) => {
        this.store.faqs.set(rows);
        const selected = this.store.selectedFaqId();
        if (selected !== null && !rows.some((faq) => faq.id === selected)) {
          this.store.selectedFaqId.set(null);
        }
      },
      error: (error: Error) => this.store.corpusError.set(error.message),
    });
  }

  refreshDocuments(): void {
    this.store.documentsError.set(null);
    this.documents.listDocuments().subscribe({
      next: (rows) => this.store.documents.set(rows),
      error: (error: Error) => this.store.documentsError.set(error.message),
    });
  }
}
