import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ChatApiService, type QueryOptions } from '../core/api/chat-api.service';
import { BrowserService } from '../core/browser.service';
import { UiService } from '../shared/ui.service';
import { ChatSessionService } from './chat-session.service';
import type { ChatMessage } from './chat.types';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly api = inject(ChatApiService);
  private readonly ui = inject(UiService);
  private readonly session = inject(ChatSessionService);
  private readonly browser = inject(BrowserService);
  private readonly router = inject(Router);

  readonly isTyping = signal(false);
  readonly backendStatus = signal<'unknown' | 'online' | 'offline'>('unknown');
  readonly ratedMessages = signal<Record<number, boolean>>({});

  constructor() {
    this.checkBackend();
  }

  checkBackend(): void {
    this.api.health().subscribe({
      next: () => this.backendStatus.set('online'),
      error: () => this.backendStatus.set('offline'),
    });
  }

  send(text: string, options: QueryOptions): void {
    const question = text.trim();
    if (!question || this.isTyping()) {
      return;
    }
    this.session.appendMessage({
      id: this.session.nextMessageId(),
      role: 'user',
      text: question,
      timestamp: new Date(),
    });
    this.isTyping.set(true);
    this.api.query(question, 4, options).subscribe({
      next: (response) => {
        this.session.appendMessage({
          id: this.session.nextMessageId(),
          role: 'assistant',
          text: response.answer || 'No matching information found.',
          timestamp: new Date(),
          hits: response.hits ?? [],
          source: response.source,
          pendingId: response.pending_id ?? undefined,
          intent: response.intent ?? null,
          app: response.app ?? null,
          disabledExternalSources: response.disabled_external_sources ?? undefined,
        });
        this.isTyping.set(false);
        this.backendStatus.set('online');
        this.session.touchTitle(question);
      },
      error: (error: Error) => {
        this.session.appendMessage({
          id: this.session.nextMessageId(),
          role: 'system',
          text: error.message,
          timestamp: new Date(),
        });
        this.isTyping.set(false);
        this.backendStatus.set('offline');
      },
    });
  }

  copyMessage(message: ChatMessage): void {
    this.browser.copyText(message.text).then(
      () => this.ui.success('Copied to clipboard.'),
      () => this.ui.error('Copy failed.'),
    );
  }

  likeMessage(message: ChatMessage): void {
    if (this.ratedMessages()[message.id]) {
      return;
    }
    this.ratedMessages.update((map) => ({ ...map, [message.id]: true }));
    this.sendFeedback(message, 'like');
  }

  dislikeMessage(message: ChatMessage): void {
    if (this.ratedMessages()[message.id]) {
      return;
    }
    this.ratedMessages.update((map) => ({ ...map, [message.id]: true }));
    // The answer was wrong, so the trainer's parenting page takes the teaching.
    const question = this.session.findUserQuestion(message.id) ?? '';
    void this.router.navigate(['/dashboard/trainer'], {
      queryParams: { teach: question, answer: message.text },
    });
  }

  private sendFeedback(message: ChatMessage, rating: 'like' | 'dislike'): void {
    const question = this.session.findUserQuestion(message.id) ?? '';
    this.api
      .sendFeedback({
        message_id: message.id,
        question,
        answer: message.text,
        source: message.source ?? 'assistant',
        rating,
      })
      .subscribe({
        next: () => this.ui.success('Feedback recorded.'),
        error: (error: Error) => this.ui.error(error.message || 'Feedback failed.'),
      });
  }
}
