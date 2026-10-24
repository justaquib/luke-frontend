import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export const ICON_NAMES = [
  'plus',
  'check',
  'x',
  'pencil',
  'trash',
  'merge',
  'inbox',
  'book',
  'file',
  'copy',
  'eye',
  'upload',
  'download',
  'refresh',
  'search',
  'arrow-right',
  'arrow-left',
  'send',
  'sliders',
  'external',
  'info',
  'alert',
  'thumb-up',
  'thumb-down',
  'pin',
  'play',
  'logout',
  'logo',
  'chevron-down',
  'chevron-up',
  'monitor',
  'sun',
  'moon',
  'sidebar',
  'sidebar-left',
  'menu',
  'palette',
  'layers',
  'grid',
  'shield',
  'maximize',
  'minimize',
] as const;

export type IconName = (typeof ICON_NAMES)[number];

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
}
