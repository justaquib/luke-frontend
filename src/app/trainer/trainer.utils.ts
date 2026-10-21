import type { FaqItem } from '../core/api/api-models';
import type { DuplicateGroup, IntentGroup, IntentInfo, StatusFilter } from './trainer.types';

export function normalizeQuestion(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isDuplicateFaq(faq: FaqItem, all: FaqItem[]): boolean {
  const key = normalizeQuestion(faq.question);
  if (!key) {
    return false;
  }
  let count = 0;
  for (const other of all) {
    if (normalizeQuestion(other.question) === key) {
      count++;
    }
    if (count > 1) {
      return true;
    }
  }
  return false;
}

export function filterFaqs(
  faqs: FaqItem[],
  query: string,
  status: StatusFilter,
  duplicatesOnly: boolean,
): FaqItem[] {
  const normalized = query.trim().toLowerCase();
  const byStatus = faqs.filter((faq) => status === 'all' || faq.status === status);
  if (!normalized && !duplicatesOnly) {
    return byStatus;
  }
  return byStatus.filter((faq) => {
    const matchesQuery =
      !normalized ||
      faq.question.toLowerCase().includes(normalized) ||
      faq.answer.toLowerCase().includes(normalized);
    const inDuplicateGroup = !duplicatesOnly || isDuplicateFaq(faq, faqs);
    return matchesQuery && inDuplicateGroup;
  });
}

export function buildDuplicateGroups(faqs: FaqItem[]): DuplicateGroup[] {
  const groups = new Map<string, FaqItem[]>();
  for (const faq of faqs) {
    const key = normalizeQuestion(faq.question);
    if (!key) {
      continue;
    }
    const list = groups.get(key) ?? [];
    list.push(faq);
    groups.set(key, list);
  }
  return [...groups.entries()]
    .filter(([, items]) => items.length > 1)
    .map(([key, items]) => ({
      key,
      items: items.sort((a, b) => a.id - b.id),
    }));
}

export function countStatuses(faqs: FaqItem[]): Record<StatusFilter, number> {
  const counts: Record<StatusFilter, number> = {
    all: 0,
    pending: 0,
    approved: 0,
    declined: 0,
    duplicate: 0,
  };
  for (const faq of faqs) {
    counts.all++;
    counts[faq.status]++;
  }
  return counts;
}

export function buildIntentGroups(faqs: FaqItem[]): IntentGroup[] {
  const groups = new Map<string, FaqItem[]>();
  for (const faq of faqs) {
    if (faq.status === 'declined' || faq.status === 'duplicate') {
      continue;
    }
    const key = (faq.answer || '').trim().toLowerCase();
    if (!key) {
      continue;
    }
    const list = groups.get(key) ?? [];
    list.push(faq);
    groups.set(key, list);
  }
  const result: IntentGroup[] = [];
  for (const [answerKey, items] of groups) {
    if (items.length < 2) {
      continue;
    }
    items.sort((a, b) => a.id - b.id);
    const canonical = items.find((faq) => faq.status === 'approved') ?? items[0];
    result.push({
      answerKey,
      canonical,
      aliases: items.filter((faq) => faq.id !== canonical.id),
    });
  }
  result.sort((a, b) => b.aliases.length - a.aliases.length);
  return result;
}

export function buildIntentInfo(groups: IntentGroup[]): Map<number, IntentInfo> {
  const map = new Map<number, IntentInfo>();
  for (const group of groups) {
    const variantCount = group.aliases.length + 1;
    map.set(group.canonical.id, {
      canonicalId: group.canonical.id,
      variantCount,
      isAlias: false,
    });
    for (const alias of group.aliases) {
      map.set(alias.id, {
        canonicalId: group.canonical.id,
        variantCount,
        isAlias: true,
      });
    }
  }
  return map;
}

export function omitKey<T>(record: Record<number, T>, key: number): Record<number, T> {
  const next = { ...record };
  delete next[key];
  return next;
}
