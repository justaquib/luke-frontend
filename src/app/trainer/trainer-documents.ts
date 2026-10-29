import { ChangeDetectionStrategy, Component, type OnInit, inject } from '@angular/core';
import { AppIcon } from '../shared/app-icon';
import type { IconName } from '../shared/app-icon-shapes';
import { SafeUrlPipe } from '../shared/safe-url.pipe';
import type { IngestJob } from '../core/api/api-models';
import { TrainerDocumentActions } from './trainer-doc.actions';
import { TrainerStore } from './trainer.store';

const ACTIVE = new Set(['queued', 'running']);

/** The uploaded documents, the running read and their viewer. */
@Component({
  selector: 'app-trainer-documents',
  standalone: true,
  imports: [AppIcon, SafeUrlPipe],
  templateUrl: './trainer-documents.html',
  styleUrls: [
    './styles/trainer-common.css',
    './styles/trainer-controls.css',
    './styles/trainer-documents.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainerDocuments implements OnInit {
  protected readonly store = inject(TrainerStore);
  protected readonly actions = inject(TrainerDocumentActions);

  ngOnInit(): void {
    this.actions.restoreUpload();
  }

  protected downloadViewing(): void {
    const source = this.store.viewingSource();
    if (source) {
      this.actions.downloadDocument(source);
    }
  }

  protected uploadMeta(): string {
    const job = this.store.uploadJob();
    if (job && ACTIVE.has(job.status)) {
      return this.stepLine(job);
    }
    return this.store.uploading() ? 'Waiting to start' : 'csv, xlsx, docx, doc, pdf, txt';
  }

  protected jobLine(job: IngestJob): string {
    if (ACTIVE.has(job.status)) {
      return this.stepLine(job);
    }
    if (job.status === 'done') {
      const skipped = job.duplicates.exact + job.duplicates.near;
      return skipped > 0
        ? `${job.chunks} passages stored, ${skipped} skipped`
        : `${job.chunks} passages stored`;
    }
    if (job.status === 'failed') {
      return job.error ?? 'The file could not be indexed.';
    }
    if (job.status === 'cancelled') {
      return 'Stopped before it finished.';
    }
    return 'Already in the corpus.';
  }

  protected percent(job: IngestJob): number {
    return Math.round(job.progress * 100);
  }

  protected jobIcon(job: IngestJob): IconName {
    if (ACTIVE.has(job.status)) return 'upload';
    if (job.status === 'done') return 'check';
    if (job.status === 'failed') return 'alert';
    if (job.status === 'cancelled') return 'stop';
    return 'copy';
  }

  private stepLine(job: IngestJob): string {
    return job.total > 0 ? `${job.step} · ${job.done}/${job.total} passages` : job.step;
  }
}
