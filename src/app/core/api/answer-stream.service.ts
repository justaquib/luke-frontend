import { Injectable } from '@angular/core';
import { Observable, type Subscriber } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { SseParser, type SseMessage } from './sse-parser';
import type {
  AnswerReading,
  AnswerStreamEvent,
  AnswerThinking,
  CoachingTurn,
  LanguagePreview,
  QueryResponse,
  SourceConnection,
} from './api-models';
import { queryBody, type QueryOptions } from './chat-api.service';

const SAFE_FAILURE = 'The answer stopped before it was finished. Please ask again.';

/**
 * The stage-by-stage answer streams. They read the raw SSE body with fetch
 * because the app's HttpClient has no progress events, and yield one typed
 * event per backend stage so a page can show only what really happened.
 */
@Injectable({ providedIn: 'root' })
export class AnswerStreamService extends BaseApiService {
  streamQuery(
    question: string,
    nResults = 4,
    options?: QueryOptions,
    signal?: AbortSignal,
  ): Observable<AnswerStreamEvent<QueryResponse>> {
    return this.stream<QueryResponse>(
      '/query/stream',
      queryBody(question, nResults, options),
      signal,
    );
  }

  streamPreview(
    question: string,
    skipTrainer: boolean,
    signal?: AbortSignal,
  ): Observable<AnswerStreamEvent<LanguagePreview>> {
    return this.stream<LanguagePreview>(
      '/language-model/preview/stream',
      { question, skip_trainer: skipTrainer },
      signal,
    );
  }

  streamCoachingTurn(
    sessionId: string,
    message: string,
    signal?: AbortSignal,
  ): Observable<AnswerStreamEvent<CoachingTurn>> {
    return this.stream<CoachingTurn>(
      `/parenting/chat/session/${encodeURIComponent(sessionId)}/turn/stream`,
      { message },
      signal,
    );
  }

  private stream<T>(
    path: string,
    body: unknown,
    signal?: AbortSignal,
  ): Observable<AnswerStreamEvent<T>> {
    return new Observable<AnswerStreamEvent<T>>(this.setup<T>(path, body, signal));
  }

  /** Opens the request and hands back the teardown that stops it. */
  private setup<T>(
    path: string,
    body: unknown,
    signal: AbortSignal | undefined,
  ): (subscriber: Subscriber<AnswerStreamEvent<T>>) => () => void {
    return (subscriber: Subscriber<AnswerStreamEvent<T>>): (() => void) => {
      const controller = new AbortController();
      const abort = (): void => controller.abort();
      if (signal?.aborted) {
        subscriber.complete();
        return () => undefined;
      }
      signal?.addEventListener('abort', abort, { once: true });
      void this.read(path, body, controller, subscriber);
      return () => {
        signal?.removeEventListener('abort', abort);
        controller.abort();
      };
    };
  }

  private async read<T>(
    path: string,
    body: unknown,
    controller: AbortController,
    subscriber: Subscriber<AnswerStreamEvent<T>>,
  ): Promise<void> {
    try {
      const response = await fetch(`${this.base}${path}`, {
        method: 'POST',
        headers: {
          ...this.authHeaders(),
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!response.ok) {
        subscriber.error(new Error(await this.failureDetail(response)));
        return;
      }
      if (!response.body) {
        subscriber.error(new Error(SAFE_FAILURE));
        return;
      }
      const sawDone = await this.readFrames(response.body, subscriber);
      if (!subscriber.closed) {
        if (sawDone) {
          subscriber.complete();
        } else {
          subscriber.error(new Error(SAFE_FAILURE));
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

  /** Reads every frame; true only when the backend sent its closing `done`. */
  private async readFrames<T>(
    body: ReadableStream<Uint8Array>,
    subscriber: Subscriber<AnswerStreamEvent<T>>,
  ): Promise<boolean> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    const parser = new SseParser();
    let sawDone = false;
    while (!subscriber.closed) {
      const { done, value } = await reader.read();
      if (done) break;
      const outcome = this.emitAll(
        parser.push(decoder.decode(value, { stream: true })),
        subscriber,
      );
      if (outcome !== 'continue') {
        sawDone = outcome === 'done';
        break;
      }
    }
    if (!subscriber.closed) {
      sawDone = this.emitAll(parser.flush(), subscriber) === 'done' || sawDone;
      await reader.cancel().catch(() => undefined);
    }
    return sawDone;
  }

  /** Emits each frame; the outcome says whether the stream is finished. */
  private emitAll<T>(
    messages: SseMessage[],
    subscriber: Subscriber<AnswerStreamEvent<T>>,
  ): 'continue' | 'done' | 'error' {
    for (const message of messages) {
      if (subscriber.closed) return 'error';
      if (message.event === 'done') {
        subscriber.complete();
        return 'done';
      }
      const event = this.eventOf<T>(message);
      if (!event) continue;
      subscriber.next(event);
      if (event.type === 'error') {
        subscriber.complete();
        return 'error';
      }
    }
    return 'continue';
  }

  private eventOf<T>(message: SseMessage): AnswerStreamEvent<T> | null {
    const data = this.frameData(message);
    switch (message.event) {
      case 'reading':
        return { type: 'reading', reading: data as AnswerReading };
      case 'thinking':
        return { type: 'thinking', thinking: data as AnswerThinking };
      case 'connecting':
        return { type: 'connecting', connection: data as SourceConnection };
      case 'writing':
        return { type: 'writing', model: this.textOf(data, 'model') };
      case 'token':
        return { type: 'token', text: this.textOf(data, 'text') };
      case 'answer':
        return { type: 'answer', answer: data as T };
      case 'error':
        return { type: 'error', message: this.textOf(data, 'message') || SAFE_FAILURE };
      default:
        return null;
    }
  }

  private textOf(data: unknown, key: string): string {
    const value = (data as Record<string, unknown>)[key];
    return typeof value === 'string' ? value : '';
  }
}
