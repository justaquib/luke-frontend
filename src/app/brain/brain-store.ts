import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import type { OnInit } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { LanguageModelApiService } from '../core/api/language-model-api.service';
import type { StoreSummary } from '../core/api/api.types';
import { AppIcon } from '../shared/app-icon';

interface StoreMetric {
  label: string;
  value: number;
  note: string;
}

interface StoreRow {
  label: string;
  value: string;
  note: string;
}

/**
 * What the store holds: the files the assistant read, the answers it keeps,
 * the size of each part on disk, and the training the model came from. The
 * numbers are read from the same store the training reads, and a number that
 * has not been measured says so.
 */
@Component({
  selector: 'app-brain-store',
  standalone: true,
  imports: [AppIcon],
  templateUrl: './brain-store.html',
  styleUrl: './brain-store.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrainStore implements OnInit {
  private readonly api = inject(LanguageModelApiService);
  private readonly platformId = inject(PLATFORM_ID);

  protected readonly summary = signal<StoreSummary | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly metrics = computed<StoreMetric[]>(() => {
    const totals = this.summary()?.totals;
    if (!totals) return [];
    return [
      { label: 'Files', value: totals.files, note: 'documents ingested' },
      { label: 'Chunks', value: totals.chunks, note: 'passages read word by word' },
      { label: 'Answers', value: totals.answers, note: 'approved answers' },
      { label: 'Lessons', value: totals.lessons, note: 'questions and answers taught' },
      { label: 'Pending', value: totals.pending, note: 'questions waiting for a trainer' },
      { label: 'Vocabulary', value: totals.vocabulary, note: 'words the model can write with' },
    ];
  });

  protected readonly rows = computed<StoreRow[]>(() => {
    const store = this.summary();
    if (!store) return [];
    const loss = store.model.loss === null ? 'not measured yet' : store.model.loss.toFixed(3);
    return [
      {
        label: 'Model size',
        value: this.parameters(store.model.parameters),
        note: `weights · ${store.model.name}`,
      },
      {
        label: 'On disk',
        value: this.bytes(store.disk.learner_bytes),
        note: "the learner's own file",
      },
      {
        label: 'Vector store',
        value: this.bytes(store.disk.vector_store_bytes),
        note: 'the indexed passages',
      },
      {
        label: 'Uploads',
        value: this.bytes(store.disk.uploads_bytes),
        note: 'the files that were given',
      },
      {
        label: 'Corpus',
        value: `${store.model.corpus_sentences} sentences`,
        note: `${store.model.corpus_tokens} tokens`,
      },
      {
        label: 'Training',
        value: `${store.model.steps} steps`,
        note: `training loss ${loss}`,
      },
    ];
  });

  ngOnInit(): void {
    // The server has no session, so the store is read in the browser.
    if (!isPlatformBrowser(this.platformId)) return;
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.storeSummary().subscribe({
      next: (summary) => {
        this.summary.set(summary);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message);
        this.loading.set(false);
      },
    });
  }

  private bytes(value: number | undefined): string {
    const size = value ?? 0;
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  private parameters(value: number | undefined): string {
    const count = value ?? 0;
    if (count < 1000) return `${count}`;
    return `${(count / 1000000).toFixed(2)}M`;
  }
}
