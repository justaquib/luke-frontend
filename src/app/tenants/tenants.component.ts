import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { ApiService } from '../core/api.service';
import { UiService } from '../shared/ui.service';

interface Tenant {
  id: number;
  name: string;
  slug: string;
  created_at: string;
}

@Component({
  selector: 'app-tenants',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink, RouterLinkActive],
  templateUrl: './tenants.html',
  styleUrl: './tenants.css',
})
export class Tenants implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly ui = inject(UiService);
  private readonly router = inject(Router);

  tenants: Tenant[] = [];

  protected readonly currentUrl = signal('');

  ngOnInit() {
    const user = this.auth.user();
    if (!user?.is_systemadmin) {
      this.router.navigate(['/']);
      return;
    }
    this.currentUrl.set(this.router.url);
    this.router.events.subscribe(() => {
      this.currentUrl.set(this.router.url);
    });
    this.loadTenants();
  }

  isActive(path: string): boolean {
    return this.currentUrl().startsWith(path);
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
