import { Injectable } from '@angular/core';
import { type Observable } from 'rxjs';
import { BaseApiService } from './base-api.service';
import type {
  DuplicateLessons,
  KnowledgeGraph,
  LanguageBrainResponse,
  LanguageDictionaryEntry,
  LanguageDictionaryLearn,
  LanguageLevelTest,
  LanguageModelState,
  LanguagePreviewResponse,
  LanguageSentence,
  LanguageTestFinishResult,
  LanguageTestStart,
  LanguageTestState,
  LanguageWordPage,
  StoreSummary,
} from '../api.service';

/** What the brain has trained from, and how the training works. */
export interface TrainingSource {
  key: string;
  label: string;
  detail: string;
  items: number;
  words: number;
}

/** One step of the training, in the order the steps happen. */
export interface TrainingStep {
  title: string;
  detail: string;
}

/** The report the trainer reads beside the training button. */
export interface TrainingSources {
  sources: TrainingSource[];
  steps: TrainingStep[];
  totals: {
    items: number;
    words: number;
    sentences: number;
    requests: number;
  };
  model: {
    trained?: boolean;
    vocabulary?: number;
    steps?: number;
    loss?: number | null;
    device?: string;
  };
}

/** The kinds of lesson the learner can be taught. */
export type LessonKind = 'qa' | 'story';

/** What the brain knows about itself, as the training panel reads it. */
export interface BrainTrainingState {
  vocabulary?: number;
  training?: boolean;
  transformer?: {
    trained?: boolean;
    steps?: number;
    loss?: number | null;
    vocabulary?: number;
    device?: string;
  };
}

/** The answer the assistant is taught when it answered wrongly. */
export interface BrainCorrection {
  faq_id: number;
  question: string;
  answer: string;
  learned: boolean;
  answer_now: string;
  corrections: number;
}

/**
 * The calls of the language learner and the assistance brain. They live in
 * their own service so the learner pages do not grow with every new route.
 */
@Injectable({ providedIn: 'root' })
export class LanguageModelApiService extends BaseApiService {
  storeSummary(): Observable<StoreSummary> {
    return this.http.get<StoreSummary>(`${this.base}/language-model/store`, {
      headers: this.authHeaders(),
    });
  }

  languageModelState(prefix = ''): Observable<LanguageModelState> {
    return this.http.get<LanguageModelState>(`${this.base}/language-model/state`, {
      headers: this.authHeaders(),
      params: { prefix },
    });
  }

  languageModelWords(offset = 0, limit = 100): Observable<LanguageWordPage> {
    return this.http.get<LanguageWordPage>(`${this.base}/language-model/words`, {
      headers: this.authHeaders(),
      params: { offset, limit },
    });
  }

  languageModelGraph(subject = '', limit = 90): Observable<KnowledgeGraph> {
    return this.http.get<KnowledgeGraph>(`${this.base}/language-model/graph`, {
      headers: this.authHeaders(),
      params: { subject, limit },
    });
  }

  languageModelBrain(): Observable<LanguageBrainResponse> {
    return this.http.get<LanguageBrainResponse>(`${this.base}/language-model/brain`, {
      headers: this.authHeaders(),
    });
  }

  /** What the brain has trained from, and how the training works. */
  trainingSources(): Observable<TrainingSources> {
    return this.http.get<TrainingSources>(`${this.base}/language-model/brain/sources`, {
      headers: this.authHeaders(),
    });
  }

  /** Teach the assistant the right answer to a question it answered wrongly. */
  correctAnswer(
    question: string,
    wrongAnswer: string,
    correction: string,
  ): Observable<BrainCorrection> {
    return this.http.post<BrainCorrection>(
      `${this.base}/language-model/brain/correction`,
      { question, answer: wrongAnswer, correction },
      { headers: this.authHeaders() },
    );
  }

  trainLanguageModelBrain(): Observable<LanguageBrainResponse> {
    return this.http.post<LanguageBrainResponse>(
      `${this.base}/language-model/brain/train`,
      {},
      { headers: this.authHeaders() },
    );
  }

