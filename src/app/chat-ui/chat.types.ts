import type {
  AnswerCitation,
  AnswerMode,
  QueryHit,
  QuerySource,
  QuestionUnderstanding,
} from '../core/api/api-models';

export type ChatRole = 'user' | 'assistant' | 'system' | 'tool';
export type ChatSource = QuerySource;

export interface ChatMessage {
  id: number;
  role: ChatRole;
  text: string;
  timestamp: Date;
  hits?: QueryHit[];
  source?: ChatSource;
  pendingId?: number;
  intent?: { matched_question?: string; distance?: number } | null;
  app?: Record<string, unknown> | null;
  disabledExternalSources?: string[] | null;
  understanding?: QuestionUnderstanding | null;
  /** The measured match distance the backend attached to this answer. */
  matchDistance?: number | null;
  /** The backend's confidence in the answer, when it measured one. */
  confidence?: number | null;
  /** The model that answered: `luke`, or an installed teacher's `hf:` id. */
  model?: string | null;
  modelName?: string | null;
  /** The version of the loaded checkpoint, when Luke wrote the answer. */
  modelVersion?: string | null;
  /** How the answer was produced: read, written, or written from passages. */
  mode?: AnswerMode;
  /** The numbered passages a composed answer cites. */
  citations?: AnswerCitation[];
  /** The measured writing speed, when the backend timed the generation. */
  tokensPerSecond?: number | null;
  /** True only for an answer that just arrived; reloaded messages never animate. */
  reveal?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}
