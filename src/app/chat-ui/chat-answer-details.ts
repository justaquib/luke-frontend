import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { QueryHit } from '../core/api/api-models';
import { AnswerPipeline } from '../shared/answer-pipeline';
import { hasTrace, traceFromUnderstanding } from '../shared/answer-trace';
import { AppIcon } from '../shared/app-icon';
import { AnswerPrediction } from './answer-prediction';
import { AnswerRecord } from './answer-record';
import type { ChatMessage } from './chat.types';

/** The record behind one assistant answer. */
@Component({
  selector: 'app-chat-answer-details',
  standalone: true,
  imports: [AnswerPipeline, AnswerPrediction, AnswerRecord, AppIcon],
  templateUrl: './chat-answer-details.html',
  styleUrl: './styles/chat-answer-details.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatAnswerDetails {
  readonly message = input.required<ChatMessage>();
  readonly question = input<string | null>(null);

  protected readonly hits = computed<QueryHit[]>(() => this.message().hits ?? []);

  protected readonly trace = computed(() => traceFromUnderstanding(this.message().understanding));

  protected readonly hasUnderstanding = computed(() => hasTrace(this.trace()));

  protected readonly grammarNotes = computed(
    () => this.message().understanding?.grammar_notes ?? [],
  );

  protected readonly verification = computed(
    () => this.message().understanding?.verification ?? '',
  );

  protected readonly liveLink = computed<{ href: string; title: string } | null>(() => {
    const message = this.message();
    if (message.source !== 'wiki') return null;
    const href = this.textValue('url');
    if (!href) return null;
    return { href, title: this.textValue('title') || 'source' };
  });

  protected hitDistance(hit: QueryHit): string | null {
    return hit.distance === undefined || hit.distance === null ? null : hit.distance.toFixed(3);
  }

  private textValue(key: string): string {
    const value = this.message().app?.[key];
    return typeof value === 'string' ? value : '';
  }
}
