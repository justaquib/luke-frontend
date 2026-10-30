import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { DesignService, type SidebarMode } from '../core/design.service';
import { AppBackgroundTaskStrip } from './app-background-task-strip';
import { AppIcon, type IconName } from './app-icon';

interface NavItem {
  path: string;
  label: string;
  icon: IconName;
}

interface ModeChoice {
  value: SidebarMode;
  label: string;
  icon: IconName;
}

const NAV_ITEMS: readonly NavItem[] = [
  { path: '/chat', label: 'Chat', icon: 'logo' },
  { path: '/dashboard/trainer', label: 'Training room', icon: 'pencil' },
  { path: '/dashboard/parenting', label: 'Parenting Coach', icon: 'pin' },
  { path: '/dashboard/learner', label: 'Language Learner', icon: 'book' },
  { path: '/dashboard/brain', label: 'Luke brain', icon: 'layers' },
  { path: '/dashboard/assessment', label: 'Assessment', icon: 'grid' },
  { path: '/dashboard/expressions', label: 'Expressions', icon: 'send' },
  { path: '/dashboard/design', label: 'Design', icon: 'palette' },
  { path: '/dashboard/settings', label: 'Lab settings', icon: 'sliders' },
  { path: '/dashboard/system', label: 'System', icon: 'monitor' },
];

/**
 * The workspace navigation shared by the dashboard views. It opens and closes
 * through the shared design state, so a page keeps the choice, and it carries
 * the docked, floating or full-width decision; the side it opens from is set
 * on the design page with the rest of the frame.
 */
@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, AppIcon, AppBackgroundTaskStrip],
  templateUrl: './app-sidebar.html',
  styleUrl: './app-sidebar.css',
  host: { '[class.rail]': '!open()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppSidebar {
  protected readonly design = inject(DesignService);

  protected readonly open = this.design.sidebarOpen;
  protected readonly navItems = NAV_ITEMS;

  protected readonly modes: readonly ModeChoice[] = [
    { value: 'push', label: 'Dock the sidebar beside the page', icon: 'sidebar' },
    { value: 'overlay', label: 'Float the sidebar over the page', icon: 'layers' },
    { value: 'full', label: 'Expand the sidebar to the full width', icon: 'maximize' },
  ];
}
