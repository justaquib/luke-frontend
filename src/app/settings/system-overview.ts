import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SYSTEM_PACKAGES } from './system-overview.data';

/** The packages the product is built with, grouped by runtime or build time. */
@Component({
  selector: 'app-system-overview',
  standalone: true,
  templateUrl: './system-overview.html',
  styleUrl: './system-overview.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SystemOverview {
  protected readonly packages = SYSTEM_PACKAGES;
}
