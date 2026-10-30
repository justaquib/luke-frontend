import { Injectable, inject, signal } from '@angular/core';
import { ModelApiService } from '../core/api/model-api.service';
import { UiService } from '../shared/ui.service';

export interface HuggingFaceSearchResult {
  model_id: string;
  name: string;
  parameters?: string;
  downloads?: number;
}

@Injectable({ providedIn: 'root' })
export class HuggingFaceSearchService {
  private readonly api = inject(ModelApiService);
  private readonly ui = inject(UiService);

  readonly searchQuery = signal('');
  readonly searchResults = signal<HuggingFaceSearchResult[]>([]);
  readonly searching = signal(false);
  readonly downloading = signal<string | null>(null);

  search(): void {
    const query = this.searchQuery().trim();
    if (!query || this.searching()) return;
    this.searching.set(true);
    this.searchResults.set([]);
    this.api.searchHuggingFaceModels(query).subscribe({
      next: (results) => {
        this.searching.set(false);
        this.searchResults.set(results as unknown as HuggingFaceSearchResult[]);
        if (results.length === 0) {
          this.ui.error('No models found for that search.');
        }
      },
      error: (error: Error) => {
        this.searching.set(false);
        this.ui.error(error.message || 'The search failed.');
      },
    });
  }

  downloadTeacher(modelId: string, onComplete: () => void): void {
    if (this.downloading()) return;
    this.downloading.set(modelId);
    this.api.downloadHuggingFaceTeacher(modelId).subscribe({
      next: (result) => {
        this.downloading.set(null);
        this.ui.success(`Downloaded ${result.name}. Refreshing models…`);
        onComplete();
      },
      error: (error: Error) => {
        this.downloading.set(null);
        this.ui.error(error.message || 'The download failed.');
      },
    });
  }
}
