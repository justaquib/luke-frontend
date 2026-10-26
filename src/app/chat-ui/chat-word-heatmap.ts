import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

interface HeatCell {
  row: number;
  column: number;
  title: string;
  heat: number;
}

/**
 * The attention the selected model measured over the words of a prefix, as a
 * grid: each row is the word looking, each column the word it looked at. The
 * colour is the measured weight, scaled to the strongest cell of this prefix.
 */
@Component({
  selector: 'app-word-heatmap',
  standalone: true,
  templateUrl: './chat-word-heatmap.html',
  styleUrl: './styles/chat-word-heatmap.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatWordHeatmap {
  readonly tokens = input.required<string[]>();
  readonly attention = input.required<number[][] | null>();

  protected readonly peak = computed(() => {
    let peak = 0;
    for (const row of this.attention() ?? []) {
      for (const value of row) peak = Math.max(peak, value);
    }
    return peak;
  });

  protected readonly rows = computed<HeatCell[][]>(() => {
    const tokens = this.tokens();
    const matrix = this.attention() ?? [];
    return tokens.map((_, row) =>
      tokens.map((__, column) => {
        const value = matrix[row]?.[column] ?? 0;
        const peak = this.peak();
        return {
          row,
          column,
          title: `${tokens[row]} saw ${tokens[column]}: ${value.toFixed(3)}`,
          heat: peak ? Math.round((value / peak) * 100) / 100 : 0,
        };
      }),
    );
  });

  protected readonly summary = computed(() => {
    const tokens = this.tokens();
    return tokens.length
      ? `Measured attention over ${tokens.length} tokens: rows are the word looking, columns the word it looked at.`
      : 'No attention was measured for this prefix.';
  });
}
