import { Injectable } from '@angular/core';
import { catchError, type Observable } from 'rxjs';
import { BaseApiService } from './base-api.service';
import type { DocumentItem, IngestResponse } from './api-models';

@Injectable({ providedIn: 'root' })
export class DocumentsApiService extends BaseApiService {
  ingest(source: string, text: string): Observable<IngestResponse> {
    return this.http
      .post<IngestResponse>(
        `${this.base}/ingest`,
        { source, text },
        { headers: this.authHeaders() },
      )
      .pipe(catchError((err) => this.handleError(err)));
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

  listDocuments(): Observable<DocumentItem[]> {
    return this.http.get<DocumentItem[]>(`${this.base}/documents`, {
      headers: this.authHeaders(),
    });
  }

  deleteDocument(source: string): Observable<{
    source: string;
    deleted_chunks: number;
    status: string;
  }> {
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
}
