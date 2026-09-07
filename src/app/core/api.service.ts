import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

export interface QueryHit {
  text: string;
  metadata: { source: string };
  distance: number | null;
}

export interface QueryResponse {
  question: string;
  source: 'faq' | 'docs' | 'pending' | 'intent' | 'weather' | 'wiki';
  answer: string;
  hits: QueryHit[];
  entities: { text: string; label: string }[];
  pending_id: number | null;
  intent?: { matched_question?: string; matched_faq_id?: number; distance?: number; answer?: string } | null;
  app?: Record<string, unknown> | null;
  disabled_external_sources?: string[] | null;
}

export interface MergeMatch {
  pending_id: number;
  question: string;
  occurrences: number;
  distance: number;
}

export interface MergePreview {
  canonical_id: number;
  canonical_question: string;
  answer: string;
  matches: MergeMatch[];
}

export interface MergeResult {
  canonical_faq_id: number;
  created: number;
  resolved: number;
}

export interface IntentItem {
  id: number;
  name: string;
  response_template: string;
  faq_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface FaqSuggestion {
  faq_id: number;
  question: string;
  answer: string;
  status: string;
  distance: number;
}

export interface PendingSuggestionItem {
  pending_id: number;
  question: string;
  occurrences: number;
  distance: number;
}

export interface IntentSuggestions {
  query: string;
  faqs: FaqSuggestion[];
  pending: PendingSuggestionItem[];
}

export interface FaqMergePreview {
  canonical_id: number;
  canonical_question: string;
  canonical_answer: string;
  matches: FaqSuggestion[];
}

export interface FaqMergeResult {
  canonical_faq_id: number;
  absorbed: number;
  recreated: number;
}

export interface IngestRequest {
  source: string;
  text: string;
}

export interface IngestResponse {
  source: string;
  chunks: number;
  start_id: number | null;
}

export interface StatsResponse {
  chunks: number;
  faqs: number;
  pending: number;
}

export interface FaqItem {
  id: number;
  question: string;
  answer: string;
  status: 'pending' | 'approved' | 'declined' | 'duplicate';
  created_at: string;
  updated_at: string;
}

export interface PendingItem {
  id: number;
  question: string;
  occurrences: number;
  resolved: boolean;
  created_at: string;
  last_seen_at: string;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  health(): Observable<{ status: string }> {
    return this.http.get<{ status: string }>(`${this.base}/health`);
  }

  query(question: string, nResults = 4, opts?: {
    apps?: { weather?: boolean; wiki?: boolean };
    location?: { lat?: number; lon?: number };
  }): Observable<QueryResponse> {
    const body: Record<string, unknown> = { question, n_results: nResults };
    if (opts?.apps) body['apps'] = opts.apps;
    if (opts?.location) body['location'] = opts.location;
    return this.http
      .post<QueryResponse>(`${this.base}/query`, body)
      .pipe(catchError((err) => this.handleError(err)));
  }

  ingest(source: string, text: string): Observable<IngestResponse> {
    return this.http
      .post<IngestResponse>(`${this.base}/ingest`, { source, text })
      .pipe(catchError((err) => this.handleError(err)));
  }

  stats(): Observable<StatsResponse> {
    return this.http.get<StatsResponse>(`${this.base}/stats`);
  }

  listFaqs(status?: FaqItem['status']): Observable<FaqItem[]> {
    const url = status ? `${this.base}/faq?status=${status}` : `${this.base}/faq`;
    return this.http.get<FaqItem[]>(url);
  }

  createFaq(question: string, answer: string): Observable<FaqItem> {
    return this.http
      .post<FaqItem>(`${this.base}/faq`, { question, answer })
      .pipe(catchError((err) => this.handleError(err)));
  }

  updateFaq(id: number, answer: string): Observable<FaqItem> {
    return this.http
      .patch<FaqItem>(`${this.base}/faq/${id}`, { answer })
      .pipe(catchError((err) => this.handleError(err)));
  }

  setFaqStatus(
    id: number,
    status: FaqItem['status'],
  ): Observable<FaqItem> {
    return this.http
      .patch<FaqItem>(`${this.base}/faq/${id}/status`, { status })
      .pipe(catchError((err) => this.handleError(err)));
  }

  deleteFaq(id: number): Observable<{ deleted: number }> {
    return this.http
      .delete<{ deleted: number }>(`${this.base}/faq/${id}`)
      .pipe(catchError((err) => this.handleError(err)));
  }

  listInbox(resolved = false): Observable<PendingItem[]> {
    return this.http.get<PendingItem[]>(
      `${this.base}/faq/inbox?resolved=${resolved}`,
    );
  }

  answerPending(id: number, answer: string): Observable<FaqItem> {
    return this.http
      .post<FaqItem>(`${this.base}/faq/inbox/${id}/answer`, { answer })
      .pipe(catchError((err) => this.handleError(err)));
  }

  logPending(question: string): Observable<PendingItem> {
    return this.http
      .post<PendingItem>(`${this.base}/faq/log`, { question })
      .pipe(catchError((err) => this.handleError(err)));
  }

  deletePending(id: number): Observable<{ deleted: number }> {
    return this.http
      .delete<{ deleted: number }>(`${this.base}/faq/inbox/${id}`)
      .pipe(catchError((err) => this.handleError(err)));
  }

  previewMerge(pendingId: number): Observable<MergePreview> {
    return this.http.get<MergePreview>(
      `${this.base}/faq/pending/${pendingId}/merge-preview`,
    );
  }

  mergePending(
    pendingId: number,
    pendingIds: number[],
    answer: string,
  ): Observable<MergeResult> {
    return this.http.post<MergeResult>(
      `${this.base}/faq/pending/${pendingId}/merge`,
      { pending_ids: pendingIds, answer },
    );
  }

  listIntents(): Observable<IntentItem[]> {
    return this.http.get<IntentItem[]>(`${this.base}/intents`);
  }

  createIntent(name: string, responseTemplate: string, faqId: number | null): Observable<IntentItem> {
    return this.http.post<IntentItem>(`${this.base}/intents`, {
      name,
      response_template: responseTemplate,
      faq_id: faqId,
    });
  }

  deleteIntent(id: number): Observable<{ deleted: number }> {
    return this.http.delete<{ deleted: number }>(`${this.base}/intents/${id}`);
  }

  intentSuggestions(question: string): Observable<IntentSuggestions> {
    return this.http.get<IntentSuggestions>(
      `${this.base}/faq/intent-suggestions?question=${encodeURIComponent(question)}`,
    );
  }

  faqMergePreview(id: number): Observable<FaqMergePreview> {
    return this.http.get<FaqMergePreview>(`${this.base}/faq/${id}/merge-preview`);
  }

  faqMerge(
    id: number,
    req: { faq_ids: number[]; answer?: string | null; target_id?: number | null },
  ): Observable<FaqMergeResult> {
    return this.http.post<FaqMergeResult>(`${this.base}/faq/${id}/merge`, req);
  }

  private handleError(err: HttpErrorResponse): Observable<never> {
    let message = 'Could not reach the assistance backend.';
    if (err.status === 0) {
      message += ' Is the API running on ' + this.base + '?';
    } else if (err.error?.detail) {
      message = err.error.detail;
    } else {
      message += ` (HTTP ${err.status})`;
    }
    return throwError(() => new Error(message));
  }
}