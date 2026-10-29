import { Injectable } from '@angular/core';
import { catchError, Observable, type Subscriber } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { readFrames } from './sse-stream';
import type { SseMessage } from './sse-parser';
import type { DocumentItem, IngestJob, IngestResponse, UploadAccepted } from './api-models';

const TERMINAL = new Set(['done', 'duplicate', 'failed', 'cancelled']);
const STREAM_FAILURE = 'The upload stopped before it was finished. Please try again.';

@Injectable({ providedIn: 'root' })
export class DocumentsApiService extends BaseApiService {
  ingest(source: string, text: string): Observable<IngestResponse> {
    return this.http
      .post<IngestResponse>(
        `${this.base}/ingest`,
        { source, text },
        { headers: this.authHeaders() },
      )
      .pipe(catchError((err) => this.handleError(err)));
  }

  uploadFile(file: File): Observable<UploadAccepted> {
    const form = new FormData();
    form.append('file', file, file.name);
    return this.http
      .post<UploadAccepted>(`${this.base}/upload`, form, { headers: this.authHeaders() })
      .pipe(catchError((err) => this.handleError(err)));
  }

  listIngestJobs(): Observable<IngestJob[]> {
    return this.http
      .get<IngestJob[]>(`${this.base}/ingest/jobs`, { headers: this.authHeaders() })
      .pipe(catchError((err) => this.handleError(err)));
  }

  ingestJob(jobId: number): Observable<IngestJob> {
    return this.http
      .get<IngestJob>(`${this.base}/ingest/jobs/${jobId}`, { headers: this.authHeaders() })
      .pipe(catchError((err) => this.handleError(err)));
  }

  cancelIngestJob(jobId: number): Observable<IngestJob> {
    return this.http
      .post<IngestJob>(
        `${this.base}/ingest/jobs/${jobId}/cancel`,
        {},
        { headers: this.authHeaders() },
      )
      .pipe(catchError((err) => this.handleError(err)));
  }

  retryIngestJob(jobId: number): Observable<IngestJob> {
    return this.http
      .post<IngestJob>(
        `${this.base}/ingest/jobs/${jobId}/retry`,
        {},
        { headers: this.authHeaders() },
      )
      .pipe(catchError((err) => this.handleError(err)));
  }

  /** Follows one job over server-sent events until it reaches a terminal state. */
  watchIngestJob(jobId: number): Observable<IngestJob> {
    return new Observable<IngestJob>((subscriber) => {
      const controller = new AbortController();
      void this.readJob(jobId, controller, subscriber);
      return () => controller.abort();
    });
  }

  listDocuments(): Observable<DocumentItem[]> {
    return this.http
      .get<DocumentItem[]>(`${this.base}/documents`, {
        headers: this.authHeaders(),
      })
      .pipe(catchError((err) => this.handleError(err)));
  }

  deleteDocument(source: string): Observable<{
    source: string;
    deleted_chunks: number;
    status: string;
  }> {
    return this.http
      .delete<{ source: string; deleted_chunks: number; status: string }>(
        `${this.base}/documents/${encodeURIComponent(source)}`,
        { headers: this.authHeaders() },
      )
      .pipe(catchError((err) => this.handleError(err)));
  }

  viewDocument(source: string): Observable<Blob> {
    return this.http
      .get(`${this.base}/documents/${encodeURIComponent(source)}/view`, {
        responseType: 'blob',
        headers: this.authHeaders(),
      })
      .pipe(catchError((err) => this.handleError(err)));
  }

  downloadDocument(source: string): Observable<Blob> {
    return this.http
      .get(`${this.base}/documents/${encodeURIComponent(source)}/download`, {
        responseType: 'blob',
        headers: this.authHeaders(),
      })
      .pipe(catchError((err) => this.handleError(err)));
  }

  private async readJob(
    jobId: number,
    controller: AbortController,
    subscriber: Subscriber<IngestJob>,
  ): Promise<void> {
    try {
      const response = await fetch(`${this.base}/ingest/jobs/${jobId}/events`, {
        headers: { ...this.authHeaders(), Accept: 'text/event-stream' },
        signal: controller.signal,
      });
      if (!response.ok) {
        subscriber.error(new Error(await this.failureDetail(response)));
        return;
      }
      if (!response.body) {
        subscriber.error(new Error(STREAM_FAILURE));
        return;
      }
      const finished = await this.readJobFrames(response.body, subscriber);
      if (!subscriber.closed) {
        if (finished) {
          subscriber.complete();
        } else {
          subscriber.error(new Error(STREAM_FAILURE));
        }
      }
    } catch (error) {
      if (controller.signal.aborted) {
        subscriber.complete();
        return;
      }
      subscriber.error(new Error(this.errorMessage(error)));
    }
  }

  /** Reads every frame; true only when the job reached its terminal state. */
  private async readJobFrames(
    body: ReadableStream<Uint8Array>,
    subscriber: Subscriber<IngestJob>,
  ): Promise<boolean> {
    return readFrames(body, (message) => this.deliverJob(message, subscriber));
  }

  /** Emits one job frame; true when the job is finished or the stream failed. */
  private deliverJob(message: SseMessage, subscriber: Subscriber<IngestJob>): boolean {
    if (message.event === 'error') {
      subscriber.error(
        new Error(this.textOf(this.frameData(message), 'message') || STREAM_FAILURE),
      );
      return true;
    }
    if (message.event !== 'job') {
      return false;
    }
    const job = this.frameData(message) as IngestJob;
    subscriber.next(job);
    return TERMINAL.has(job.status);
  }

  private textOf(data: unknown, key: string): string {
    const value = (data as Record<string, unknown>)[key];
    return typeof value === 'string' ? value : '';
  }
}
