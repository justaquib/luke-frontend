import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { AppIcon } from './app-icon';
import { AppModal } from './app-modal';

/**
 * A card heading whose explanation opens in the shared dialog, so the card
 * stays compact until the reader asks what it does.
 */
@Component({
  selector: 'app-card-info',
  standalone: true,
  imports: [AppIcon, AppModal],
  templateUrl: './app-card-info.html',
  styleUrls: ['./app-card-info.css', './controls.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppCardInfo {
  readonly label = input.required<string>();
  readonly text = input.required<string>();
  protected readonly open = signal(false);
  protected readonly actionLabel = computed(() => `Show info about ${this.label()}`);

  protected show(): void {
    this.open.set(true);
  }

  protected hide(): void {
    this.open.set(false);
  }
}
