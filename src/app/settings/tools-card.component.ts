import { ChangeDetectionStrategy, Component, type OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToolsService, type Tool, type ToolPermission } from '../core/tools.service';
import { AppIcon } from '../shared/app-icon';
import { UiService } from '../shared/ui.service';

interface HttpError {
  error?: { detail?: string };
}

@Component({
  selector: 'app-tools-card',
  standalone: true,
  imports: [CommonModule, FormsModule, AppIcon],
  templateUrl: './tools-card.component.html',
  styleUrl: './tools-card.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToolsCardComponent implements OnInit {
  private toolsService = inject(ToolsService);
  private ui = inject(UiService);

  loading = signal(true);
  error = signal<string | null>(null);
  tools = signal<Tool[]>([]);
  permissions = signal<ToolPermission[]>([]);

  ngOnInit(): void {
    this.loadTools();
  }

  private loadTools(): void {
    this.loading.set(true);
    this.error.set(null);

    this.toolsService.getTools().subscribe({
      next: (tools) => {
        this.tools.set(tools);
        this.loadPermissions();
      },
      error: (err: HttpError) => {
        this.loading.set(false);
        this.error.set(err.error?.detail || 'Failed to load tools');
        this.ui.error('Failed to load tools');
      },
    });
  }

  private loadPermissions(): void {
    this.toolsService.getPermissions().subscribe({
      next: (permissions) => {
        this.permissions.set(permissions);
        this.loading.set(false);
      },
      error: (err: HttpError) => {
        this.loading.set(false);
        this.error.set(err.error?.detail || 'Failed to load permissions');
        this.ui.error('Failed to load permissions');
      },
    });
  }

  isEnabled(toolName: string): boolean {
    const perm = this.permissions().find((p) => p.tool === toolName);
    return perm?.enabled ?? true;
  }

  toggleTool(toolName: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const enabled = input.checked;

    this.toolsService.setPermission(toolName, enabled).subscribe({
      next: (permissions) => {
        this.permissions.set(permissions);
        this.ui.success(`Tool ${enabled ? 'enabled' : 'disabled'}`);
      },
      error: (err: HttpError) => {
        input.checked = !enabled;
        this.ui.error(err.error?.detail || 'Failed to update permission');
      },
    });
  }
}
