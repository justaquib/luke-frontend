import { Injectable } from '@angular/core';
import { catchError, type Observable } from 'rxjs';
import { BaseApiService } from './base-api.service';
import type { QueryResponse } from './api-models';

export interface QueryOptions {
  apps?: { weather?: boolean; wiki?: boolean };
  location?: { lat?: number; lon?: number };
}

export interface FeedbackRequest {
  message_id?: number;
  question: string;
  answer: string;
  source: string;
  rating: 'like' | 'dislike';
}

@Injectable({ providedIn: 'root' })
export class ChatApiService extends BaseApiService {
  health(): Observable<{ status: string }> {
    return this.http.get<{ status: string }>(`${this.base}/health`);
  }

  query(question: string, nResults = 4, opts?: QueryOptions): Observable<QueryResponse> {
    const body: Record<string, unknown> = { question, n_results: nResults };
    if (opts?.apps) {
      body['apps'] = opts.apps;
    }
    if (opts?.location) {
      body['location'] = opts.location;
    }
    return this.http
      .post<QueryResponse>(`${this.base}/query`, body, { headers: this.authHeaders() })
      .pipe(catchError((err) => this.handleError(err)));
  }

  sendFeedback(req: FeedbackRequest): Observable<{ id: number; rating: string }> {
    return this.http.post<{ id: number; rating: string }>(`${this.base}/feedback`, req, {
      headers: this.authHeaders(),
    });
  }
}
