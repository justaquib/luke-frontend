import {
  ChangeDetectionStrategy,
  Component,
  type OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToolsService, type AppAllowlistEntry, type InstalledApp } from '../core/tools.service';
import { AppIcon } from '../shared/app-icon';
import { UiService } from '../shared/ui.service';

interface HttpError {
  error?: { detail?: string };
}

@Component({
  selector: 'app-apps-card',
  standalone: true,
  imports: [CommonModule, FormsModule, AppIcon],
  templateUrl: './apps-card.component.html',
  styleUrl: './apps-card.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppsCardComponent implements OnInit {
  private toolsService = inject(ToolsService);
  private ui = inject(UiService);

  loading = signal(true);
  error = signal<string | null>(null);
  apps = signal<InstalledApp[]>([]);
  allowlist = signal<AppAllowlistEntry[]>([]);
  searchQuery = signal('');
  editingEntry = signal<string | null>(null);

  filteredApps = computed(() => {
    const query = this.searchQuery().toLowerCase();
    if (!query) return this.apps();
    return this.apps().filter(
      (app) => app.name.toLowerCase().includes(query) || app.path.toLowerCase().includes(query),
    );
  });

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    this.loading.set(true);
    this.error.set(null);

    this.toolsService.getInstalledApps().subscribe({
      next: (apps) => {
        this.apps.set(apps);
        this.loadAllowlist();
      },
      error: (err: HttpError) => {
        this.loading.set(false);
        this.error.set(err.error?.detail || 'Failed to load applications');
        this.ui.error('Failed to load applications');
      },
    });
  }

  private loadAllowlist(): void {
    this.toolsService.getAppAllowlist().subscribe({
      next: (allowlist) => {
        this.allowlist.set(allowlist);
        this.loading.set(false);
      },
      error: (err: HttpError) => {
        this.loading.set(false);
        this.error.set(err.error?.detail || 'Failed to load allowlist');
        this.ui.error('Failed to load allowlist');
      },
    });
  }

  findEntry(appName: string): AppAllowlistEntry | undefined {
    return this.allowlist().find((e) => e.name === appName);
  }

  isAllowlisted(appName: string): boolean {
    return this.allowlist().some((e) => e.name === appName);
  }

  addToAllowlist(appName: string): void {
    if (this.isAllowlisted(appName)) return;

    const entry: AppAllowlistEntry = { name: appName, short_name: '', aliases: [] };
    const newAllowlist = [...this.allowlist(), entry];
    this.toolsService.setAppAllowlist(newAllowlist).subscribe({
      next: (allowlist) => {
        this.allowlist.set(allowlist);
        this.ui.success(`Added ${appName} to allowlist`);
      },
      error: (err: HttpError) => {
        this.ui.error(err.error?.detail || 'Failed to update allowlist');
      },
    });
  }

  removeFromAllowlist(appName: string): void {
    const newAllowlist = this.allowlist().filter((e) => e.name !== appName);
    this.toolsService.setAppAllowlist(newAllowlist).subscribe({
      next: (allowlist) => {
        this.allowlist.set(allowlist);
        this.editingEntry.set(null);
        this.ui.success(`Removed ${appName} from allowlist`);
      },
      error: (err: HttpError) => {
        this.ui.error(err.error?.detail || 'Failed to update allowlist');
      },
    });
  }

  toggleEdit(appName: string): void {
    this.editingEntry.set(this.editingEntry() === appName ? null : appName);
  }

  updateShortName(appName: string, shortName: string): void {
    const updated = this.allowlist().map((e) =>
      e.name === appName ? { ...e, short_name: shortName } : e,
    );
    this.toolsService.setAppAllowlist(updated).subscribe({
      next: (allowlist) => this.allowlist.set(allowlist),
      error: (err: HttpError) => this.ui.error(err.error?.detail || 'Failed to update'),
    });
  }

  updateAliases(appName: string, aliasesText: string): void {
    const aliases = aliasesText
      .split(',')
      .map((a) => a.trim())
      .filter((a) => a.length > 0);
    const updated = this.allowlist().map((e) => (e.name === appName ? { ...e, aliases } : e));
    this.toolsService.setAppAllowlist(updated).subscribe({
      next: (allowlist) => this.allowlist.set(allowlist),
      error: (err: HttpError) => this.ui.error(err.error?.detail || 'Failed to update'),
    });
  }

  chipLabel(entry: AppAllowlistEntry): string {
    if (entry.short_name) return `${entry.name} (${entry.short_name})`;
    return entry.name;
  }
}
