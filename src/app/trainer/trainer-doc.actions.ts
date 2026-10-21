import { Injectable, inject } from '@angular/core';
import { DocumentsApiService } from '../core/api/documents-api.service';
import { BrowserService } from '../core/browser.service';
import { UiService } from '../shared/ui.service';
import { TrainerDataService } from './trainer-data.service';
import { TrainerStore } from './trainer.store';

@Injectable({ providedIn: 'root' })
export class TrainerDocumentActions {
  private readonly api = inject(DocumentsApiService);
  private readonly ui = inject(UiService);
  private readonly store = inject(TrainerStore);
  private readonly data = inject(TrainerDataService);
  private readonly browser = inject(BrowserService);

  uploadDocument(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    this.store.uploading.set(true);
    this.api.uploadFile(file).subscribe({
      next: (result) => {
        this.store.uploading.set(false);
        this.ui.success(`Uploaded ${result.source} with ${result.chunks} chunks.`);
        this.data.refreshDocuments();
      },
      error: (error: Error) => {
        this.store.uploading.set(false);
        this.ui.error(error.message);
      },
    });
    input.value = '';
  }

  refreshDocuments(): void {
    this.data.refreshDocuments();
  }

  deleteDocument(source: string): void {
    this.store.deletingSource.set(source);
    this.api.deleteDocument(source).subscribe({
      next: () => {
        this.ui.success(`Removed ${source}.`);
        this.data.refreshDocuments();
        this.store.deletingSource.set(null);
      },
      error: (error: Error) => {
        this.ui.error(error.message);
        this.store.deletingSource.set(null);
      },
    });
  }

  viewDocument(source: string): void {
    this.store.viewingSource.set(source);
    this.store.viewerUrl.set(null);
    this.api.viewDocument(source).subscribe({
      next: (blob) => {
        this.store.viewerUrl.set(this.browser.createObjectUrl(blob));
      },
      error: (error: Error) => {
        this.ui.error(error.message);
        this.store.viewingSource.set(null);
      },
    });
  }

  downloadDocument(source: string): void {
    this.api.downloadDocument(source).subscribe({
      next: (blob) => this.browser.downloadBlob(blob, source),
      error: (error: Error) => this.ui.error(error.message),
    });
  }

  closeViewer(): void {
    const url = this.store.viewerUrl();
    if (url) {
      this.browser.revokeObjectUrl(url);
    }
    this.store.viewerUrl.set(null);
    this.store.viewingSource.set(null);
  }

  onViewerBackdrop(event: Event): void {
    if (event.target !== event.currentTarget) {
      return;
    }
    this.closeViewer();
  }
}
