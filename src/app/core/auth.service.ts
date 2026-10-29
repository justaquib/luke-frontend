import { Injectable, signal, effect, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import type { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { UiService } from '../shared/ui.service';

export interface User {
  id: number;
  google_id: string | null;
  email: string;
  name: string;
  picture: string | null;
  tenant_id: number | null;
  role: string;
  is_systemadmin: boolean;
  created_at: string;
}

interface GoogleCredentialResponse {
  credential?: string;
}

interface GooglePromptNotification {
  is_not_displayed(): boolean;
  is_suppressed(): boolean;
}

interface GoogleIdentity {
  initialize(options: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    auto_select: boolean;
    cancel_on_tap_outside: boolean;
  }): void;
  prompt(listener: (notification: GooglePromptNotification) => void): void;
}

interface SystemAdminStatus {
  configured: boolean;
  email?: string;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdentity } };
  }
}

const TOKEN_KEY = 'assistance.token.v1';
const USER_KEY = 'assistance.user.v1';
const ROLE_KEY = 'assistance.role.v1';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly ui = inject(UiService);
  private readonly base = environment.apiUrl;

  private readonly _token = signal<string | null>(this.readToken());
  readonly token = this._token.asReadonly();

  private readonly _user = signal<User | null>(this.readUser());
  readonly user = this._user.asReadonly();

  /** The page the user wanted, kept while they sign in. */
  private readonly _returnUrl = signal<string | null>(null);
  readonly returnUrl = this._returnUrl.asReadonly();

  readonly isLoggedIn = computed(() => !!this._token() && !!this._user());

  constructor() {
    if (typeof window !== 'undefined') {
      effect(() => {
        const token = this._token();
        if (token) {
          localStorage.setItem(TOKEN_KEY, token);
        } else {
          localStorage.removeItem(TOKEN_KEY);
        }
      });
      effect(() => {
        const user = this._user();
        if (user) {
          localStorage.setItem(USER_KEY, JSON.stringify(user));
        } else {
          localStorage.removeItem(USER_KEY);
        }
      });
    }
  }

  loginWithGoogle(inviteToken?: string): void {
    if (!environment.googleClientId || environment.googleClientId === 'YOUR_GOOGLE_CLIENT_ID') {
      this.ui.error('Google Client ID is not configured.');
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    script.onload = (): void => {
      if (!window.google) {
        return;
      }
      window.google.accounts.id.initialize({
        client_id: environment.googleClientId,
        callback: (response: GoogleCredentialResponse) =>
          this.handleCredentialResponse(response, inviteToken),
        auto_select: false,
        cancel_on_tap_outside: false,
      });
      window.google.accounts.id.prompt((notification: GooglePromptNotification) => {
        if (notification.is_not_displayed() || notification.is_suppressed()) {
          this.ui.error('Google Sign-In was blocked or not displayed.');
        }
      });
    };

    script.onerror = (): void => {
      this.ui.error('Failed to load Google Sign-In.');
    };
  }

  private handleCredentialResponse(response: GoogleCredentialResponse, inviteToken?: string): void {
    if (!response.credential) {
      this.ui.error('No credential returned from Google.');
      return;
    }
    const body: Record<string, string> = { id_token: response.credential };
    if (inviteToken) {
      body['invite_token'] = inviteToken;
    }

    this.http.post<{ access_token: string }>(`${this.base}/auth/google`, body).subscribe({
      next: (res) => {
        this._token.set(res.access_token);
        this.fetchMe();
      },
      error: (err: Error) => {
        this.ui.error(err.message || 'Google sign-in failed.');
      },
    });
  }

  loginWithSystemAdmin(pin: string): void {
    this.http.post<{ access_token: string }>(`${this.base}/auth/systemadmin`, { pin }).subscribe({
      next: (res) => {
        this._token.set(res.access_token);
        this.fetchMe();
      },
      error: (err: Error) => {
        this.ui.error(err.message || 'Lab administrator login failed.');
      },
    });
  }

  systemAdminStatus(): Observable<SystemAdminStatus> {
    return this.http.get<SystemAdminStatus>(`${this.base}/auth/systemadmin/status`);
  }

  fetchMe(announce = true): void {
    const token = this._token();
    if (!token) {
      return;
    }
    this.http
      .get<User>(`${this.base}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .subscribe({
        next: (user) => {
          this._user.set(user);
          if (!announce) {
            return;
          }
          this.ui.success('Signed in successfully.');
          this.redirectAfterLogin();
        },
        error: () => {
          this.clearSession();
          if (announce) {
            this.ui.error('Your account could not be read. Please sign in again.');
          }
        },
      });
  }

  /**
   * Check the session that was saved, and renew it while it is still good.
   *
   * A session that has ended is cleared with a word, so the user knows why
   * they are asked to sign in again, and a session that is still good is
   * renewed, so they do not have to sign in again every day.
   */
  restoreSession(): void {
    const token = this._token();
    if (!token) {
      return;
    }
    this.http
      .post<{ access_token: string }>(
        `${this.base}/auth/refresh`,
        {},
        { headers: this.authHeaders() },
      )
      .subscribe({
        next: (res) => {
          this._token.set(res.access_token);
          this.fetchMe(false);
        },
        error: () => {
          this.clearSession();
          this.ui.error('Your session has ended. Please sign in again.');
          void this.router.navigate(['/login']);
        },
      });
  }

  /** Keep the page the user wanted, so they land there after they sign in. */
  rememberPage(url: string): void {
    if (url && url !== '/login' && url !== '/systemadmin') {
      this._returnUrl.set(url);
    }
  }

  redirectAfterLogin(): void {
    if (!this.isLoggedIn()) {
      return;
    }
    const wanted = this._returnUrl();
    this._returnUrl.set(null);
    void this.router.navigateByUrl(wanted || '/chat');
  }

  /** Remember the experience the user picked on the onboarding page. */
  setRole(role: string): void {
    try {
      localStorage.setItem(ROLE_KEY, role);
    } catch {
      // Storage can be unavailable in private browsing; the choice is optional.
    }
  }

  logout(): void {
    this.clearSession();
    try {
      localStorage.removeItem(ROLE_KEY);
    } catch {
      // Storage can be unavailable in private browsing; the session is already gone.
    }
    void this.router.navigate(['/']);
  }

  /** Forget the session, without leaving the page the user is on. */
  private clearSession(): void {
    this._token.set(null);
    this._user.set(null);
  }

  private authHeaders(): Record<string, string> {
    const token = this._token();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private readToken(): string | null {
    try {
      if (typeof window === 'undefined') {
        return null;
      }
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  private readUser(): User | null {
    try {
      if (typeof window === 'undefined') {
        return null;
      }
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  }
}
