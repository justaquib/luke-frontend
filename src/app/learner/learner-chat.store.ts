import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import type { LanguagePreviewResponse } from '../core/api.service';
import type { AnswerStreamEvent, LanguagePreview } from '../core/api/api-models';
import { LanguageModelApiService } from '../core/api/language-model-api.service';
import {
  applyStreamEvent,
  emptyTrace,
  phaseFor,
  type AnswerTrace,
  type PipelinePhase,
} from '../shared/answer-trace';
import type { LearnerChatTurn } from './learner-chat-turn';
import { LearnerModelStore } from './learner-model.store';

type MatchCandidate = NonNullable<LanguagePreviewResponse['candidates']>[number];

interface LearnerMatchPrompt {
  question: string;
  candidates: NonNullable<LanguagePreviewResponse['candidates']>;
}

/** The conversation with the learner and the similar-question choice. */
@Injectable()
export class LearnerChatStore {
  private readonly api = inject(LanguageModelApiService);
  private readonly model = inject(LearnerModelStore);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly draft = signal('');
  readonly messages = signal<LearnerChatTurn[]>([]);
  readonly busy = signal(false);
  readonly pipeline = signal<AnswerTrace>(emptyTrace());
  readonly pipelinePhase = signal<PipelinePhase | null>(null);
  readonly matchPrompt = signal<LearnerMatchPrompt | null>(null);
  private controller?: AbortController;

  ask(): void {
    const question = this.draft().trim();
    if (!question || this.busy()) return;
    this.query(question);
  }

  clear(): void {
    this.messages.set([]);
  }

  private query(question: string, skipTrainer = false): void {
    this.busy.set(true);
    this.model.clearError();
    this.pipeline.set(emptyTrace());
    this.pipelinePhase.set('reading');
    this.controller = new AbortController();
    this.api
      .streamPreview(question, skipTrainer, this.controller.signal)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (event) => this.handleEvent(question, event),
        error: (error: Error) => this.fail(error.message),
        complete: () => {
          if (this.busy()) {
            this.fail('The answer stopped before it was finished. Please ask again.');
          }
        },
      });
  }

  private handleEvent(question: string, event: AnswerStreamEvent<LanguagePreview>): void {
    if (event.type === 'error') {
      this.fail(event.message);
      return;
    }
    if (event.type === 'answer') {
      const result = event.answer;
      if (result.needs_clarification && result.candidates?.length) {
        this.matchPrompt.set({ question, candidates: result.candidates });
      } else {
        this.addTurn({
          question,
          answer: result.answer,
          source: result.source,
          reasoning: result.reasoning ?? null,
          understanding: result.understanding ?? null,
          reveal: true,
        });
      }
      this.draft.set('');
      this.finishTurn();
      return;
    }
    const phase = phaseFor(event);
    if (phase) this.pipelinePhase.set(phase);
    this.pipeline.update((trace) => applyStreamEvent(trace, event));
  }

  private addTurn(turn: LearnerChatTurn): void {
    this.messages.update((messages) => [...messages, turn].slice(-30));
  }

  private fail(message: string): void {
    this.model.fail(message);
    this.finishTurn();
  }

  private finishTurn(): void {
    this.busy.set(false);
    this.controller = undefined;
    this.pipeline.set(emptyTrace());
    this.pipelinePhase.set(null);
  }

  chooseTrainerAnswer(candidate: MatchCandidate): void {
    const prompt = this.matchPrompt();
    if (!prompt) return;
    this.addTurn({ question: prompt.question, answer: candidate.answer, source: 'trainer' });
    this.matchPrompt.set(null);
  }

  askWithoutTrainer(): void {
    const prompt = this.matchPrompt();
    if (!prompt || this.busy()) return;
    this.matchPrompt.set(null);
    this.query(prompt.question, true);
  }

  reviewInTrainer(): void {
    this.matchPrompt.set(null);
    void this.router.navigate(['/dashboard/trainer'], { queryParams: { tab: 'merge' } });
  }
}
