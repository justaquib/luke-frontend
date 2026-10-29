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
import { IntegrationsService } from '../core/integrations.service';
import { WebApiService } from '../core/api/web-api.service';
import type {
  WebRefreshReport,
  WebSettingsBody,
  WebSourceView,
  WebStatus,
} from '../core/api/web-models';
import { AppCardInfo } from '../shared/app-card-info';
import { AppIcon } from '../shared/app-icon';
import { UiService } from '../shared/ui.service';

const STATE_LABELS: Readonly<Record<string, string>> = {
  indexed: 'indexed',
  candidate: 'waiting',
  superseded: 'replaced',
  new: 'not read yet',
};

/**
 * The pages Luke may read, and what was read from each. It reads the policy and
 * the snapshots from the backend, never a copy kept in this browser.
 */
@Component({
  selector: 'app-web-sources',
  standalone: true,
  imports: [AppCardInfo, AppIcon],
  templateUrl: './web-sources.html',
  styleUrls: ['./web-sources.css', '../shared/controls.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WebSources implements OnInit {
  private readonly api = inject(WebApiService);
  private readonly ui = inject(UiService);
  private readonly platformId = inject(PLATFORM_ID);
  protected readonly integrations = inject(IntegrationsService);

  protected readonly status = signal<WebStatus | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly endpointDraft = signal('');
  protected readonly sourceDraft = signal('');
  protected readonly report = signal<WebRefreshReport | null>(null);

  protected readonly policy = computed(() => this.status()?.policy ?? null);
  protected readonly sources = computed(() => this.status()?.sources ?? []);
  protected readonly counts = computed(() => this.status()?.counts ?? null);

  ngOnInit(): void {
    // The policy lives on the backend, so it is read in the browser only.
    if (!isPlatformBrowser(this.platformId)) return;
    this.load();
  }

  protected load(): void {
    this.error.set(null);
    this.api.status().subscribe({
      next: (status) => this.apply(status),
      error: (error: Error) => this.error.set(error.message),
    });
  }

  protected toggleEnabled(on: boolean): void {
    this.integrations.setWeb(on);
    this.save({ enabled: on });
  }

  protected chooseProvider(provider: string): void {
    this.save({ provider });
  }

  protected saveEndpoint(): void {
    this.save({ endpoint: this.endpointDraft().trim() });
  }

  protected addSource(): void {
    const url = this.sourceDraft().trim();
    if (!url || this.busy()) return;
    this.busy.set(true);
    this.api.addSource(url).subscribe({
      next: () => {
        this.sourceDraft.set('');
        this.ui.info('Source added.');
        this.load();
        this.busy.set(false);
      },
      error: (error: Error) => this.fail(error),
    });
  }

  protected removeSource(source: WebSourceView): void {
    this.busy.set(true);
    this.api.removeSource(source.id).subscribe({
      next: () => {
        this.ui.info(`${source.domain} removed.`);
        this.load();
        this.busy.set(false);
      },
      error: (error: Error) => this.fail(error),
    });
  }

  protected refreshNow(): void {
    this.busy.set(true);
    this.report.set(null);
    this.api.refresh().subscribe({
      next: (result) => {
        this.report.set(result.report);
        this.busy.set(false);
        this.load();
      },
      error: (error: Error) => this.fail(error),
    });
  }

  protected stateLabel(source: WebSourceView): string {
    return STATE_LABELS[source.status] ?? source.status;
  }

  protected checkedLabel(source: WebSourceView): string {
    if (!source.checked_at) return 'never checked';
    return `checked ${source.checked_at.slice(0, 10)}`;
  }

  private save(patch: Partial<WebSettingsBody>): void {
    const current = this.policy();
    if (!current) return;
    const body: WebSettingsBody = {
      enabled: current.enabled,
      provider: current.provider,
      endpoint: this.endpointDraft().trim() || current.endpoint,
      allowlist: current.allowlist,
      ttl_hours: current.ttl_hours,
      min_score: current.min_score,
      results: current.results,
      ...patch,
    };
    this.busy.set(true);
    this.api.saveSettings(body).subscribe({
      next: (policy) => {
        this.status.update((status) => (status ? { ...status, policy } : status));
        if ('enabled' in patch) this.integrations.setWeb(policy.enabled);
        this.busy.set(false);
      },
      error: (error: Error) => this.fail(error),
    });
  }

  private apply(status: WebStatus): void {
    this.status.set(status);
    this.endpointDraft.set(status.policy.endpoint);
    this.integrations.setWeb(status.policy.enabled);
  }

  private fail(error: Error): void {
    this.busy.set(false);
    this.error.set(error.message);
  }
}
