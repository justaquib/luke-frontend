import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AppShell } from '../shared/app-shell';
import { SystemOverview } from '../settings/system-overview';

@Component({
  selector: 'app-system',
  standalone: true,
  imports: [AppShell, SystemOverview],
  templateUrl: './system.html',
  styleUrl: './system.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class System {}
