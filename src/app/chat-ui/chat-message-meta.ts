import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { chatSourceLabel } from './chat-source-label';
import type { ChatMessage } from './chat.types';

@Component({
  selector: 'app-chat-message-meta',
  standalone: true,
  templateUrl: './chat-message-meta.html',
  styleUrl: './styles/chat-message-meta.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatMessageMeta {
  readonly message = input.required<ChatMessage>();

  protected sourceLabel(): string | null {
    return chatSourceLabel(this.message().source);
  }

  /** The measured distance, preferring the backend's own value. */
  protected distance(): string | null {
    const value = this.message().matchDistance ?? this.message().intent?.distance;
    return value === undefined || value === null ? null : value.toFixed(2);
  }

  protected confidence(): string | null {
    const value = this.message().confidence;
    return value === undefined || value === null ? null : `${Math.round(value * 100)}%`;
  }

  protected modelName(): string | null {
    return this.message().modelName ?? null;
  }
}
