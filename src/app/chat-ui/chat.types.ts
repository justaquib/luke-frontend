import type { QueryHit } from '../core/api/api-models';

export type ChatRole = 'user' | 'assistant' | 'system';
export type ChatSource = 'faq' | 'docs' | 'pending' | 'intent' | 'weather' | 'wiki';

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
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}
