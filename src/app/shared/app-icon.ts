import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ICONS, type IconName, type IconShape } from './app-icon-shapes';

export { ICON_NAMES, type IconName } from './app-icon-shapes';

/** One stroke icon from the product set, sized by the caller. */
@Component({
  selector: 'app-icon',
  standalone: true,
  templateUrl: './app-icon.html',
  styleUrl: './app-icon.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppIcon {
  readonly name = input.required<IconName>();
  readonly size = input(16);
  readonly shapes = computed<readonly IconShape[]>(() => ICONS[this.name()]);
}
