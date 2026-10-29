import type { FaqItem } from '../core/api/api-models';

export type TrainerTab = 'inbox' | 'faqs' | 'merge' | 'new' | 'documents' | 'base';
export type StatusFilter = 'all' | 'pending' | 'approved' | 'declined' | 'duplicate';

export interface DuplicateGroup {
  key: string;
  items: FaqItem[];
}

export interface IntentGroup {
  answerKey: string;
  canonical: FaqItem;
  aliases: FaqItem[];
}

export interface IntentInfo {
  canonicalId: number;
  variantCount: number;
  isAlias: boolean;
}
