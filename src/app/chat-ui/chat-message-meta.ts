import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { ChatService } from './chat.service';
import type { ChatMessage, ChatSource } from './chat.types';

const SOURCE_LABELS: Record<ChatSource, string> = {
  faq: 'Trained',
  docs: 'Documents',
  pending: 'Awaiting',
  intent: 'Intent match',
  weather: 'Weather',
  wiki: 'Wikipedia',
};

@Component({
  selector: 'app-chat-message-meta',
  standalone: true,
  templateUrl: './chat-message-meta.html',
  styleUrls: [
    './styles/chat-1.css',
    './styles/chat-2.css',
    './styles/chat-3.css',
    './styles/chat-4.css',
    './styles/chat-5.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatMessageMeta {
  protected readonly service = inject(ChatService);
  readonly message = input.required<ChatMessage>();

  protected sourceLabel(): string | null {
    const source = this.message().source;
    return source ? SOURCE_LABELS[source] : null;
  }

  protected showIntentNote(): boolean {
    const message = this.message();
    return message.source === 'intent' && !!message.intent?.matched_question;
  }

  protected showWikiNote(): boolean {
    return this.message().source === 'wiki' && !!this.stringValue('url');
  }

  protected hasHits(): boolean {
    return !!this.message().hits?.length;
  }

  protected hasDisabledSources(): boolean {
    return !!this.message().disabledExternalSources?.length;
  }

  protected canEdit(): boolean {
    const message = this.message();
    return (
      message.role === 'assistant' &&
      message.source !== 'faq' &&
      message.source !== 'weather' &&
      message.source !== 'wiki' &&
      !message.disabledExternalSources?.length
    );
  }

  protected stringValue(key: string): string {
    const value = this.message().app?.[key];
    return typeof value === 'string' ? value : '';
  }

  protected hasDistance(): boolean {
    return (
      this.message().intent?.distance !== undefined && this.message().intent?.distance !== null
    );
  }

  protected distanceText(): string {
    return (this.message().intent?.distance ?? 0).toFixed(2);
  }
}
