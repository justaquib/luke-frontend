import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { AppIcon } from '../shared/app-icon';

export interface HuggingFaceSearchResult {
  model_id: string;
  name: string;
  parameters?: string;
  downloads?: number;
}

@Component({
  selector: 'app-huggingface-search-results',
  standalone: true,
  imports: [AppIcon],
  templateUrl: './huggingface-search-results.html',
  styleUrl: './huggingface-search-results.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HuggingFaceSearchResults {
  readonly results = input<HuggingFaceSearchResult[]>([]);
  readonly downloading = input<string | null>(null);
  readonly download = output<string>();
}
