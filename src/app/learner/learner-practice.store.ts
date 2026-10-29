import { inject, Injectable, signal } from '@angular/core';
import type {
  LanguageDictionaryEntry,
  LanguageDictionaryLearn,
  LanguageSentence,
} from '../core/api.service';
import { LanguageModelApiService } from '../core/api/language-model-api.service';
import { UiService } from '../shared/ui.service';
import { LearnerLessonsStore } from './learner-lessons.store';
import { LearnerModelStore } from './learner-model.store';

/** The offline dictionary, sentence building and small calculations. */
@Injectable()
export class LearnerPracticeStore {
  private readonly api = inject(LanguageModelApiService);
  private readonly model = inject(LearnerModelStore);
  private readonly lessons = inject(LearnerLessonsStore);
  private readonly ui = inject(UiService);

  readonly wordDraft = signal('');
  readonly wordEntry = signal<LanguageDictionaryEntry | null>(null);
  readonly wordLoading = signal(false);
  readonly wordSaving = signal(false);
  readonly definitionIndex = signal(0);
  readonly sentenceWords = signal('');
  readonly sentenceResult = signal<string | null>(null);
  readonly calculationDraft = signal('');
  readonly calculationResult = signal<string | null>(null);
  readonly busy = signal(false);

  lookupWord(): void {
    const word = this.wordDraft().trim();
    if (!word || this.wordLoading()) return;
    this.wordLoading.set(true);
    this.model.clearError();
    this.wordEntry.set(null);
    this.api.lookupDictionaryWord(word).subscribe({
      next: (entry: LanguageDictionaryEntry) => {
        this.wordEntry.set(entry);
        this.definitionIndex.set(0);
        this.wordLoading.set(false);
      },
      error: (error: Error) => {
        this.model.fail(error.message);
        this.wordLoading.set(false);
      },
    });
  }

  teachWord(): void {
    const entry = this.wordEntry();
    if (!entry || this.wordSaving()) return;
    const meaning = entry.definitions[this.definitionIndex()];
    if (!meaning) return;
    this.wordSaving.set(true);
    this.api.learnDictionaryWord(entry.word, meaning, this.lessons.teachingStage()).subscribe({
      next: (learned: LanguageDictionaryLearn) => {
        this.model.apply(learned.state);
        this.wordEntry.set(learned.entry);
        this.wordSaving.set(false);
        this.ui.success(`Learned “${learned.entry.word}” from the offline dictionary.`);
      },
      error: (error: Error) => {
        this.model.fail(error.message);
        this.wordSaving.set(false);
      },
    });
  }

  buildSentence(): void {
    if (this.busy()) return;
    const words = this.words(this.sentenceWords());
    if (!words.length) return;
    this.busy.set(true);
    this.sentenceResult.set(null);
    this.api.generateLanguageSentence(this.singleWord(words), words).subscribe({
      next: (result: LanguageSentence) => {
        this.sentenceResult.set(
          result.sentence ??
            'The learner could not build a sentence from those words yet. Try a word it has learned.',
        );
        this.busy.set(false);
      },
      error: (error: Error) => {
        this.model.fail(error.message);
        this.busy.set(false);
      },
    });
  }

  calculate(): void {
    if (this.busy()) return;
    const question = this.calculationDraft().trim();
    if (!question) return;
    this.busy.set(true);
    this.calculationResult.set(null);
    this.api.previewLanguageAnswer(question, true).subscribe({
      next: (result) => {
        this.calculationResult.set(result.answer);
        this.busy.set(false);
      },
      error: (error: Error) => {
        this.model.fail(error.message);
        this.busy.set(false);
      },
    });
  }

  private words(draft: string): string[] {
    return draft
      .trim()
      .split(/[\s,]+/)
      .map((word) => word.trim())
      .filter((word) => word.length > 0);
  }

  private singleWord(words: string[]): string | undefined {
    return words.length === 1 ? words[0] : undefined;
  }
}
