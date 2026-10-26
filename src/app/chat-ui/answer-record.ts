import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { chatSourceLabel } from './chat-source-label';
import type { ChatMessage } from './chat.types';

/** The measured facts behind one answer, as a definition list. */
@Component({
  selector: 'app-answer-record',
  standalone: true,
  templateUrl: './answer-record.html',
  styleUrl: './styles/answer-record.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnswerRecord {
  readonly message = input.required<ChatMessage>();

  protected readonly sourceLabel = computed(
    () => chatSourceLabel(this.message().source) ?? 'Not recorded',
  );

  protected readonly answeredAt = computed(() =>
    this.message().timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  );

  protected readonly matchedQuestion = computed(
    () => this.message().intent?.matched_question ?? '',
  );

  protected readonly measuredDistance = computed<string | null>(() => {
    const value = this.message().matchDistance ?? this.message().intent?.distance;
    return value === undefined || value === null ? null : value.toFixed(2);
  });

  protected readonly measuredConfidence = computed<string | null>(() => {
    const value = this.message().confidence;
    return value === undefined || value === null ? null : `${Math.round(value * 100)}%`;
  });

  protected readonly modelName = computed(() => this.message().modelName ?? '');

  protected readonly pendingId = computed(() => this.message().pendingId ?? null);
}
