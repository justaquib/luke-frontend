import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { DesignService, type SidebarMode, type SidebarSide } from '../core/design.service';
import { AppBackgroundTaskStrip } from './app-background-task-strip';
import { AppIcon, type IconName } from './app-icon';

interface NavItem {
  path: string;
  label: string;
  icon: IconName;
  admin?: boolean;
}

interface ModeChoice {
  value: SidebarMode;
  label: string;
  icon: IconName;
}

interface SideChoice {
  value: SidebarSide;
  label: string;
  icon: IconName;
}

const NAV_ITEMS: readonly NavItem[] = [
  { path: '/chat', label: 'Chat', icon: 'logo' },
  { path: '/dashboard/trainer', label: 'Training room', icon: 'pencil' },
  { path: '/dashboard/parenting', label: 'Parenting Coach', icon: 'pin' },
  { path: '/dashboard/learner', label: 'Language Learner', icon: 'book' },
  { path: '/dashboard/brain', label: 'Assistance Brain', icon: 'layers' },
  { path: '/dashboard/design', label: 'Design', icon: 'palette' },
  { path: '/dashboard/settings', label: 'Settings', icon: 'sliders' },
  { path: '/dashboard/tenants', label: 'System Admin', icon: 'shield', admin: true },
];

/**
 * The workspace navigation shared by the dashboard views. It opens and closes
 * through the shared design state, so a page keeps the choice, and it carries
 * the two decisions that shape it: docked, floating or full width, and the
 * side it opens from.
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
  private readonly auth = inject(AuthService);
  protected readonly design = inject(DesignService);

  protected readonly open = this.design.sidebarOpen;
  private readonly isSystemAdmin = computed(() => this.auth.user()?.is_systemadmin ?? false);

  protected readonly navItems = computed(() =>
    NAV_ITEMS.filter((item) => !item.admin || this.isSystemAdmin()),
  );

  protected readonly modes: readonly ModeChoice[] = [
    { value: 'push', label: 'Dock the sidebar beside the page', icon: 'sidebar' },
    { value: 'overlay', label: 'Float the sidebar over the page', icon: 'layers' },
    { value: 'full', label: 'Expand the sidebar to the full width', icon: 'maximize' },
  ];

  protected readonly sides: readonly SideChoice[] = [
    { value: 'left', label: 'Open the sidebar on the left', icon: 'sidebar-left' },
    { value: 'right', label: 'Open the sidebar on the right', icon: 'sidebar' },
  ];
}
