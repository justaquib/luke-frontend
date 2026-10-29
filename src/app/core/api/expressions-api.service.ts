import { Injectable } from '@angular/core';
import { type Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { BaseApiService } from './base-api.service';

/** The four moments of a conversation the trainer can give words to. */
export type ExpressionCategory = 'open' | 'close' | 'pause' | 'resume';

/** One phrase the trainer taught, and the reply Luke gives it. */
export interface TaughtExpression {
  id: string;
  category: ExpressionCategory;
  label: string;
  phrase: string;
  reply: string;
}

/** A category with its label, explanation and how many phrases it holds. */
export interface ExpressionCategoryInfo {
  id: ExpressionCategory;
  label: string;
  description: string;
  count: number;
}

/** The limits the backend enforces, so the form can show the same numbers. */
export interface ExpressionLimits {
  items: number;
  phrase: number;
  reply: number;
}

/** Everything the expressions page reads in one call. */
export interface ExpressionView {
  items: TaughtExpression[];
  categories: ExpressionCategoryInfo[];
  limits: ExpressionLimits;
}

/** The phrase and reply a trainer writes. */
export interface ExpressionDraft {
  category: ExpressionCategory;
  phrase: string;
  reply: string;
}

/**
 * The calls of the conversation expressions: the greetings, goodbyes, pauses
 * and resumes Luke answers in the trainer's own words.
 */
@Injectable({ providedIn: 'root' })
export class ExpressionsApiService extends BaseApiService {
  list(): Observable<ExpressionView> {
    return this.http
      .get<ExpressionView>(`${this.base}/language-model/expressions`, {
        headers: this.authHeaders(),
      })
      .pipe(catchError((error) => this.handleError(error)));
  }

  add(draft: ExpressionDraft): Observable<TaughtExpression> {
    return this.http
      .post<TaughtExpression>(`${this.base}/language-model/expressions`, draft, {
        headers: this.authHeaders(),
      })
      .pipe(catchError((error) => this.handleError(error)));
  }

  update(id: string, draft: ExpressionDraft): Observable<TaughtExpression> {
    return this.http
      .put<TaughtExpression>(`${this.base}/language-model/expressions/${id}`, draft, {
        headers: this.authHeaders(),
      })
      .pipe(catchError((error) => this.handleError(error)));
  }

  remove(id: string): Observable<{ removed: string }> {
    return this.http
      .delete<{ removed: string }>(`${this.base}/language-model/expressions/${id}`, {
        headers: this.authHeaders(),
      })
      .pipe(catchError((error) => this.handleError(error)));
  }
}
