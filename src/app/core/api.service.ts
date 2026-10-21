import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export type KnowledgeGraph = any;
export type LanguageBrainState = any;
export type LanguageModelState = any;
export type ModelLevel = any;
export type ModelLevelRung = any;
export type LanguageDictionaryEntry = any;
export type LanguagePreviewResponse = any;
export type LanguageTest = any;
export type LanguageTestFinishResult = any;
export type QueryReasoning = any;
export type ReasoningEdge = any;
export type ReasoningNode = any;
export type FaqItem2 = any;

/** The words the answering model can write with, one page at a time. */
export interface LanguageWordPage {
  words: string[];
  total: number;
  offset: number;
  limit: number;
  has_more: boolean;
}

/** One lesson in a group of lessons that repeat each other. */
export interface DuplicateLessonCard {
  id: string;
  question: string;
  answer: string;
  subject: string;
  subjects: string[];
  grade_id: string;
  confidence: number;
  created_at?: string | null;
}

/** A group of lessons that repeat each other. */
export interface DuplicateGroup {
  kind: 'same_question' | 'same_answer' | 'similar';
  label: string;
  detail: string;
  key: string;
  cards: DuplicateLessonCard[];
}

/** The lessons that repeat each other, and how many there are. */
export interface DuplicateLessons {
  groups: DuplicateGroup[];
  total_questions: number;
  duplicate_count: number;
}

/** What the brain knows about itself, with the level it has reached. */
export interface LanguageBrainResponse {
  state: LanguageBrainState;
  model_level: ModelLevel;
  sentence?: string | null;
  training?: boolean;
}

/** The result of running the level tests again. */
export interface LanguageLevelTest {
  state: LanguageBrainState;
  rungs: { rung: string; rate: number; passed?: number; probes?: number }[];
  passed: number;
  total: number;
}

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

/** The sentence the learner built from the given words. */
export interface LanguageSentence {
  sentence: string | null;
}

/** What the assistant has stored: the files, the numbers and the size on disk. */
export interface StoreSummary {
  documents: { source: string; chunks: number; created_at?: string | null }[];
  totals: {
    files: number;
    chunks: number;
    answers: number;
    pending: number;
    lessons: number;
    vocabulary: number;
  };
  model: {
    name: string;
    level: number;
    title: string;
    vocabulary: number;
    parameters: number;
    trained: boolean;
    steps: number;
    loss: number | null;
    corpus_sentences: number;
    corpus_tokens: number;
  };
  disk: {
    learner_bytes: number;
    vector_store_bytes: number;
    uploads_bytes: number;
  };
}


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
  private readonly auth = inject(AuthService);
  private readonly base = environment.apiUrl;

  private authHeaders(): Record<string, string> {
    const token = this.auth.token();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

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
      .post<QueryResponse>(`${this.base}/query`, body, { headers: this.authHeaders() })
      .pipe(catchError((err) => this.handleError(err)));
  }

  ingest(source: string, text: string): Observable<IngestResponse> {
    return this.http
      .post<IngestResponse>(`${this.base}/ingest`, { source, text }, { headers: this.authHeaders() })
      .pipe(catchError((err) => this.handleError(err)));
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
      .pipe(catchError((err) => this.handleError(err)));
  }

  updateFaq(id: number, answer: string): Observable<FaqItem> {
    return this.http
      .patch<FaqItem>(`${this.base}/faq/${id}`, { answer }, { headers: this.authHeaders() })
      .pipe(catchError((err) => this.handleError(err)));
  }

  setFaqStatus(
    id: number,
    status: FaqItem['status'],
  ): Observable<FaqItem> {
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
    return this.http.get<PendingItem[]>(
      `${this.base}/faq/inbox?resolved=${resolved}`,
      { headers: this.authHeaders() },
    );
  }

  answerPending(id: number, answer: string): Observable<FaqItem> {
    return this.http
      .post<FaqItem>(`${this.base}/faq/inbox/${id}/answer`, { answer }, { headers: this.authHeaders() })
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
    return this.http.get<MergePreview>(
      `${this.base}/faq/pending/${pendingId}/merge-preview`,
      { headers: this.authHeaders() },
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
      { headers: this.authHeaders() },
    );
  }

  listIntents(): Observable<IntentItem[]> {
    return this.http.get<IntentItem[]>(`${this.base}/intents`, { headers: this.authHeaders() });
  }

  createIntent(name: string, responseTemplate: string, faqId: number | null): Observable<IntentItem> {
    return this.http.post<IntentItem>(`${this.base}/intents`, {
      name,
      response_template: responseTemplate,
      faq_id: faqId,
    }, { headers: this.authHeaders() });
  }

  deleteIntent(id: number): Observable<{ deleted: number }> {
    return this.http.delete<{ deleted: number }>(`${this.base}/intents/${id}`, { headers: this.authHeaders() });
  }

  intentSuggestions(question: string): Observable<IntentSuggestions> {
    return this.http.get<IntentSuggestions>(
      `${this.base}/faq/intent-suggestions?question=${encodeURIComponent(question)}`,
      { headers: this.authHeaders() },
    );
  }

  faqMergePreview(id: number): Observable<FaqMergePreview> {
    return this.http.get<FaqMergePreview>(`${this.base}/faq/${id}/merge-preview`, { headers: this.authHeaders() });
  }

  faqMerge(
    id: number,
    req: { faq_ids: number[]; answer?: string | null; target_id?: number | null },
  ): Observable<FaqMergeResult> {
    return this.http.post<FaqMergeResult>(`${this.base}/faq/${id}/merge`, req, { headers: this.authHeaders() });
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

  deleteDocument(source: string): Observable<{ source: string; deleted_chunks: number; status: string }> {
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
    return this.http.post<{ id: number; rating: string }>(`${this.base}/feedback`, req, { headers: this.authHeaders() });
  }

  listTenants(): Observable<Tenant[]> {
    return this.http.get<Tenant[]>(`${this.base}/auth/tenants`, { headers: this.authHeaders() });
  }

  createInvite(email: string, role = 'user'): Observable<Invite> {
    return this.http.post<Invite>(`${this.base}/auth/invites`, { email, role }, { headers: this.authHeaders() });
  }

  listInvites(): Observable<Invite[]> {
    return this.http.get<Invite[]>(`${this.base}/auth/invites`, { headers: this.authHeaders() });
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

export interface Tenant {
  id: number;
  name: string;
  slug: string;
  created_at: string;
}

export interface Invite {
  id: number;
  tenant_id: number;
  email: string;
  role: string;
  token: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}