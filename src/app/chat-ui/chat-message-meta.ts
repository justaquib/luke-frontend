import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppIcon } from '../shared/app-icon';
import type { ChatMessage, ChatSource } from './chat.types';

const SOURCE_LABELS: Record<ChatSource, string> = {
  faq: 'Trained',
  docs: 'Documents',
  pending: 'Awaiting',
  intent: 'Intent match',
  weather: 'Weather',
  wiki: 'Wikipedia',
  assistant_profile: 'Assistant profile',
  dictionary: 'Offline dictionary',
  learner: 'Curriculum',
  lesson_cards: 'Lesson',
  letters: 'Letters',
  not_learned: 'Not learned',
  number_cards: 'Number cards',
  sentence_examples: 'Sentence examples',
  sentence_patterns: 'Sentence patterns',
  taught: 'Taught lesson',
  trainer: 'Trained',
  word_cards: 'Word meanings',
  written: 'Written answer',
};

@Component({
  selector: 'app-chat-message-meta',
  standalone: true,
  imports: [AppIcon, RouterLink],
  templateUrl: './chat-message-meta.html',
  styleUrl: './styles/chat-message-meta.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatMessageMeta {
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
