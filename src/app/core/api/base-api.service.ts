import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { type Observable, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth.service';
import type { SseMessage } from './sse-parser';

export abstract class BaseApiService {
  protected readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  protected readonly base = environment.apiUrl;

  protected authHeaders(): Record<string, string> {
    const token = this.auth.token();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  protected errorMessage(err: unknown): string {
    let message = 'Could not reach the Luke Lab backend.';
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
    return message;
  }

  protected statusMessage(status: number): string {
    return `Could not reach the Luke Lab backend. (HTTP ${status})`;
  }

  protected handleError(err: unknown): Observable<never> {
    return throwError(() => new Error(this.errorMessage(err)));
  }

  /** The backend's own reason for a refused stream, or the status wording. */
  protected async failureDetail(response: Response): Promise<string> {
    try {
      const body = (await response.json()) as { detail?: unknown };
      if (typeof body.detail === 'string') return body.detail;
    } catch {
      // An error body that is not JSON falls back to the status wording.
    }
    return this.statusMessage(response.status);
  }

  /** A frame's JSON payload, or an empty object when the frame is not JSON. */
  protected frameData(message: SseMessage): unknown {
    try {
      return message.data ? JSON.parse(message.data) : {};
    } catch {
      return {};
    }
  }
}
