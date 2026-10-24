import { Component, inject, OnInit, PLATFORM_ID } from '@angular/core';
import { DatePipe, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { ApiService } from '../core/api.service';
import { UiService } from '../shared/ui.service';
import { AppShell } from '../shared/app-shell';
import { PageInfoActions } from '../shared/page-info-actions';
import { AppIcon } from '../shared/app-icon';
import { SYSTEM_PACKAGES } from './system-overview.data';

interface Tenant {
  id: number;
  name: string;
  slug: string;
  created_at: string;
}

@Component({
  selector: 'app-tenants',
  standalone: true,
  imports: [DatePipe, AppShell, PageInfoActions, AppIcon],
  templateUrl: './tenants.html',
  styleUrls: ['./tenants.css', './tenants-overview.css'],
})
export class Tenants implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly ui = inject(UiService);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);

  tenants: Tenant[] = [];

  /** The packages the product is built with, and what each one is for. */
  protected readonly packages = SYSTEM_PACKAGES;

  ngOnInit() {
    // The server has no session, so it cannot know whether this is a system
    // admin; the browser decides once the saved user is read.
    if (!isPlatformBrowser(this.platformId)) return;
    const user = this.auth.user();
    if (!user?.is_systemadmin) {
      this.router.navigate(['/']);
      return;
    }
    this.loadTenants();
  }

  loadTenants() {
    this.api.listTenants().subscribe({
      next: (data) => {
        this.tenants = data;
      },
      error: () => {
        this.ui.error('Failed to load tenants.');
      },
    });
  }

  refresh() {
    this.loadTenants();
  }
}
