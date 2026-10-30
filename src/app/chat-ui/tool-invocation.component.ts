import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppIcon } from '../shared/app-icon';
import type { ToolExecuteResponse } from '../core/tools.service';

export interface ToolInvocation {
  id: string;
  tool: string;
  params: Record<string, unknown>;
  status: 'pending' | 'awaiting_confirmation' | 'running' | 'completed' | 'failed';
  result?: ToolExecuteResponse;
}

@Component({
  selector: 'app-tool-invocation',
  standalone: true,
  imports: [CommonModule, AppIcon],
  templateUrl: './tool-invocation.component.html',
  styleUrl: './tool-invocation.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToolInvocationComponent {
  invocation = input.required<ToolInvocation>();

  confirm = output<void>();
  cancelExecution = output<void>();

  statusLabel(): string {
    const status = this.invocation().status;
    const labels: Record<string, string> = {
      pending: 'Pending',
      awaiting_confirmation: 'Awaiting Confirmation',
      running: 'Running',
      completed: 'Completed',
      failed: 'Failed',
    };
    return labels[status] || status;
  }

  paramEntries(): { key: string; value: string }[] {
    const params = this.invocation().params;
    return Object.entries(params).map(([key, value]) => ({
      key,
      value: typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value),
    }));
  }
}