  testLanguageModelLevel(): Observable<LanguageLevelTest> {
    return this.http.post<LanguageLevelTest>(
      `${this.base}/language-model/brain/test`,
      {},
      { headers: this.authHeaders() },
    );
  }

  acceptDuplicateLessons(key: string): Observable<LanguageModelState> {
    return this.http.post<LanguageModelState>(
      `${this.base}/language-model/lessons/duplicates/accept`,
      { key },
      { headers: this.authHeaders() },
    );
  }

  duplicateLessons(stage = ''): Observable<DuplicateLessons> {
    return this.http.get<DuplicateLessons>(`${this.base}/language-model/lessons/duplicates`, {
      headers: this.authHeaders(),
      params: { stage },
    });
  }

  /**
   * Teach the learner a lesson. A lesson is a question and an answer, or a
   * story, a lesson or a topic that is taught as one passage.
   */
  teachLesson(
    lesson: string,
    stage: string,
    subject: string,
    kind: LessonKind = 'qa',
    title = '',
  ): Observable<LanguageModelState> {
    return this.http.post<LanguageModelState>(
      `${this.base}/language-model/lessons`,
      { lesson, stage, subject, kind, title },
      { headers: this.authHeaders() },
    );
  }

  updateLanguageLessonAnswer(
    id: string,
    answer: string,
    question?: string,
    confidence?: number,
    subject?: string,
  ): Observable<LanguageModelState> {
    return this.http.put<LanguageModelState>(
      `${this.base}/language-model/lessons/${id}`,
      { answer, question, confidence, subject },
      { headers: this.authHeaders() },
    );
  }

  removeLanguageLesson(id: string): Observable<LanguageModelState> {
    return this.http.delete<LanguageModelState>(`${this.base}/language-model/lessons/${id}`, {
      headers: this.authHeaders(),
    });
  }

  previewLanguageAnswer(
    question: string,
    skipTrainer = false,
  ): Observable<LanguagePreviewResponse> {
    return this.http.post<LanguagePreviewResponse>(
      `${this.base}/language-model/preview`,
      { question, skip_trainer: skipTrainer },
      { headers: this.authHeaders() },
    );
  }

  startLanguageTest(stage: string, kind: string): Observable<LanguageTestStart> {
    return this.http.post<LanguageTestStart>(
      `${this.base}/language-model/test/start`,
      { stage, kind },
      { headers: this.authHeaders() },
    );
  }

  askLanguageTestQuestion(question: string): Observable<LanguageTestState> {
    return this.http.post<LanguageTestState>(
      `${this.base}/language-model/test/question`,
      { question },
      { headers: this.authHeaders() },
    );
  }

  scoreLanguageTestAnswer(passed: boolean): Observable<LanguageTestState> {
    return this.http.post<LanguageTestState>(
      `${this.base}/language-model/test/score`,
      { passed },
      { headers: this.authHeaders() },
    );
  }

  finishLanguageTest(passed: boolean): Observable<LanguageTestFinishResult> {
    return this.http.post<LanguageTestFinishResult>(
      `${this.base}/language-model/test/finish`,
      { passed },
      { headers: this.authHeaders() },
    );
  }

  lookupDictionaryWord(word: string): Observable<LanguageDictionaryEntry> {
    return this.http.get<LanguageDictionaryEntry>(`${this.base}/language-model/dictionary`, {
      headers: this.authHeaders(),
      params: { word },
    });
  }

  learnDictionaryWord(
    word: string,
    meaning: string,
    stage: string,
  ): Observable<LanguageDictionaryLearn> {
    return this.http.post<LanguageDictionaryLearn>(
      `${this.base}/language-model/dictionary/learn`,
      { word, meaning, stage },
      { headers: this.authHeaders() },
    );
  }

  generateLanguageSentence(word?: string, words: string[] = []): Observable<LanguageSentence> {
    return this.http.post<LanguageSentence>(
      `${this.base}/language-model/sentence`,
      { word, words },
      { headers: this.authHeaders() },
    );
  }
}
