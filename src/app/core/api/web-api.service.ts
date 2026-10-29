import { Injectable } from '@angular/core';
import { catchError, type Observable } from 'rxjs';
import { BaseApiService } from './base-api.service';
import type { WebRefreshResult, WebSettingsBody, WebStatus } from './web-models';

/** The allowlisted web sources: the policy, the sources and a refresh run. */
@Injectable({ providedIn: 'root' })
export class WebApiService extends BaseApiService {
  status(): Observable<WebStatus> {
    return this.http
      .get<WebStatus>(`${this.base}/web/status`, { headers: this.authHeaders() })
      .pipe(catchError((error) => this.handleError(error)));
  }

  saveSettings(body: WebSettingsBody): Observable<WebStatus['policy']> {
    return this.http
      .put<WebStatus['policy']>(`${this.base}/web/settings`, body, {
        headers: this.authHeaders(),
      })
      .pipe(catchError((error) => this.handleError(error)));
  }

  addSource(url: string): Observable<{ source: { id: number; url: string; domain: string } }> {
    return this.http
      .post<{ source: { id: number; url: string; domain: string } }>(
        `${this.base}/web/sources`,
        { url },
        { headers: this.authHeaders() },
      )
      .pipe(catchError((error) => this.handleError(error)));
  }

  removeSource(id: number): Observable<{ deleted: number }> {
    return this.http
      .delete<{ deleted: number }>(`${this.base}/web/sources/${id}`, {
        headers: this.authHeaders(),
      })
      .pipe(catchError((error) => this.handleError(error)));
  }

  refresh(): Observable<WebRefreshResult> {
    return this.http
      .post<WebRefreshResult>(`${this.base}/web/refresh`, {}, { headers: this.authHeaders() })
      .pipe(catchError((error) => this.handleError(error)));
  }
}
