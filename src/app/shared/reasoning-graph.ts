import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ReasoningEdge, ReasoningNode } from '../core/api.service';

interface GraphPoint {
  x: number;
  y: number;
}

/**
 * Draws the nodes the assistant visited while answering, with the question on
 * the left, the result on the right, and every candidate it recalled in
 * between.
 */
@Component({
  selector: 'app-reasoning-graph',
  standalone: true,
  templateUrl: './reasoning-graph.html',
  styleUrl: './reasoning-graph.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReasoningGraph {
  readonly nodes = input.required<ReasoningNode[]>();
  readonly edges = input.required<ReasoningEdge[]>();

  protected readonly candidates = computed(() =>
    this.nodes().filter((node) => node.type !== 'question' && node.type !== 'result'),
  );

  protected point(id: string): GraphPoint {
    const node = this.nodes().find((item) => item.id === id);
    if (!node) return { x: 0, y: 0 };
    if (node.type === 'question') return { x: 70, y: 170 };
    if (node.type === 'result') return { x: 630, y: 170 };
    const index = this.candidates().findIndex((item) => item.id === id);
    const count = Math.max(this.candidates().length - 1, 1);
    const step = 300 / count;
    return { x: 350, y: 20 + Math.max(index, 0) * step };
  }

  protected radius(node: ReasoningNode): number {
    if (node.type === 'question' || node.type === 'result') return 18;
    return 7 + Math.round(Math.max(0, Math.min(node.score, 1)) * 9);
  }

  protected truncate(label: string): string {
    const text = (label || '').trim();
    return text.length > 26 ? `${text.slice(0, 25)}…` : text;
  }
}
