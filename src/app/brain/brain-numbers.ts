/** The helper numbers of the brain page, kept pure so the page stays small. */

import type { FaqItem } from '../core/api.service';

/** One canonical learned answer with the questions that say the same thing. */
export interface MergedIntentGroup {
  canonical: FaqItem;
  variants: FaqItem[];
}

/** The learned answers that repeat each other, strongest group first. */
export function mergedIntentGroups(faqs: FaqItem[]): MergedIntentGroup[] {
  const byAnswer = new Map<string, FaqItem[]>();
  for (const faq of faqs) {
    if (faq.status === 'declined' || faq.status === 'duplicate') continue;
    const key = faq.answer.trim().toLocaleLowerCase();
    if (!key) continue;
    const items = byAnswer.get(key) ?? [];
    items.push(faq);
    byAnswer.set(key, items);
  }

  return [...byAnswer.values()]
    .filter((items) => items.length > 1)
    .map((items) => {
      items.sort((a, b) => a.id - b.id);
      const canonical = items.find((item) => item.status === 'approved') ?? items[0];
      return { canonical, variants: items.filter((item) => item.id !== canonical.id) };
    })
    .sort((a, b) => b.variants.length - a.variants.length);
}

/** How many nodes the 3d brain lights up, from what it knows. */
export function brainNodeCount(knowledge: number, lessons: number, nodes: number): number {
  const activity = knowledge + lessons * 4;
  if (activity <= 0) return 0;
  return Math.min(nodes, Math.round(Math.log2(activity + 1) * 3.1));
}

/** The stage of the brain's growth this much knowledge sits at. */
export function stageIndexOf(count: number, stages: { minimum: number }[]): number {
  let index = 0;
  for (let position = 1; position < stages.length; position++) {
    if (count < stages[position].minimum) break;
    index = position;
  }
  return index;
}

/** What the trainer is told once the brain trained, from the report. */
export function trainingReportMessage(
  writer: { trained?: boolean; vocabulary?: number; steps?: number; loss?: number | null },
  before = 0,
): string {
  if (!writer?.trained) {
    return 'The brain trained, but it has no writer yet.';
  }
  const vocabulary = writer.vocabulary ?? 0;
  const change = vocabulary - before;
  const moved = change === 0 ? 'the same words' : `${change > 0 ? '+' : ''}${change} words`;
  return `The brain is trained: ${vocabulary} words (${moved}), ${writer.steps ?? 0} steps, loss ${Number(
    writer.loss ?? 0,
  ).toFixed(3)}.`;
}

/** What a node of the knowledge graph says when it is selected. */
export function graphNodeDetail(type: string, count?: number, grade?: string): string {
  return type === 'subject'
    ? `${count ?? 0} lesson${count === 1 ? '' : 's'} in this subject`
    : `Taught in ${grade ?? 'nursery'}`;
}
