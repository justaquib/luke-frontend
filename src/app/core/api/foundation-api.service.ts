import { Injectable } from '@angular/core';
import { type Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { BaseApiService } from './base-api.service';

/** The identity the backend measured from the pinned checkpoint files. */
export interface FoundationIdentityRecord {
  name: string;
  version: string;
  base_model: string;
  revision: string;
  license: string;
  parameters: number;
  context_limit: number;
  weight_sha256: string;
  weight_bytes: number;
  dtypes: string[];
  display: string;
}

/** Whether the checkpoint is installed, and whether this process has it loaded. */
export interface FoundationStatus {
  installed: boolean;
  identity: FoundationIdentityRecord | null;
  error: string | null;
  loaded: boolean;
  device: string | null;
  memory_bytes: number | null;
}

/** Reads the foundation checkpoint's measured identity from the backend. */
@Injectable({ providedIn: 'root' })
export class FoundationApiService extends BaseApiService {
  status(): Observable<FoundationStatus> {
    return this.http
      .get<FoundationStatus>(`${this.base}/language-model/foundation`, {
        headers: this.authHeaders(),
      })
      .pipe(catchError((error) => this.handleError(error)));
  }
}
