import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  computed,
  type OnInit,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AppShell } from '../../shared/app-shell';
import { PageInfoActions } from '../../shared/page-info-actions';
import { AppIcon } from '../../shared/app-icon';
import type { CoachingScaffold, CoachingTurn } from '../../core/api/api-models';
import { ParentingApiService } from '../../core/api/parenting-api.service';

/** One turn of the coaching chat: what the parent said and what the coach answered. */
export interface CoachingMessage {
  id: number;
  role: 'parent' | 'coach';
  text: string;
  timestamp: string;
  source: string | null;
  confidence: number | null;
}

/**
 * The coaching chat of the parenting module: the coach answers from the
 * lessons, reads its own grammar and sentences, and takes the corrections the
 * parent gives until it answers well.
 */
@Component({
  selector: 'app-parenting-chat',
  imports: [AppShell, PageInfoActions, AppIcon],
  templateUrl: './parenting-chat.html',
  styleUrl: './parenting-chat.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParentingChat implements OnInit {
  private readonly parentingApi = inject(ParentingApiService);
  private readonly platformId = inject(PLATFORM_ID);

  protected readonly messages = signal<CoachingMessage[]>([]);
  protected readonly draft = signal('');
  protected readonly isTyping = signal(false);
  protected readonly sessionId = signal<string | null>(null);
  protected readonly sessionStatus = signal('open');
  protected readonly turns = signal(0);
  protected readonly correctionsUsed = signal(0);
  protected readonly scaffoldsUsed = signal(0);
  protected readonly scaffold = signal<CoachingScaffold | null>(null);
  protected readonly awaitingCorrection = signal(false);
  protected readonly trainMode = signal(true);
  protected readonly statusLabel = computed(() => {
    switch (this.sessionStatus()) {
      case 'open':
        return 'Open';
      case 'needs_correction':
        return 'Needs correction';
      case 'escalated':
        return 'Escalated';
      default:
        return this.sessionStatus();
    }
  });

  private messageId = 0;

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.parentingApi.createCoachingSession().subscribe((session) => {
      this.sessionId.set(session.id);
      this.sessionStatus.set(session.status);
      this.turns.set(session.turns);
      this.correctionsUsed.set(session.corrections_used);
      this.scaffoldsUsed.set(session.scaffold_failures);
    });
  }

  protected toggleTrainMode(): void {
    this.trainMode.set(!this.trainMode());
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
    if (this.awaitingCorrection()) {
      this.submitCorrection(text);
      return;
    }
    this.appendMessage({
      id: this.nextMessageId(),
      role: 'parent',
      text,
      timestamp: new Date().toISOString(),
      source: null,
      confidence: null,
    });
    this.isTyping.set(true);
    this.awaitingCorrection.set(false);
    const sessionId = this.sessionId();
    if (!sessionId) {
      this.isTyping.set(false);
      return;
    }
    this.parentingApi.sendCoachingTurn(sessionId, text).subscribe({
      next: (turn) => this.handleTurn(turn),
      error: () => this.isTyping.set(false),
    });
  }

  protected submitCorrection(correction: string): void {
    const sessionId = this.sessionId();
    if (!sessionId || this.isTyping()) {
      return;
    }
    this.isTyping.set(true);
    this.parentingApi.sendCoachingCorrection(sessionId, correction).subscribe({
      next: (turn) => this.handleTurn(turn),
      error: () => this.isTyping.set(false),
    });
  }

  protected pickSuggestion(suggestion: string): void {
    this.submitCorrection(suggestion);
  }

  protected newSession(): void {
    this.parentingApi.createCoachingSession().subscribe((session) => {
      this.sessionId.set(session.id);
      this.sessionStatus.set(session.status);
      this.turns.set(session.turns);
      this.correctionsUsed.set(session.corrections_used);
      this.scaffoldsUsed.set(session.scaffold_failures);
      this.messages.set([]);
      this.scaffold.set(null);
      this.awaitingCorrection.set(false);
      this.isTyping.set(false);
    });
  }

  private handleTurn(turn: CoachingTurn): void {
    this.isTyping.set(false);
    if (turn.answer) {
      this.appendMessage({
        id: this.nextMessageId(),
        role: 'coach',
        text: turn.answer.text,
        timestamp: new Date().toISOString(),
        source: turn.answer.source,
        confidence: turn.answer.confidence,
      });
    }
    if (turn.scaffold && this.trainMode()) {
      this.scaffold.set(turn.scaffold);
      this.scaffoldsUsed.update((value) => value + 1);
      this.awaitingCorrection.set(true);
    } else {
      this.scaffold.set(null);
      this.awaitingCorrection.set(false);
    }
    this.sessionStatus.set(turn.status);
  }

  private appendMessage(message: CoachingMessage): void {
    this.messages.update((value) => [...value, message]);
  }

  private nextMessageId(): number {
    this.messageId += 1;
    return this.messageId;
  }
}
