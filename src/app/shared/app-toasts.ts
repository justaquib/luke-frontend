import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AppIcon, type IconName } from './app-icon';
import { UiService, type ToastKind } from './ui.service';

/** The one toast region of the app. Every view raises messages through UiService. */
@Component({
  selector: 'app-toasts',
  standalone: true,
  imports: [AppIcon],
  templateUrl: './app-toasts.html',
  styleUrl: './app-toasts.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppToasts {
  protected readonly ui = inject(UiService);

  protected iconFor(kind: ToastKind): IconName {
    switch (kind) {
      case 'success':
        return 'check';
      case 'error':
        return 'alert';
      case 'info':
        return 'info';
    }
  }
}
