import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
  computed,
  type OnInit,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AppShell } from '../../shared/app-shell';
import { PageInfoActions } from '../../shared/page-info-actions';
import { AppIcon } from '../../shared/app-icon';
import { AnswerPipeline } from '../../shared/answer-pipeline';
import { AnswerReveal } from '../../shared/answer-reveal';
import {
  type AnswerTrace,
  type PipelinePhase,
  applyStreamEvent,
  emptyTrace,
  phaseFor,
} from '../../shared/answer-trace';
import type {
  AnswerStreamEvent,
  CoachingTurn,
  QuestionUnderstanding,
} from '../../core/api/api-models';
import { ParentingApiService } from '../../core/api/parenting-api.service';

/** One turn of the coaching chat: what the parent said and what the coach answered. */
export interface CoachingMessage {
  id: number;
  role: 'parent' | 'coach';
  text: string;
  timestamp: string;
  source: string | null;
  confidence: number | null;
  understanding?: QuestionUnderstanding | null;
  reveal?: boolean;
}

/**
 * The coaching chat of the parenting module: the coach answers from the
 * lessons the tenant taught.
 */
@Component({
  selector: 'app-parenting-chat',
  imports: [AnswerPipeline, AnswerReveal, AppShell, PageInfoActions, AppIcon],
  templateUrl: './parenting-chat.html',
  styleUrl: './parenting-chat.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParentingChat implements OnInit {
  private readonly parentingApi = inject(ParentingApiService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly messages = signal<CoachingMessage[]>([]);
  protected readonly draft = signal('');
  protected readonly isTyping = signal(false);
  protected readonly liveTrace = signal<AnswerTrace>(emptyTrace());
  protected readonly livePhase = signal<PipelinePhase | null>(null);
  protected readonly sessionId = signal<string | null>(null);
  protected readonly sessionStatus = signal('open');
  protected readonly turns = signal(0);
  protected readonly statusLabel = computed(() =>
    this.sessionStatus() === 'open' ? 'Open' : 'Answered',
  );

  private messageId = 0;
  private controller?: AbortController;

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.parentingApi.createCoachingSession().subscribe((session) => {
      this.sessionId.set(session.id);
      this.sessionStatus.set(session.status);
      this.turns.set(session.turns);
    });
  }

  protected onDraft(value: string): void {
    this.draft.set(value);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  protected send(): void {
    const text = this.draft().trim();
    if (!text || this.isTyping()) {
      return;
    }
    this.draft.set('');
    this.appendMessage({
      id: this.nextMessageId(),
      role: 'parent',
      text,
      timestamp: new Date().toISOString(),
      source: null,
      confidence: null,
    });
    const sessionId = this.sessionId();
    if (!sessionId) {
      return;
    }
    this.isTyping.set(true);
    this.liveTrace.set(emptyTrace());
    this.livePhase.set('reading');
    this.controller = new AbortController();
    this.parentingApi
      .streamCoachingTurn(sessionId, text, this.controller.signal)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (event) => this.handleEvent(event),
        error: () => this.fail(),
        complete: () => {
          if (this.isTyping()) {
            this.fail();
          }
        },
      });
  }

  protected newSession(): void {
    this.controller?.abort();
    this.parentingApi.createCoachingSession().subscribe((session) => {
      this.sessionId.set(session.id);
      this.sessionStatus.set(session.status);
      this.turns.set(session.turns);
      this.messages.set([]);
      this.isTyping.set(false);
      this.clearTrace();
    });
  }

  private handleEvent(event: AnswerStreamEvent<CoachingTurn>): void {
    if (event.type === 'error') {
      this.fail();
      return;
    }
    if (event.type === 'answer') {
      this.handleTurn(event.answer);
      return;
    }
    const phase = phaseFor(event);
    if (phase) {
      this.livePhase.set(phase);
    }
    this.liveTrace.update((trace) => applyStreamEvent(trace, event));
  }

  private handleTurn(turn: CoachingTurn): void {
    this.isTyping.set(false);
    this.clearTrace();
    this.controller = undefined;
    if (turn.answer) {
      this.appendMessage({
        id: this.nextMessageId(),
        role: 'coach',
        text: turn.answer.text,
        timestamp: new Date().toISOString(),
        source: turn.answer.source,
        confidence: turn.answer.confidence,
        understanding: turn.understanding ?? null,
        reveal: true,
      });
    }
    this.sessionStatus.set(turn.status);
  }

  private fail(): void {
    this.isTyping.set(false);
    this.clearTrace();
    this.controller = undefined;
  }

  private clearTrace(): void {
    this.liveTrace.set(emptyTrace());
    this.livePhase.set(null);
  }

  private appendMessage(message: CoachingMessage): void {
    this.messages.update((value) => [...value, message]);
  }

  private nextMessageId(): number {
    this.messageId += 1;
    return this.messageId;
  }
}
