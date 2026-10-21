export interface QueryHit {
  text: string;
  metadata: { source: string };
  distance: number | null;
}

export interface QueryResponse {
  question: string;
  source: 'faq' | 'docs' | 'pending' | 'intent' | 'weather' | 'wiki';
  answer: string;
  hits: QueryHit[];
  entities: { text: string; label: string }[];
  pending_id: number | null;
  intent?: {
    matched_question?: string;
    matched_faq_id?: number;
    distance?: number;
    answer?: string;
  } | null;
  app?: Record<string, unknown> | null;
  disabled_external_sources?: string[] | null;
}

export interface MergeMatch {
  pending_id: number;
  question: string;
  occurrences: number;
  distance: number;
}

export interface MergePreview {
  canonical_id: number;
  canonical_question: string;
  answer: string;
  matches: MergeMatch[];
}

export interface MergeResult {
  canonical_faq_id: number;
  created: number;
  resolved: number;
}

export interface IntentItem {
  id: number;
  name: string;
  response_template: string;
  faq_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface FaqSuggestion {
  faq_id: number;
  question: string;
  answer: string;
  status: string;
  distance: number;
}

export interface PendingSuggestionItem {
  pending_id: number;
  question: string;
  occurrences: number;
  distance: number;
}

export interface IntentSuggestions {
  query: string;
  faqs: FaqSuggestion[];
  pending: PendingSuggestionItem[];
}

export interface FaqMergePreview {
  canonical_id: number;
  canonical_question: string;
  canonical_answer: string;
  matches: FaqSuggestion[];
}

export interface FaqMergeResult {
  canonical_faq_id: number;
  absorbed: number;
  recreated: number;
}

export interface IngestRequest {
  source: string;
  text: string;
}

export interface IngestResponse {
  source: string;
  chunks: number;
  start_id: number | null;
}

export interface StatsResponse {
  chunks: number;
  faqs: number;
  pending: number;
}

export type FaqStatus = 'pending' | 'approved' | 'declined' | 'duplicate';

export interface FaqItem {
  id: number;
  question: string;
  answer: string;
  status: FaqStatus;
  created_at: string;
  updated_at: string;
}

export interface PendingItem {
  id: number;
  question: string;
  occurrences: number;
  resolved: boolean;
  created_at: string;
  last_seen_at: string;
}

export interface DocumentItem {
  source: string;
  chunks: number;
  created_at?: string;
}

export interface Tenant {
  id: number;
  name: string;
  slug: string;
  created_at: string;
}

export interface Invite {
  id: number;
  tenant_id: number;
  email: string;
  role: string;
  token: string;
  expires_at: string;
  used_at: string | null;
}
