import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DesignService } from '../core/design.service';
import { AppRightSidebar } from './app-right-sidebar';
import { AppSidebar } from './app-sidebar';
import { AppTopBar } from './app-top-bar';

/**
 * The page frame shared by the dashboard views. It holds the top panel, the
 * workspace navigation and the page, and follows the sidebar mode, side and
 * width the person chose on the Design page or in the sidebar itself. Both
 * sidebar controls live in the top panel, so every page shows the same pair.
 */
@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [AppSidebar, AppTopBar, AppRightSidebar],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.css',
  host: {
    '[class.sidebar-open]': 'design.sidebarOpen()',
    '[class.sidebar-closed]': '!design.sidebarOpen()',
    '[attr.data-sidebar-side]': 'design.sidebarSide()',
    '[attr.data-sidebar-mode]': 'design.sidebarMode()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppShell {
  protected readonly design = inject(DesignService);
}
