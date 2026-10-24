import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  signal,
  type OnInit,
} from '@angular/core';
import { ModelSettingsService } from '../core/model-settings.service';
import { AppCardInfo } from '../shared/app-card-info';
import { UiService } from '../shared/ui.service';
import { AppIcon } from '../shared/app-icon';

/**
 * The identity of the model: the name it answers to and the version it starts
 * from. The name reaches the shell, the chat and the answers the model gives
 * about itself; the starting version is the floor of its displayed level.
 */
@Component({
  selector: 'app-model-identity',
  standalone: true,
  imports: [AppCardInfo, AppIcon],
  templateUrl: './model-identity.html',
  styleUrls: ['./model-identity.css', '../shared/controls.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModelIdentity implements OnInit {
  protected readonly settings = inject(ModelSettingsService);
  private readonly ui = inject(UiService);
  private readonly platformId = inject(PLATFORM_ID);

  protected readonly name = signal('');
  protected readonly startLevel = signal('0.0.0');
  private readonly formReady = signal(false);

  protected readonly canSave = computed(
    () =>
      !this.settings.saving() &&
      this.name().trim().length > 0 &&
      this.settings.versions().length > 0,
  );

  constructor() {
    effect(() => {
      const settings = this.settings.settings();
      if (!settings || this.formReady()) return;
      this.name.set(settings.name);
      this.startLevel.set(settings.start_level);
      this.formReady.set(true);
    });
  }

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.settings.load();
  }

  protected setName(value: string): void {
    this.name.set(value);
  }

  protected setStartLevel(value: string): void {
    this.startLevel.set(value);
  }

  protected save(): void {
    const name = this.name().trim();
    if (!name) {
      this.ui.error('Give the model a name before saving.');
      return;
    }
    this.settings.save(name, this.startLevel()).subscribe({
      next: (settings) =>
        this.ui.success(
          `Model saved as ${settings.name}, starting at version ${settings.start_level}.`,
        ),
      error: (err: Error) => this.ui.error(err.message),
    });
  }
}
