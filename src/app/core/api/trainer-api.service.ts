import { Injectable } from '@angular/core';
import { catchError, type Observable } from 'rxjs';
import { BaseApiService } from './base-api.service';
import type {
  FaqItem,
  FaqMergePreview,
  FaqMergeResult,
  FaqStatus,
  IntentItem,
  IntentSuggestions,
  MergePreview,
  MergeResult,
  PendingItem,
  StatsResponse,
} from './api-models';

export interface FaqMergeRequest {
  faq_ids: number[];
  answer?: string | null;
  target_id?: number | null;
}

@Injectable({ providedIn: 'root' })
export class TrainerApiService extends BaseApiService {
  stats(): Observable<StatsResponse> {
    return this.http.get<StatsResponse>(`${this.base}/stats`, { headers: this.authHeaders() });
  }

  listFaqs(status?: FaqStatus): Observable<FaqItem[]> {
    const url = status ? `${this.base}/faq?status=${status}` : `${this.base}/faq`;
    return this.http.get<FaqItem[]>(url, { headers: this.authHeaders() });
  }

  createFaq(question: string, answer: string): Observable<FaqItem> {
    return this.http
      .post<FaqItem>(`${this.base}/faq`, { question, answer }, { headers: this.authHeaders() })
      .pipe(catchError((err) => this.handleError(err)));
  }

  updateFaq(id: number, answer: string): Observable<FaqItem> {
    return this.http
      .patch<FaqItem>(`${this.base}/faq/${id}`, { answer }, { headers: this.authHeaders() })
      .pipe(catchError((err) => this.handleError(err)));
  }

  setFaqStatus(id: number, status: FaqStatus): Observable<FaqItem> {
    return this.http
      .patch<FaqItem>(`${this.base}/faq/${id}/status`, { status }, { headers: this.authHeaders() })
      .pipe(catchError((err) => this.handleError(err)));
  }

  deleteFaq(id: number): Observable<{ deleted: number }> {
    return this.http
      .delete<{ deleted: number }>(`${this.base}/faq/${id}`, { headers: this.authHeaders() })
      .pipe(catchError((err) => this.handleError(err)));
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
      .pipe(catchError((err) => this.handleError(err)));
  }

  logPending(question: string): Observable<PendingItem> {
    return this.http
      .post<PendingItem>(`${this.base}/faq/log`, { question }, { headers: this.authHeaders() })
      .pipe(catchError((err) => this.handleError(err)));
  }

  deletePending(id: number): Observable<{ deleted: number }> {
    return this.http
      .delete<{ deleted: number }>(`${this.base}/faq/inbox/${id}`, { headers: this.authHeaders() })
      .pipe(catchError((err) => this.handleError(err)));
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
      { name, response_template: responseTemplate, faq_id: faqId },
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

  faqMerge(id: number, req: FaqMergeRequest): Observable<FaqMergeResult> {
    return this.http.post<FaqMergeResult>(`${this.base}/faq/${id}/merge`, req, {
      headers: this.authHeaders(),
    });
  }
}
