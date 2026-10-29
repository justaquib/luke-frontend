import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { ErrorHandler, Injectable, inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AppLogService } from '../shared/app-log.service';

export const appErrorLoggingInterceptor: HttpInterceptorFn = (request, next) => {
  const logs = inject(AppLogService);
  return next(request).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        const path = getRequestPath(request.url);
        const detail = readDetail(error.error);
        const message =
          error.status === 0
            ? 'Request failed: the API could not be reached or the browser blocked the connection.'
            : (detail ?? error.statusText ?? 'The request failed.');
        logs.record({
          level: error.status === 0 || error.status >= 500 ? 'error' : 'warning',
          source: `${request.method} API request`,
          message: `${message} (HTTP ${error.status || 'network error'})`,
          path,
          status: error.status || undefined,
        });
      }
      return throwError(() => error);
    }),
  );
};

function readDetail(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) {
    return null;
  }
  const detail = (body as Record<string, unknown>)['detail'];
  return typeof detail === 'string' ? detail : null;
}

@Injectable()
export class AppErrorHandler extends ErrorHandler {
  private readonly logs = inject(AppLogService);

  override handleError(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    this.logs.record({ level: 'error', source: 'Browser runtime', message });
    super.handleError(error);
  }
}

function getRequestPath(url: string): string {
  try {
    return new URL(url, typeof window === 'undefined' ? 'http://localhost' : window.location.origin)
      .pathname;
  } catch {
    return url.split('?')[0];
  }
}
