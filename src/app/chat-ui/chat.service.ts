import { Injectable, inject, signal } from '@angular/core';
import { ChatApiService, type QueryOptions } from '../core/api/chat-api.service';
import { TrainerApiService } from '../core/api/trainer-api.service';
import { BrowserService } from '../core/browser.service';
import { UiService } from '../shared/ui.service';
import { ChatSessionService } from './chat-session.service';
import type { ChatMessage } from './chat.types';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly api = inject(ChatApiService);
  private readonly trainerApi = inject(TrainerApiService);
  private readonly ui = inject(UiService);
  private readonly session = inject(ChatSessionService);
  private readonly browser = inject(BrowserService);

  readonly isTyping = signal(false);
  readonly backendStatus = signal<'unknown' | 'online' | 'offline'>('unknown');
  readonly ratedMessages = signal<Record<number, boolean>>({});
  readonly editingId = signal<number | null>(null);
  readonly editingText = signal('');

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

  startEditMessage(message: ChatMessage): void {
    this.editingId.set(message.id);
    this.editingText.set(message.text);
  }

  cancelEditMessage(): void {
    this.editingId.set(null);
    this.editingText.set('');
  }

  saveEditMessage(message: ChatMessage): void {
    if (this.editingId() !== message.id) {
      return;
    }
    const answer = this.editingText().trim();
    if (!answer) {
      return;
    }

    this.isTyping.set(true);
    if (message.source === 'pending' && message.pendingId) {
      this.trainerApi.answerPending(message.pendingId, answer).subscribe({
        next: () => {
          this.session.updateMessage(message.id, (item) => ({
            ...item,
            text: answer,
            source: 'faq',
            pendingId: undefined,
          }));
          this.finishEdit('Answer saved and trained.');
        },
        error: (error: Error) => {
          this.ui.error(error.message);
          this.isTyping.set(false);
        },
      });
      return;
    }

    const question = this.session.findUserQuestion(message.id);
    if (!question) {
      this.ui.error('Could not find the original question.');
      this.isTyping.set(false);
      return;
    }
    this.trainerApi.createFaq(question, answer).subscribe({
      next: () => {
        this.session.updateMessage(message.id, (item) => ({
          ...item,
          text: answer,
          source: 'faq',
        }));
        this.finishEdit('New Q&A created as pending.');
      },
      error: (error: Error) => {
        this.ui.error(error.message);
        this.isTyping.set(false);
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
    this.sendFeedback(message, 'dislike');
  }

  private finishEdit(notice: string): void {
    this.editingId.set(null);
    this.editingText.set('');
    this.isTyping.set(false);
    this.ui.success(notice);
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
