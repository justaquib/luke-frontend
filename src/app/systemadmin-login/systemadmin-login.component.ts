import { ChangeDetectionStrategy, Component, inject, type OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { UiService } from '../shared/ui.service';
import { AppIcon } from '../shared/app-icon';

interface SystemAdminStatus {
  configured: boolean;
  email?: string;
}

@Component({
  selector: 'app-systemadmin-login',
  standalone: true,
  imports: [FormsModule, RouterLink, AppIcon],
  templateUrl: './systemadmin-login.html',
  styleUrls: ['../shared/auth.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SystemadminLogin implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly ui = inject(UiService);

  protected pin = '';
  protected status: SystemAdminStatus | null = null;

  ngOnInit(): void {
    this.loadStatus();
  }

  protected loadStatus(): void {
    this.auth.systemAdminStatus().subscribe({
      next: (data) => {
        this.status = data;
        if (!data.configured) {
          this.ui.error('Lab administrator is not configured.');
        }
      },
      error: () => {
        this.ui.error('Failed to load the lab administrator status.');
      },
    });
  }

  protected login(): void {
    if (!this.pin) {
      this.ui.error('Enter your PIN.');
      return;
    }
    this.auth.loginWithSystemAdmin(this.pin);
  }
}
