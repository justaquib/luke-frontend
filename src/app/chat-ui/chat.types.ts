import type { QueryHit, QuerySource, QuestionUnderstanding } from '../core/api/api-models';

export type ChatRole = 'user' | 'assistant' | 'system';
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
