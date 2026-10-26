import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import type { BrainEngineState, TrainingProgress } from '../core/api/language-brain.types';
import { engineStatus } from './brain-status';

/**
 * The engine row: what is trained, where it runs, and what it is learning
 * from. Every number here is read from a checkpoint, so a missing one says
 * so instead of showing a zero.
 */
@Component({
  selector: 'app-brain-engine',
  imports: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './brain-engine.html',
  styleUrl: './brain-engine.css',
})
export class BrainEngine {
  readonly engine = input<BrainEngineState | null>(null);
  readonly training = input(false);
  readonly progress = input<TrainingProgress | null>(null);

  protected readonly status = computed(() => engineStatus(this.engine(), this.training()).label);

  protected readonly statusClass = computed(
    () => engineStatus(this.engine(), this.training()).tone,
  );

  protected readonly lastTrained = computed<number | null>(() => {
    const engine = this.engine();
    return engine?.words.trained_at ?? null;
  });

  protected readonly checkpoint = computed(() => {
    const schema = this.engine()?.schema;
    return schema ? `v${schema}` : 'none';
  });

  protected readonly corpus = computed(() => {
    const corpus = this.engine()?.words.corpus;
    if (corpus?.sentences === undefined) return 'Not measured yet';
    const parts = [`${corpus.sentences} sentences`];
    if (corpus.instructions !== undefined) parts.push(`${corpus.instructions} requests`);
    return parts.join(' · ');
  });

  protected readonly weights = computed(() => {
    const memory = this.engine()?.memory;
    if (!memory) return 'Not measured yet';
    const bytes = memory.words_bytes ?? 0;
    if (!bytes) return 'No checkpoint yet';
    const size =
      bytes >= 1024 * 1024
        ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
        : `${Math.ceil(bytes / 1024)} KB`;
    return `${size} · ${memory.loaded ? 'loaded, mapped from disk' : 'on disk, not loaded'}`;
  });

  protected readonly steps = computed(() => {
    const progress = this.progress();
    if (!progress) return 'Starting…';
    const done = progress.steps_done ?? 0;
    const total = progress.steps_total ?? 0;
    if (!total) return 'Counting the material…';
    const eta = progress.eta_seconds;
    if (eta === null || eta === undefined) return `${done} of ${total} steps`;
    const left = eta < 60 ? `${Math.round(eta)}s` : `${Math.round(eta / 60)}m`;
    return `${done} of ${total} steps · ${left} left`;
  });

  protected mark(status: string | undefined): string {
    if (status === 'done') return '✓';
    if (status === 'working') return '…';
    return '·';
  }

  protected loss(value: number | null | undefined): string {
    if (value === null || value === undefined) return 'not measured yet';
    return value.toFixed(3);
  }
}
