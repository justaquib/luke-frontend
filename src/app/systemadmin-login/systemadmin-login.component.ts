import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { UiService } from '../shared/ui.service';

@Component({
  selector: 'app-systemadmin-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './systemadmin-login.html',
  styleUrl: './systemadmin-login.css',
})
export class SystemadminLogin {
  private readonly auth = inject(AuthService);
  private readonly ui = inject(UiService);
  private readonly router = inject(Router);

  pin = '';
  status: { configured: boolean; email?: string } | null = null;

  ngOnInit() {
    this.loadStatus();
  }

  loadStatus() {
    this.auth.systemAdminStatus().subscribe({
      next: (data) => {
        this.status = data;
        if (!data.configured) {
          this.ui.error('System admin not configured.');
        }
      },
      error: () => {
        this.ui.error('Failed to load system admin status.');
      },
    });
  }

  login() {
    if (!this.pin) {
      this.ui.error('Enter your PIN.');
      return;
    }
    this.auth.loginWithSystemAdmin(this.pin);
  }
}
