import {
  ChangeDetectionStrategy,
  Component,
  type OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import type { LukePackagePreview } from '../core/api/luke-package';
import { ModelApiService } from '../core/api/model-api.service';
import { BrowserService } from '../core/browser.service';
import { AppIcon } from '../shared/app-icon';
import { UiService } from '../shared/ui.service';

const KIND_LABELS: Record<string, string> = {
  lesson: 'Lessons',
  starter_lesson: 'Starter lessons',
  conversation: 'Conversations',
  approved_answer: 'Trained answers',
  correction: 'Corrections',
  word: 'Words',
  sentence: 'Sentences',
  document: 'Documents',
  topic: 'Topics',
};

/**
 * The download card: one zip holding the model Luke answers with, the heads it
 * trained and the material it learned from. Counts come from the backend's
 * preview, and the zip is only built when a trainer asks for it.
 */
@Component({
  selector: 'app-luke-package',
  standalone: true,
  imports: [AppIcon],
  templateUrl: './luke-package.html',
  styleUrls: ['./styles/luke-package.css', '../shared/controls.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LukePackage implements OnInit {
  protected readonly preview = signal<LukePackagePreview | null>(null);
  protected readonly loading = signal(false);
  protected readonly downloading = signal(false);
  protected readonly error = signal('');

  private readonly api = inject(ModelApiService);
  private readonly browser = inject(BrowserService);
  private readonly ui = inject(UiService);

  protected readonly kinds = computed<Array<{ kind: string; label: string; count: number }>>(() =>
    Object.entries(this.preview()?.by_kind ?? {}).map(([kind, count]) => ({
      kind,
      label: this.kindLabel(kind),
      count,
    })),
  );
  protected readonly modelBytes = computed(() => this.size(this.preview()?.bytes ?? 0));
  protected readonly teachers = computed(() => this.preview()?.teachers.length ?? 0);

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.lukePackage().subscribe({
      next: (preview) => {
        this.preview.set(preview);
        this.loading.set(false);
      },
      error: (error: Error) => {
        this.loading.set(false);
        this.error.set(error.message || 'The package could not be read.');
      },
    });
  }

  download(): void {
    const preview = this.preview();
    if (!preview || this.downloading()) return;
    this.downloading.set(true);
    this.api.downloadLukePackage().subscribe({
      next: (blob) => {
        this.downloading.set(false);
        this.browser.downloadBlob(blob, preview.filename);
        this.ui.success(`${preview.filename} is downloading.`);
      },
      error: (error: Error) => {
        this.downloading.set(false);
        this.ui.error(error.message || 'The package could not be built.');
      },
    });
  }

  protected kindLabel(kind: string): string {
    return KIND_LABELS[kind] ?? kind;
  }

  protected size(bytes: number): string {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
