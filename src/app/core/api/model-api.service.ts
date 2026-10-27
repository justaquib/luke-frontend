import { Injectable } from '@angular/core';
import { catchError, map, type Observable } from 'rxjs';
import { BaseApiService } from './base-api.service';
import type {
  AnswerModelCatalog,
  HuggingFaceRun,
  HuggingFaceState,
  WordPrediction,
} from './api-models';
import type { LukePackagePreview } from './luke-package';
import type { TransferState } from './transfer-models';

/**
 * The models the chat can answer with, and the words one of them expects next.
 * The Base model tab reads the same service, so the chat and the trainer never
 * disagree about which teachers are installed.
 */
@Injectable({ providedIn: 'root' })
export class ModelApiService extends BaseApiService {
  catalog(): Observable<AnswerModelCatalog> {
    return this.http
      .get<AnswerModelCatalog>(`${this.base}/language-model/models`, {
        headers: this.authHeaders(),
      })
      .pipe(catchError((err) => this.handleError(err)));
  }

  predict(text: string, model: string | null, limit = 5): Observable<WordPrediction> {
    return this.http
      .post<WordPrediction>(
        `${this.base}/language-model/predict`,
        { text, model, limit },
        { headers: this.authHeaders() },
      )
      .pipe(catchError((err) => this.handleError(err)));
  }

  huggingface(): Observable<HuggingFaceState> {
    return this.http
      .get<HuggingFaceState>(`${this.base}/language-model/huggingface`, {
        headers: this.authHeaders(),
      })
      .pipe(
        map((state) => this.normalised(state)),
        catchError((err) => this.handleError(err)),
      );
  }

  trainBaseModel(modelId: string, steps: number): Observable<HuggingFaceState> {
    return this.http
      .post<HuggingFaceState>(
        `${this.base}/language-model/huggingface/train`,
        { model_id: modelId, steps },
        { headers: this.authHeaders() },
      )
      .pipe(
        map((state) => this.normalised(state)),
        catchError((err) => this.handleError(err)),
      );
  }

  removeTeacher(folder: string): Observable<HuggingFaceState> {
    return this.http
      .delete<HuggingFaceState>(
        `${this.base}/language-model/huggingface/teachers/${encodeURIComponent(folder)}`,
        { headers: this.authHeaders() },
      )
      .pipe(
        map((state) => this.normalised(state)),
        catchError((err) => this.handleError(err)),
      );
  }

  transfer(): Observable<TransferState> {
    return this.http
      .get<TransferState>(`${this.base}/language-model/huggingface/transfer`, {
        headers: this.authHeaders(),
      })
      .pipe(catchError((err) => this.handleError(err)));
  }

  startTransfer(folder: string, limit: number): Observable<TransferState> {
    return this.http
      .post<TransferState>(
        `${this.base}/language-model/huggingface/transfer`,
        { folder, limit },
        { headers: this.authHeaders() },
      )
      .pipe(catchError((err) => this.handleError(err)));
  }

  undoTransfer(): Observable<TransferState> {
    return this.http
      .post<TransferState>(
        `${this.base}/language-model/huggingface/transfer/undo`,
        {},
        { headers: this.authHeaders() },
      )
      .pipe(catchError((err) => this.handleError(err)));
  }

  lukePackage(): Observable<LukePackagePreview> {
    return this.http
      .get<LukePackagePreview>(`${this.base}/language-model/export/preview`, {
        headers: this.authHeaders(),
      })
      .pipe(catchError((err) => this.handleError(err)));
  }

  downloadLukePackage(): Observable<Blob> {
    return this.http
      .get(`${this.base}/language-model/export`, {
        headers: this.authHeaders(),
        responseType: 'blob',
      })
      .pipe(catchError((err) => this.handleError(err)));
  }

  /** The backend writes an empty record before a run; the page reads absence. */
  private normalised(state: HuggingFaceState): HuggingFaceState {
    const present = (run: HuggingFaceRun | null): HuggingFaceRun | null =>
      run && Object.keys(run).length ? run : null;
    return { ...state, last_run: present(state.last_run), progress: present(state.progress) };
  }
}
