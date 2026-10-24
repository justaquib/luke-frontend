import { HttpClient, type HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, throwError, type Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import type {
  FaqItem,
  FaqMergePreview,
  FaqMergeResult,
  IngestResponse,
  IntentItem,
  IntentSuggestions,
  Invite,
  MergePreview,
  MergeResult,
  PendingItem,
  QueryResponse,
  StatsResponse,
  Tenant,
} from './api/api.types';
import { AuthService } from './auth.service';

export * from './api/api.types';

/**
 * The learner and trainer pages read a few dynamic response bags whose shape
 * is still being settled; they keep the loose aliases until that work lands.
 */
export type KnowledgeGraph = any;
export type LanguageModelState = any;
export type LanguageDictionaryEntry = any;
export type LanguagePreviewResponse = any;
export type LanguageTest = any;
export type LanguageTestFinishResult = any;
export type QueryReasoning = any;
export type ReasoningEdge = any;
export type ReasoningNode = any;
export type FaqItem2 = any;

/** The answer a grade test run gives back. */
export interface LanguageTestStart {
  state: LanguageModelState;
  message?: string;
  kind?: string;
}

/** The learner state after a test question or a score. */
export interface LanguageTestState {
  state: LanguageModelState;
}

/** The entry of a word the learner was taught. */
export interface LanguageDictionaryLearn {
  state: LanguageModelState;
  entry: LanguageDictionaryEntry;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly base = environment.apiUrl;

  private authHeaders(): Record<string, string> {
    const token = this.auth.token();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  health(): Observable<{ status: string }> {
    return this.http.get<{ status: string }>(`${this.base}/health`);
  }

  query(
    question: string,
    nResults = 4,
    opts?: {
      apps?: { weather?: boolean; wiki?: boolean };
      location?: { lat?: number; lon?: number };
    },
  ): Observable<QueryResponse> {
    const body: Record<string, unknown> = { question, n_results: nResults };
    if (opts?.apps) body['apps'] = opts.apps;
    if (opts?.location) body['location'] = opts.location;
    return this.http
      .post<QueryResponse>(`${this.base}/query`, body, { headers: this.authHeaders() })
      .pipe(catchError((err: HttpErrorResponse) => this.handleError(err)));
  }

  ingest(source: string, text: string): Observable<IngestResponse> {
    return this.http
      .post<IngestResponse>(
        `${this.base}/ingest`,
        { source, text },
        { headers: this.authHeaders() },
      )
      .pipe(catchError((err: HttpErrorResponse) => this.handleError(err)));
  }

  stats(): Observable<StatsResponse> {
    return this.http.get<StatsResponse>(`${this.base}/stats`, { headers: this.authHeaders() });
  }

  listFaqs(status?: FaqItem['status']): Observable<FaqItem[]> {
    const url = status ? `${this.base}/faq?status=${status}` : `${this.base}/faq`;
    return this.http.get<FaqItem[]>(url, { headers: this.authHeaders() });
  }

  createFaq(question: string, answer: string): Observable<FaqItem> {
    return this.http
      .post<FaqItem>(`${this.base}/faq`, { question, answer }, { headers: this.authHeaders() })
      .pipe(catchError((err: HttpErrorResponse) => this.handleError(err)));
  }

  updateFaq(id: number, answer: string): Observable<FaqItem> {
    return this.http
      .patch<FaqItem>(`${this.base}/faq/${id}`, { answer }, { headers: this.authHeaders() })
      .pipe(catchError((err: HttpErrorResponse) => this.handleError(err)));
  }

  setFaqStatus(id: number, status: FaqItem['status']): Observable<FaqItem> {
    return this.http
      .patch<FaqItem>(`${this.base}/faq/${id}/status`, { status }, { headers: this.authHeaders() })
      .pipe(catchError((err: HttpErrorResponse) => this.handleError(err)));
  }

  deleteFaq(id: number): Observable<{ deleted: number }> {
    return this.http
      .delete<{ deleted: number }>(`${this.base}/faq/${id}`, { headers: this.authHeaders() })
      .pipe(catchError((err: HttpErrorResponse) => this.handleError(err)));
  }

  listInbox(resolved = false): Observable<PendingItem[]> {
    return this.http.get<PendingItem[]>(`${this.base}/faq/inbox?resolved=${resolved}`, {
      headers: this.authHeaders(),
    });
  }

  answerPending(id: number, answer: string): Observable<FaqItem> {
    return this.http
      .post<FaqItem>(
        `${this.base}/faq/inbox/${id}/answer`,
        { answer },
        { headers: this.authHeaders() },
      )
      .pipe(catchError((err: HttpErrorResponse) => this.handleError(err)));
  }

  logPending(question: string): Observable<PendingItem> {
    return this.http
      .post<PendingItem>(`${this.base}/faq/log`, { question }, { headers: this.authHeaders() })
      .pipe(catchError((err: HttpErrorResponse) => this.handleError(err)));
  }

  deletePending(id: number): Observable<{ deleted: number }> {
    return this.http
      .delete<{ deleted: number }>(`${this.base}/faq/inbox/${id}`, { headers: this.authHeaders() })
      .pipe(catchError((err: HttpErrorResponse) => this.handleError(err)));
  }

  previewMerge(pendingId: number): Observable<MergePreview> {
    return this.http.get<MergePreview>(`${this.base}/faq/pending/${pendingId}/merge-preview`, {
      headers: this.authHeaders(),
    });
  }

  mergePending(pendingId: number, pendingIds: number[], answer: string): Observable<MergeResult> {
    return this.http.post<MergeResult>(
      `${this.base}/faq/pending/${pendingId}/merge`,
      { pending_ids: pendingIds, answer },
      { headers: this.authHeaders() },
    );
  }

  listIntents(): Observable<IntentItem[]> {
    return this.http.get<IntentItem[]>(`${this.base}/intents`, { headers: this.authHeaders() });
  }

  createIntent(
    name: string,
    responseTemplate: string,
    faqId: number | null,
  ): Observable<IntentItem> {
    return this.http.post<IntentItem>(
      `${this.base}/intents`,
      {
        name,
        response_template: responseTemplate,
        faq_id: faqId,
      },
      { headers: this.authHeaders() },
    );
  }

  deleteIntent(id: number): Observable<{ deleted: number }> {
    return this.http.delete<{ deleted: number }>(`${this.base}/intents/${id}`, {
      headers: this.authHeaders(),
    });
  }

  intentSuggestions(question: string): Observable<IntentSuggestions> {
    return this.http.get<IntentSuggestions>(
      `${this.base}/faq/intent-suggestions?question=${encodeURIComponent(question)}`,
      { headers: this.authHeaders() },
    );
  }

  faqMergePreview(id: number): Observable<FaqMergePreview> {
    return this.http.get<FaqMergePreview>(`${this.base}/faq/${id}/merge-preview`, {
      headers: this.authHeaders(),
    });
  }

  faqMerge(
    id: number,
    req: { faq_ids: number[]; answer?: string | null; target_id?: number | null },
  ): Observable<FaqMergeResult> {
    return this.http.post<FaqMergeResult>(`${this.base}/faq/${id}/merge`, req, {
      headers: this.authHeaders(),
    });
  }

  uploadFile(file: File): Observable<{ source: string; chunks: number; status: string }> {
    const form = new FormData();
    form.append('file', file, file.name);
    return this.http.post<{ source: string; chunks: number; status: string }>(
      `${this.base}/upload`,
      form,
      { headers: this.authHeaders() },
    );
  }

  listDocuments(): Observable<Array<{ source: string; chunks: number; created_at?: string }>> {
    return this.http.get<Array<{ source: string; chunks: number; created_at?: string }>>(
      `${this.base}/documents`,
      { headers: this.authHeaders() },
    );
  }

  deleteDocument(
    source: string,
  ): Observable<{ source: string; deleted_chunks: number; status: string }> {
    return this.http.delete<{ source: string; deleted_chunks: number; status: string }>(
      `${this.base}/documents/${encodeURIComponent(source)}`,
      { headers: this.authHeaders() },
    );
  }

  viewDocument(source: string): Observable<Blob> {
    return this.http.get(`${this.base}/documents/${encodeURIComponent(source)}/view`, {
      responseType: 'blob',
      headers: this.authHeaders(),
    });
  }

  downloadDocument(source: string): Observable<Blob> {
    return this.http.get(`${this.base}/documents/${encodeURIComponent(source)}/download`, {
      responseType: 'blob',
      headers: this.authHeaders(),
    });
  }

  sendFeedback(req: {
    message_id?: number;
    question: string;
    answer: string;
    source: string;
    rating: 'like' | 'dislike';
  }): Observable<{ id: number; rating: string }> {
    return this.http.post<{ id: number; rating: string }>(`${this.base}/feedback`, req, {
      headers: this.authHeaders(),
    });
  }

  listTenants(): Observable<Tenant[]> {
    return this.http.get<Tenant[]>(`${this.base}/auth/tenants`, { headers: this.authHeaders() });
  }

  createInvite(email: string, role = 'user'): Observable<Invite> {
    return this.http.post<Invite>(
      `${this.base}/auth/invites`,
      { email, role },
      { headers: this.authHeaders() },
    );
  }

  listInvites(): Observable<Invite[]> {
    return this.http.get<Invite[]>(`${this.base}/auth/invites`, { headers: this.authHeaders() });
  }

  private handleError(err: HttpErrorResponse): Observable<never> {
    let message = 'Could not reach the assistance backend.';
    const detail: unknown = (err.error as { detail?: unknown } | null)?.detail;
    if (err.status === 0) {
      message += ' Is the API running on ' + this.base + '?';
    } else if (typeof detail === 'string' && detail) {
      message = detail;
    } else {
      message += ` (HTTP ${err.status})`;
    }
    return throwError(() => new Error(message));
  }
}
