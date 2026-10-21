import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  type OnInit,
  output,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import {
  LanguageModelApiService,
  type TrainingSources,
} from '../core/api/language-model-api.service';

/**
 * The panel that says what the brain has trained from and how the training
 * works. It is opened from the small info button beside the training button.
 */
@Component({
  selector: 'app-brain-training-panel',
  standalone: true,
  templateUrl: './brain-training-panel.html',
  styleUrl: './brain-training-panel.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrainTrainingPanel implements OnInit {
  private readonly api = inject(LanguageModelApiService);
  private readonly platformId = inject(PLATFORM_ID);

  /** Raised when the trainer closes the panel. */
  readonly closed = output<void>();

  protected readonly report = signal<TrainingSources | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    // The server has no session, so the report is read in the browser.
    if (!isPlatformBrowser(this.platformId)) return;
    this.load();
  }

  /** Read the material the training uses. */
  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.trainingSources().subscribe({
      next: (report) => {
        this.report.set(report);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message);
        this.loading.set(false);
      },
    });
  }
}
