import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import type { Subscription } from 'rxjs';
import type { AnswerStreamEvent, QueryResponse } from '../core/api/api-models';
import { AnswerStreamService } from '../core/api/answer-stream.service';
import { ChatApiService, type QueryOptions } from '../core/api/chat-api.service';
import { BrowserService } from '../core/browser.service';
import { IntegrationsService } from '../core/integrations.service';
import { ToolsService, type ToolExecuteRequest } from '../core/tools.service';
import { VoiceService } from '../core/voice.service';
import {
  type AnswerTrace,
  type PipelinePhase,
  applyStreamEvent,
  emptyTrace,
  phaseFor,
} from '../shared/answer-trace';
import { UiService } from '../shared/ui.service';
import { ChatSessionService } from './chat-session.service';
import type { ChatMessage } from './chat.types';

const STOPPED = 'The answer stopped before it was finished. Please ask again.';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly api = inject(ChatApiService);
  private readonly streams = inject(AnswerStreamService);
  private readonly ui = inject(UiService);
  private readonly session = inject(ChatSessionService);
  private readonly browser = inject(BrowserService);
  private readonly router = inject(Router);
  private readonly integrations = inject(IntegrationsService);
  private readonly tools = inject(ToolsService);
  private readonly voice = inject(VoiceService);

  readonly isTyping = signal(false);
  readonly backendStatus = signal<'unknown' | 'online' | 'offline'>('unknown');
  readonly ratedMessages = signal<Record<number, boolean>>({});
  readonly liveTrace = signal<AnswerTrace>(emptyTrace());
  readonly livePhase = signal<PipelinePhase | null>(null);
  /** The answer as it is written, so a generated answer appears word by word. */
  readonly liveText = signal('');

  private subscription?: Subscription;
  private controller?: AbortController;

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
    const history = this.integrations.contextEnabled() ? this.session.recentTurns() : [];
    this.session.appendMessage({
      id: this.session.nextMessageId(),
      role: 'user',
      text: question,
      timestamp: new Date(),
    });
    this.startStream(question, { ...options, history });
  }

  executeTool(request: ToolExecuteRequest): void {
    if (this.isTyping()) {
      return;
    }
    this.isTyping.set(true);
    this.tools.executeTool(request).subscribe({
      next: (result) => {
        const toolMessage: ChatMessage = {
          id: this.session.nextMessageId(),
          role: 'tool',
          text: JSON.stringify(result.output ?? result.error ?? 'Tool executed'),
          timestamp: new Date(),
        };
        this.session.appendMessage(toolMessage);
        this.isTyping.set(false);
        if (result.status === 'succeeded') {
          this.ui.success(`Tool ${request.tool} executed successfully`);
        } else if (result.status === 'awaiting_confirmation') {
          this.ui.info(`Tool ${request.tool} requires confirmation`);
        } else {
          this.ui.error(`Tool ${request.tool} failed: ${result.error}`);
        }
      },
      error: (err: { error?: { detail?: string }; message?: string }) => {
        this.isTyping.set(false);
        this.ui.error(
          `Tool execution failed: ${err.error?.detail || err.message || 'Unknown error'}`,
        );
      },
    });
  }

  /** Stops the live answer, if one is streaming; the page is closing. */
  stop(): void {
    this.isTyping.set(false);
    this.clearTrace();
    this.subscription?.unsubscribe();
    this.subscription = undefined;
    this.controller = undefined;
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

  private startStream(question: string, options: QueryOptions): void {
    this.isTyping.set(true);
    this.liveTrace.set(emptyTrace());
    this.livePhase.set('reading');
    this.liveText.set('');
    const controller = new AbortController();
    this.controller = controller;
    this.subscription = this.streams
      .streamQuery(question, 4, options, controller.signal)
      .subscribe({
        next: (event) => this.handleEvent(question, event),
        error: (error: Error) => this.fail(error.message || STOPPED),
        complete: () => this.finishStream(),
      });
  }

  private handleEvent(question: string, event: AnswerStreamEvent<QueryResponse>): void {
    if (event.type === 'error') {
      this.fail(event.message);
      return;
    }
    if (event.type === 'answer') {
      this.appendAnswer(question, event.answer);
      return;
    }
    if (event.type === 'token') {
      this.liveText.update((text) => text + event.text);
      return;
    }
    const phase = phaseFor(event);
    if (phase) {
      this.livePhase.set(phase);
    }
    this.liveTrace.update((trace) => applyStreamEvent(trace, event));
  }

  private appendAnswer(question: string, response: QueryResponse): void {
    const message = this.answerMessage(response);
    this.session.appendMessage(message);
    this.isTyping.set(false);
    this.clearTrace();
    this.backendStatus.set('online');
    this.session.touchTitle(question);

    if (this.voice.enabled()) {
      void this.voice.speak(message.text);
    }
  }

  private answerMessage(response: QueryResponse): ChatMessage {
    return {
      id: this.session.nextMessageId(),
      role: 'assistant',
      text: response.answer || 'No matching information found.',
      timestamp: new Date(),
      hits: response.hits,
      source: response.source,
      pendingId: response.pending_id ?? undefined,
      intent: response.intent ?? null,
      app: response.app ?? null,
      disabledExternalSources: response.disabled_external_sources,
      understanding: response.understanding ?? null,
      matchDistance: response.distance,
      confidence: response.confidence,
      model: response.model,
      modelName: response.model_name,
      modelVersion: response.model_version ?? null,
      mode: response.mode ?? 'retrieved',
      citations: response.citations ?? [],
      tokensPerSecond: response.tokens_per_second ?? null,
      reveal: true,
    };
  }

  /** The stream ended without a normal `answer`; say so once. */
  private finishStream(): void {
    this.subscription = undefined;
    this.controller = undefined;
    if (this.isTyping()) {
      this.fail(STOPPED);
    }
  }

  private fail(message: string): void {
    const wasAnswering = this.isTyping();
    this.isTyping.set(false);
    this.clearTrace();
    this.subscription = undefined;
    this.controller = undefined;
    if (!wasAnswering) {
      return;
    }
    this.session.appendMessage({
      id: this.session.nextMessageId(),
      role: 'system',
      text: message,
      timestamp: new Date(),
    });
    this.backendStatus.set('offline');
  }

  private clearTrace(): void {
    this.liveTrace.set(emptyTrace());
    this.livePhase.set(null);
    this.liveText.set('');
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
