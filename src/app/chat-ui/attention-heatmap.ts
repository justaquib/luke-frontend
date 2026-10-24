import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

/** The average of every head, chosen when no single head is selected. */
const ALL_HEADS = -1;

/** The real attention of the writer, one layer and head at a time. */
@Component({
  selector: 'app-attention-heatmap',
  standalone: true,
  templateUrl: './attention-heatmap.html',
  styleUrl: './styles/attention-heatmap.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttentionHeatmap {
  readonly tokens = input.required<string[]>();
  readonly layers = input.required<number[][][][]>();
  readonly heads = input.required<number>();

  private readonly chosenLayer = signal<number | null>(null);
  protected readonly headIndex = signal(ALL_HEADS);

  protected readonly layerIndex = computed(() => {
    const layers = this.layers();
    if (layers.length === 0) {
      return 0;
    }
    const chosen = this.chosenLayer();
    return chosen === null ? layers.length - 1 : Math.min(chosen, layers.length - 1);
  });

  protected readonly layerNumbers = computed(() => this.layers().map((_, index) => index + 1));

  protected readonly headNumbers = computed(() =>
    Array.from({ length: this.heads() }, (_, index) => index + 1),
  );

  protected readonly matrix = computed(() => {
    const layer = this.layers()[this.layerIndex()] ?? [];
    const head = this.headIndex();
    return head === ALL_HEADS ? meanOfHeads(layer) : (layer[head] ?? []);
  });

  protected readonly strongest = computed<{
    row: string;
    column: string;
    weight: number;
  } | null>(() => {
    const tokens = this.tokens();
    let best = { row: '', column: '', weight: 0 };
    this.matrix().forEach((row, rowIndex) => {
      row.forEach((weight, columnIndex) => {
        if (weight > best.weight) {
          best = {
            row: tokens[rowIndex] ?? '',
            column: tokens[columnIndex] ?? '',
            weight,
          };
        }
      });
    });
    return best.weight > 0 ? best : null;
  });

  protected readonly caption = computed(() => {
    const head =
      this.headIndex() === ALL_HEADS ? 'all heads averaged' : `head ${this.headIndex() + 1}`;
    return `Attention of ${head}, layer ${this.layerIndex() + 1}. Rows are the tokens that look; columns are the tokens they look at.`;
  });

  protected chooseLayer(event: Event): void {
    this.chosenLayer.set(Number((event.target as HTMLSelectElement).value));
  }

  protected chooseHead(event: Event): void {
    this.headIndex.set(Number((event.target as HTMLSelectElement).value));
  }

  protected cellColour(weight: number): string {
    const share = Math.round(Math.min(1, Math.max(0, weight)) * 100);
    return `color-mix(in srgb, var(--accent) ${share}%, var(--surface-2))`;
  }

  protected cellLabel(row: string, column: string, weight: number): string {
    return `${row} looks at ${column}: weight ${weight.toFixed(3)}`;
  }
}

function meanOfHeads(layer: number[][][]): number[][] {
  if (layer.length === 0) {
    return [];
  }
  const rows = layer[0].length;
  const columns = layer[0][0]?.length ?? 0;
  const result = Array.from({ length: rows }, () => Array<number>(columns).fill(0));
  for (const head of layer) {
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        result[row][column] += head[row][column] / layer.length;
      }
    }
  }
  return result;
}
