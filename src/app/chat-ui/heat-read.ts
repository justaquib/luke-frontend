import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { WordPrediction } from '../core/api/api-models';
import { AppIcon } from '../shared/app-icon';
import { ChatWordHeatmap } from './chat-word-heatmap';

/**
 * One measured read of a text: the model's attention over its words and the
 * words it predicts next. Each read can be opened in the prediction lab.
 */
@Component({
  selector: 'app-heat-read',
  standalone: true,
  imports: [AppIcon, ChatWordHeatmap],
  templateUrl: './heat-read.html',
  styleUrl: './styles/heat-read.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeatRead {
  readonly label = input.required<string>();
  readonly hint = input('');
  readonly modelName = input('The model');
  readonly prediction = input<WordPrediction | null>(null);
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly empty = input('There is no text to read.');
  readonly inspect = output<void>();
  readonly retry = output<void>();

  protected readonly shape = computed(() => {
    const current = this.prediction();
    if (!current?.layers && !current?.heads) return null;
    return `${current.layers ?? '?'} layers · ${current.heads ?? '?'} heads`;
  });

  protected percent(value: number): string {
    const percent = value * 100;
    if (percent >= 10) return `${Math.round(percent)}%`;
    if (percent >= 1) return `${percent.toFixed(1)}%`;
    return percent > 0 ? '<1%' : '0%';
  }
}
