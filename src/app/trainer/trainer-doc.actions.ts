import { Injectable, inject } from '@angular/core';
import { type Subscription } from 'rxjs';
import { DocumentsApiService } from '../core/api/documents-api.service';
import type { IngestJob } from '../core/api/api-models';
import { BrowserService } from '../core/browser.service';
import { UiService } from '../shared/ui.service';
import { TrainerDataService } from './trainer-data.service';
import { TrainerStore } from './trainer.store';

const TERMINAL = new Set(['done', 'duplicate', 'failed', 'cancelled']);
const RETRYABLE = new Set(['failed', 'cancelled']);

@Injectable({ providedIn: 'root' })
export class TrainerDocumentActions {
  private readonly api = inject(DocumentsApiService);
  private readonly ui = inject(UiService);
  private readonly store = inject(TrainerStore);
  private readonly data = inject(TrainerDataService);
  private readonly browser = inject(BrowserService);
  private stream: Subscription | null = null;
  private watched: number | null = null;

  uploadDocument(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    this.stopWatching();
    this.store.uploadJob.set(null);
    this.store.uploading.set(true);
    this.api.uploadFile(file).subscribe({
      next: (result) => {
        if (result.job_id === null) {
          this.store.uploading.set(false);
          this.ui.info(`${result.source} is already in the corpus.`);
          this.data.refreshDocuments();
          return;
        }
        this.watch(result.job_id);
      },
      error: (error: Error) => {
        this.store.uploading.set(false);
        this.ui.error(error.message);
      },
    });
    input.value = '';
  }

  /** Picks up a read that was still running when the tab was last left. */
  restoreUpload(): void {
    this.api.listIngestJobs().subscribe({
      next: (jobs) => {
        const newest = jobs[0];
        if (!newest || TERMINAL.has(newest.status)) {
          return;
        }
        this.store.uploadJob.set(newest);
        this.store.uploading.set(true);
        this.watch(newest.id);
      },
      error: () => undefined,
    });
  }

  cancelUpload(): void {
    const job = this.store.uploadJob();
    if (!job || TERMINAL.has(job.status)) {
      return;
    }
    this.api.cancelIngestJob(job.id).subscribe({
      next: (stopped) => {
        this.store.uploadJob.set(stopped);
        this.store.uploading.set(false);
      },
      error: (error: Error) => this.ui.error(error.message),
    });
  }

  retryUpload(): void {
    const job = this.store.uploadJob();
    if (!job || !RETRYABLE.has(job.status)) {
      return;
    }
    this.api.retryIngestJob(job.id).subscribe({
      next: (queued) => {
        this.store.uploadJob.set(queued);
        this.store.uploading.set(true);
        this.watch(queued.id);
      },
      error: (error: Error) => this.ui.error(error.message),
    });
  }

  dismissUpload(): void {
    this.stopWatching();
    this.store.uploadJob.set(null);
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

  private watch(jobId: number): void {
    this.stopWatching();
    this.watched = jobId;
    this.stream = this.api.watchIngestJob(jobId).subscribe({
      next: (job) => {
        if (this.watched === job.id) {
          this.store.uploadJob.set(job);
        }
      },
      error: (error: Error) => {
        if (this.watched !== jobId) {
          return;
        }
        this.store.uploading.set(false);
        this.ui.error(error.message);
      },
      complete: () => {
        if (this.watched === jobId) {
          this.finished();
        }
      },
    });
  }

  private stopWatching(): void {
    this.watched = null;
    this.stream?.unsubscribe();
    this.stream = null;
  }

  private finished(): void {
    this.store.uploading.set(false);
    const job = this.store.uploadJob();
    if (!job) {
      return;
    }
    if (job.status === 'done') {
      this.ui.success(this.storedMessage(job));
      this.data.refreshDocuments();
      return;
    }
    if (job.status === 'failed') {
      this.ui.error(job.error ?? 'The file could not be indexed.');
      return;
    }
    if (job.status === 'cancelled') {
      this.ui.info(`Stopped indexing ${job.source}.`);
      return;
    }
    if (job.status === 'duplicate') {
      this.ui.info(`${job.source} is already in the corpus.`);
    }
  }

  private storedMessage(job: IngestJob): string {
    const skipped = job.duplicates.exact + job.duplicates.near;
    if (job.chunks === 0 && skipped > 0) {
      return `No new passages in ${job.source}; all ${skipped} were already in the corpus.`;
    }
    const duplicates = skipped > 0 ? ` and skipped ${skipped} duplicates` : '';
    return `Indexed ${job.source}: ${job.chunks} passages${duplicates}.`;
  }
}
