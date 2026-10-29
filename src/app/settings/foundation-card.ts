import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  computed,
  inject,
  signal,
  type OnInit,
} from '@angular/core';
import {
  FoundationApiService,
  type FoundationIdentityRecord,
  type FoundationStatus,
} from '../core/api/foundation-api.service';
import { AppCardInfo } from '../shared/app-card-info';

interface FoundationRow {
  label: string;
  value: string;
}

const MEGABYTE = 1024 * 1024;

/**
 * The pinned checkpoint Luke is built on: what the files on disk say it is,
 * and whether this process has it loaded. Every number is read from the
 * backend's measurement, never typed here.
 */
@Component({
  selector: 'app-foundation-card',
  standalone: true,
  imports: [AppCardInfo],
  templateUrl: './foundation-card.html',
  styleUrls: ['./foundation-card.css', '../shared/controls.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FoundationCard implements OnInit {
  private readonly api = inject(FoundationApiService);
  private readonly platformId = inject(PLATFORM_ID);

  protected readonly status = signal<FoundationStatus | null>(null);
  protected readonly requestError = signal<string | null>(null);

  protected readonly rows = computed<readonly FoundationRow[]>(() => {
    const current = this.status();
    const identity = current?.identity;
    if (!current || !identity) return [];
    return [
      { label: 'Base model', value: identity.base_model },
      { label: 'Revision', value: identity.revision },
      { label: 'Licence', value: identity.license },
      { label: 'Parameters', value: identity.parameters.toLocaleString('en-US') },
      { label: 'Context', value: `${identity.context_limit.toLocaleString('en-US')} tokens` },
      { label: 'Weights', value: this.weightLine(identity) },
      { label: 'State', value: this.stateLine(current) },
      { label: 'Runtime memory', value: this.memoryLine(current) },
    ];
  });

  ngOnInit(): void {
    // The server has no session, so the checkpoint is measured in the browser.
    if (!isPlatformBrowser(this.platformId)) return;
    this.load();
  }

  protected load(): void {
    this.requestError.set(null);
    this.api.status().subscribe({
      next: (status) => this.status.set(status),
      error: (error: Error) => {
        this.status.set(null);
        this.requestError.set(error.message);
      },
    });
  }

  protected display(): string {
    return this.status()?.identity?.display ?? 'No checkpoint installed';
  }

  private weightLine(identity: FoundationIdentityRecord): string {
    const dtype = identity.dtypes.join(', ').toUpperCase();
    const size = `${(identity.weight_bytes / MEGABYTE).toFixed(1)} MB`;
    return dtype ? `${dtype} · ${size}` : size;
  }

  private stateLine(current: FoundationStatus): string {
    if (!current.installed) return 'Not installed';
    if (!current.loaded) return 'Installed · not loaded yet';
    return current.device ? `Installed · loaded on ${current.device}` : 'Installed · loaded';
  }

  private memoryLine(current: FoundationStatus): string {
    if (!current.loaded) return 'not loaded';
    if (current.memory_bytes === null) return 'not measured';
    return `${(current.memory_bytes / MEGABYTE).toFixed(0)} MB`;
  }
}
