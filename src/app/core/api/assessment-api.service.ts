import { Injectable } from '@angular/core';
import { catchError, Observable, type Subscriber } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { readFrames } from './sse-stream';
import type { SseMessage } from './sse-parser';
import type { AssessmentMode } from '../../shared/assessment-labels';
import type {
  AssessmentProfiles,
  AssessmentResult,
  AssessmentRun,
  AssessmentStarted,
} from './assessment.types';

const TERMINAL = new Set(['done', 'failed', 'cancelled']);
const STREAM_FAILURE = 'The run stopped before it was finished. Please try again.';

/** Runs, the eight skill cards and the trainer's rubric review. */
@Injectable({ providedIn: 'root' })
export class AssessmentApiService extends BaseApiService {
  profiles(mode: AssessmentMode, runId?: number): Observable<AssessmentProfiles> {
    const query = runId === undefined ? `?mode=${mode}` : `?mode=${mode}&run_id=${runId}`;
    return this.http
      .get<AssessmentProfiles>(`${this.base}/assessment/profiles${query}`, {
        headers: this.authHeaders(),
      })
      .pipe(catchError((err) => this.handleError(err)));
  }

  runs(): Observable<AssessmentRun[]> {
    return this.http
      .get<AssessmentRun[]>(`${this.base}/assessment/runs`, { headers: this.authHeaders() })
      .pipe(catchError((err) => this.handleError(err)));
  }

  start(mode: AssessmentMode): Observable<AssessmentStarted> {
    return this.http
      .post<AssessmentStarted>(
        `${this.base}/assessment/runs`,
        { mode },
        { headers: this.authHeaders() },
      )
      .pipe(catchError((err) => this.handleError(err)));
  }

  cancel(runId: number): Observable<AssessmentRun> {
    return this.http
      .post<AssessmentRun>(
        `${this.base}/assessment/runs/${runId}/cancel`,
        {},
        { headers: this.authHeaders() },
      )
      .pipe(catchError((err) => this.handleError(err)));
  }

  results(runId: number): Observable<AssessmentResult[]> {
    return this.http
      .get<AssessmentResult[]>(`${this.base}/assessment/runs/${runId}/results`, {
        headers: this.authHeaders(),
      })
      .pipe(catchError((err) => this.handleError(err)));
  }

  review(resultId: number, score: number, note: string): Observable<AssessmentResult> {
    return this.http
      .post<AssessmentResult>(
        `${this.base}/assessment/results/${resultId}/review`,
        { score, note },
        { headers: this.authHeaders() },
      )
      .pipe(catchError((err) => this.handleError(err)));
  }

  /** Follows one run over server-sent events until it reaches a terminal state. */
  watch(runId: number): Observable<AssessmentRun> {
    return new Observable<AssessmentRun>((subscriber) => {
      const controller = new AbortController();
      void this.readRun(runId, controller, subscriber);
      return () => controller.abort();
    });
  }

  private async readRun(
    runId: number,
    controller: AbortController,
    subscriber: Subscriber<AssessmentRun>,
  ): Promise<void> {
    try {
      const response = await fetch(`${this.base}/assessment/runs/${runId}/events`, {
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
      const finished = await readFrames(response.body, (message) =>
        this.deliverRun(message, subscriber),
      );
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

  /** Emits one run frame; true when the run is finished or the stream failed. */
  private deliverRun(message: SseMessage, subscriber: Subscriber<AssessmentRun>): boolean {
    if (message.event === 'error') {
      const data = this.frameData(message) as { message?: unknown };
      subscriber.error(new Error(typeof data.message === 'string' ? data.message : STREAM_FAILURE));
      return true;
    }
    if (message.event !== 'run') {
      return false;
    }
    const run = this.frameData(message) as AssessmentRun;
    subscriber.next(run);
    return TERMINAL.has(run.status);
  }
}
