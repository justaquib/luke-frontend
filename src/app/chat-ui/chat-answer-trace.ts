import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LanguageModelApiService } from '../core/api/language-model-api.service';
import type { AnswerTrace } from '../core/api/language-brain.types';
import { AttentionHeatmap } from './attention-heatmap';
import { chatSourceLabel } from './chat-source-label';
import type { ChatSource } from './chat.types';

/** The writer's measured reading of the question behind one answer. */
@Component({
  selector: 'app-chat-answer-trace',
  standalone: true,
  imports: [AttentionHeatmap],
  templateUrl: './chat-answer-trace.html',
  styleUrls: [
    './styles/chat-answer-trace.css',
    './styles/chat-answer-trace-readings.css',
    '../shared/controls.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatAnswerTrace {
  readonly question = input.required<string>();
  readonly source = input<ChatSource | undefined>(undefined);

  private readonly api = inject(LanguageModelApiService);
  private readonly destroyRef = inject(DestroyRef);
  private request = 0;

  protected readonly trace = signal<AnswerTrace | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');

  protected readonly routeCopy = computed(() => {
    const label = chatSourceLabel(this.source());
    if (!label) {
      return `The route of this answer was not recorded. The writer's real reading of the same question is measured below.`;
    }
    if (this.source() === 'written') {
      return `Served by ${label}. This route is the writer's own generation, one word at a time; its measured reading of the question is below.`;
    }
    return `Served by ${label}. The answer was not generated word by word; the writer's real reading of the same question is measured below for comparison.`;
  });

  protected readonly readingTokens = computed(() => this.trace()?.reading?.tokens ?? []);
  protected readonly embeddingTokens = computed(() => this.trace()?.embeddings?.tokens ?? []);
  protected readonly embeddingColumns = computed(() =>
    Array.from({ length: this.trace()?.embeddings?.preview ?? 0 }, (_, index) => index + 1),
  );
  protected readonly attentionTokens = computed(() => this.trace()?.attention?.tokens ?? []);
  protected readonly attentionLayers = computed(() => this.trace()?.attention?.layers ?? []);
  protected readonly headCount = computed(() => this.trace()?.model?.heads ?? 0);
  protected readonly nextChoice = computed(() => this.trace()?.next ?? null);
  protected readonly generation = computed(() => this.trace()?.generation ?? null);

  protected readonly writtenSteps = computed(() =>
    (this.trace()?.generation?.steps ?? []).filter((step) => !this.isMark(step.token)),
  );

  protected readonly modelFacts = computed<readonly { label: string; value: string }[]>(() => {
    const model = this.trace()?.model;
    if (!model) {
      return [];
    }
    return [
      { label: 'Layers', value: String(model.layers) },
      { label: 'Heads', value: String(model.heads) },
      { label: 'Width', value: `${model.d_model} dims` },
      { label: 'Context', value: `${model.context} tokens` },
      { label: 'Vocabulary', value: model.vocabulary.toLocaleString() },
      { label: 'Parameters', value: model.parameters.toLocaleString() },
      { label: 'Device', value: model.device },
    ];
  });

  protected readonly writtenText = computed(
    () => this.generation()?.text || 'The writer wrote nothing for this question.',
  );
  protected readonly writtenClass = computed(() =>
    this.generation()?.text ? 'written-text' : 'trace-note',
  );

  protected readonly stopCopy = computed(() => {
    const generation = this.trace()?.generation;
    if (!generation) {
      return '';
    }
    const ending =
      generation.stop === 'end' ? 'ended on the end mark' : 'stopped at the word limit';
    return `${generation.steps.length} choices, ${ending} in ${generation.seconds}s.`;
  });

  protected readonly closingCopy = computed(() => {
    if (this.source() === 'written') {
      return 'The writer produced this answer itself. The run above repeats its real choice loop on the question alone; any material the served answer read is not part of this trace.';
    }
    return 'The answer above came from a different route, so it was not written by this loop. The trace is the trained writer’s real reading of the same question — a measured comparison, not the path the answer took.';
  });

  constructor() {
    effect(() => {
      const question = this.question();
      this.load(question);
    });
  }

  protected retry(): void {
    this.load(this.question());
  }

  protected percent(value: number): string {
    return `${(value * 100).toFixed(value < 0.01 ? 2 : 1)}%`;
  }

  protected isMark(token: string): boolean {
    return token.startsWith('<') && token.endsWith('>');
  }

  private load(question: string): void {
    const request = ++this.request;
    this.loading.set(true);
    this.error.set('');
    this.trace.set(null);
    this.api
      .traceAnswer(question)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (trace) => {
          if (request !== this.request) {
            return;
          }
          this.trace.set(trace);
          this.loading.set(false);
        },
        error: (error: Error) => {
          if (request !== this.request) {
            return;
          }
          this.error.set(error.message);
          this.loading.set(false);
        },
      });
  }
}
