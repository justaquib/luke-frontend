import { Component, computed, input } from '@angular/core';
import { ReasoningEdge, ReasoningNode } from '../core/api.service';

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
  template: `
    <svg
      class="reasoning-graph"
      viewBox="0 0 700 340"
      role="img"
      aria-label="Nodes the assistant visited while answering"
    >
      @for (edge of edges(); track edge.source + edge.target + edge.label) {
        <line
          class="graph-edge"
          [attr.x1]="point(edge.source).x"
          [attr.y1]="point(edge.source).y"
          [attr.x2]="point(edge.target).x"
          [attr.y2]="point(edge.target).y"
        />
        <text
          class="graph-edge-label"
          [attr.x]="(point(edge.source).x + point(edge.target).x) / 2"
          [attr.y]="(point(edge.source).y + point(edge.target).y) / 2 - 5"
        >
          {{ edge.label }}
        </text>
      }
      @for (node of nodes(); track node.id) {
        <g class="graph-node" [attr.data-type]="node.type">
          <circle
            [attr.cx]="point(node.id).x"
            [attr.cy]="point(node.id).y"
            [attr.r]="radius(node)"
          />
          <text
            class="graph-node-label"
            [attr.x]="point(node.id).x"
            [attr.y]="point(node.id).y + radius(node) + 13"
          >
            {{ truncate(node.label) }}
          </text>
        </g>
      }
    </svg>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .reasoning-graph {
        width: 100%;
        height: auto;
        overflow: visible;
      }
      .graph-edge {
        stroke: rgba(148, 163, 184, 0.34);
        stroke-width: 1.2;
        stroke-dasharray: 4 4;
      }
      .graph-edge-label {
        fill: #64748b;
        font-size: 9px;
        text-anchor: middle;
      }
      .graph-node circle {
        fill: #1e293b;
        stroke: #818cf8;
        stroke-width: 1.6;
      }
      .graph-node[data-type='question'] circle {
        fill: #312e81;
        stroke: #a5b4fc;
        stroke-width: 2.4;
      }
      .graph-node[data-type='result'] circle {
        fill: #134e4a;
        stroke: #5eead4;
        stroke-width: 2.4;
      }
      .graph-node[data-type='lesson'] circle {
        fill: #1e3a5f;
        stroke: #7dd3fc;
      }
      .graph-node[data-type='trained_answer'] circle {
        fill: #14532d;
        stroke: #86efac;
      }
      .graph-node[data-type='document'] circle {
        fill: #3b2f63;
        stroke: #d8b4fe;
      }
      .graph-node-label {
        fill: #cbd5e1;
        font-size: 10px;
        text-anchor: middle;
      }
    `,
  ],
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
