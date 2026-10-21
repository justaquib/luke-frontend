import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { type Observable, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth.service';

export abstract class BaseApiService {
  protected readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  protected readonly base = environment.apiUrl;

  protected authHeaders(): Record<string, string> {
    const token = this.auth.token();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  protected handleError(err: unknown): Observable<never> {
    let message = 'Could not reach the assistance backend.';
    const httpError = err instanceof HttpErrorResponse ? err : null;
    if (!httpError || httpError.status === 0) {
      message += ' Is the API running on ' + this.base + '?';
    } else {
      const detail = (httpError.error as { detail?: unknown } | null)?.detail;
      if (typeof detail === 'string') {
        message = detail;
      } else {
        message += ` (HTTP ${httpError.status})`;
      }
    }
    return throwError(() => new Error(message));
  }
}
