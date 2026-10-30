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
import { ToolsService, type InstalledApp } from '../core/tools.service';
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
  allowlist = signal<string[]>([]);
  searchQuery = signal('');

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

  isAllowlisted(appName: string): boolean {
    return this.allowlist().includes(appName);
  }

  addToAllowlist(appName: string): void {
    if (this.isAllowlisted(appName)) return;

    const newAllowlist = [...this.allowlist(), appName];
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
    const newAllowlist = this.allowlist().filter((app) => app !== appName);
    this.toolsService.setAppAllowlist(newAllowlist).subscribe({
      next: (allowlist) => {
        this.allowlist.set(allowlist);
        this.ui.success(`Removed ${appName} from allowlist`);
      },
      error: (err: HttpError) => {
        this.ui.error(err.error?.detail || 'Failed to update allowlist');
      },
    });
  }
}
