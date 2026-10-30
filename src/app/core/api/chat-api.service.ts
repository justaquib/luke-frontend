import { Injectable } from '@angular/core';
import { catchError, type Observable } from 'rxjs';
import { BaseApiService } from './base-api.service';
import type { QueryResponse } from './api-models';

export interface QueryOptions {
  apps?: { weather?: boolean; wiki?: boolean; web?: boolean };
  location?: { lat?: number; lon?: number };
  /** The model that answers: `luke` or an installed teacher's `hf:` id. */
  model?: string;
  /** The recent turns, so a follow-up keeps the conversation in view. */
  history?: { role: 'user' | 'assistant' | 'tool'; content: string }[];
  /** Whether the uploaded documents are read for this answer. */
  retrieval?: boolean;
  /** Whether Luke writes from numbered passages instead of returning one. */
  compose?: boolean;
}

export interface FeedbackRequest {
  message_id?: number;
  question: string;
  answer: string;
  source: string;
  rating: 'like' | 'dislike';
}

/** The request body both the plain and the streaming query send. */
export function queryBody(
  question: string,
  nResults: number,
  options?: QueryOptions,
): Record<string, unknown> {
  const body: Record<string, unknown> = { question, n_results: nResults };
  return options ? { ...body, ...optionBody(options) } : body;
}

function optionBody(options: QueryOptions): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (options.apps) body['apps'] = options.apps;
  if (options.location) body['location'] = options.location;
  if (options.model) body['model'] = options.model;
  if (options.history && options.history.length) body['history'] = options.history;
  if (options.retrieval !== undefined) body['retrieval'] = options.retrieval;
  if (options.compose !== undefined) body['compose'] = options.compose;
  return body;
}

@Injectable({ providedIn: 'root' })
export class ChatApiService extends BaseApiService {
  health(): Observable<{ status: string }> {
    return this.http
      .get<{ status: string }>(`${this.base}/health`)
      .pipe(catchError((err) => this.handleError(err)));
  }

  query(question: string, nResults = 4, opts?: QueryOptions): Observable<QueryResponse> {
    return this.http
      .post<QueryResponse>(`${this.base}/query`, queryBody(question, nResults, opts), {
        headers: this.authHeaders(),
      })
      .pipe(catchError((err) => this.handleError(err)));
  }

  sendFeedback(req: FeedbackRequest): Observable<{ id: number; rating: string }> {
    return this.http
      .post<{ id: number; rating: string }>(`${this.base}/feedback`, req, {
        headers: this.authHeaders(),
      })
      .pipe(catchError((err) => this.handleError(err)));
  }
}
