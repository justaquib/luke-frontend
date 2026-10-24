import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { QueryHit } from '../core/api/api-models';
import { AppIcon } from '../shared/app-icon';
import { chatSourceLabel } from './chat-source-label';
import { ChatAnswerTrace } from './chat-answer-trace';
import type { ChatMessage } from './chat.types';

/** The record behind one assistant answer, and the writer's real reading of it. */
@Component({
  selector: 'app-chat-answer-details',
  standalone: true,
  imports: [RouterLink, AppIcon, ChatAnswerTrace],
  templateUrl: './chat-answer-details.html',
  styleUrl: './styles/chat-answer-details.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatAnswerDetails {
  readonly message = input.required<ChatMessage>();
  readonly question = input<string | null>(null);

  protected readonly sourceLabel = computed(
    () => chatSourceLabel(this.message().source) ?? 'Not recorded',
  );

  protected readonly answeredAt = computed(() =>
    this.message().timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  );

  protected readonly hits = computed<QueryHit[]>(() => this.message().hits ?? []);

  protected readonly matchedQuestion = computed(
    () => this.message().intent?.matched_question ?? '',
  );

  protected readonly matchDistance = computed<string | null>(() => {
    const distance = this.message().intent?.distance;
    return distance === undefined || distance === null ? null : distance.toFixed(2);
  });

  protected readonly liveLink = computed<{ href: string; title: string } | null>(() => {
    const message = this.message();
    if (message.source !== 'wiki') return null;
    const href = this.textValue('url');
    if (!href) return null;
    return { href, title: this.textValue('title') || 'source' };
  });

  protected readonly pendingId = computed<number | null>(() => this.message().pendingId ?? null);

  protected readonly hasDisabledSources = computed(
    () => !!this.message().disabledExternalSources?.length,
  );

  protected hitDistance(hit: QueryHit): string | null {
    return hit.distance === undefined || hit.distance === null ? null : hit.distance.toFixed(3);
  }

  private textValue(key: string): string {
    const value = this.message().app?.[key];
    return typeof value === 'string' ? value : '';
  }
}
