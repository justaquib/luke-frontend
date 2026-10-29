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

  /** The date the quoted web page was fetched, so it is never read as fresh. */
  protected asOf(): string | null {
    const value = this.message().app?.['as_of'];
    return this.message().source === 'web' && typeof value === 'string' ? value : null;
  }

  protected modelName(): string | null {
    return this.message().modelName ?? null;
  }

  protected modelVersion(): string | null {
    return this.message().modelVersion ?? null;
  }

  protected citations(): string | null {
    const count = this.message().citations?.length ?? 0;
    return count ? `${count} ${count === 1 ? 'passage' : 'passages'}` : null;
  }

  protected tokensPerSecond(): string | null {
    const value = this.message().tokensPerSecond;
    return value === undefined || value === null ? null : value.toFixed(1);
  }

  /** What a written answer is, so it is never read as a taught one. */
  protected modeNote(): string | null {
    const mode = this.message().mode;
    if (mode === 'generated') {
      return 'Written from the base model, not from taught material. Unverified.';
    }
    if (mode === 'hybrid') {
      return 'Written from the numbered passages below and checked against them.';
    }
    return null;
  }
}
