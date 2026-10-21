import { Injectable, inject } from '@angular/core';
import { DocumentsApiService } from '../core/api/documents-api.service';
import { TrainerApiService } from '../core/api/trainer-api.service';
import { TrainerStore } from './trainer.store';

@Injectable({ providedIn: 'root' })
export class TrainerDataService {
  private readonly api = inject(TrainerApiService);
  private readonly documents = inject(DocumentsApiService);
  private readonly store = inject(TrainerStore);

  refresh(): void {
    this.api.listInbox(this.store.includeResolved()).subscribe({
      next: (rows) => this.store.inbox.set(rows),
      error: (error: Error) => this.store.error.set(error.message),
    });
    this.api.listFaqs().subscribe({
      next: (rows) => this.store.faqs.set(rows),
      error: (error: Error) => this.store.error.set(error.message),
    });
    this.api.stats().subscribe({
      next: (stats) => this.store.stats.set({ faqs: stats.faqs, pending: stats.pending }),
      error: () => {
        // Stats are optional; keep the last known values when the request fails.
      },
    });
  }

  refreshDocuments(): void {
    this.documents.listDocuments().subscribe({
      next: (rows) => this.store.documents.set(rows),
      error: () => this.store.documents.set([]),
    });
  }
}
