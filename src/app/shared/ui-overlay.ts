import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AppModal } from './app-modal';
import { UiService } from './ui.service';

/** The global confirmation host. Messages are raised through AppToasts. */
@Component({
  selector: 'app-ui-overlay',
  standalone: true,
  imports: [AppModal],
  templateUrl: './ui-overlay.html',
  styleUrls: ['./ui-overlay.css', './controls.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiOverlay {
  protected readonly ui = inject(UiService);

  protected ok(): void {
    this.ui.resolveConfirm(true);
  }

  protected cancel(): void {
    this.ui.resolveConfirm(false);
  }
}
