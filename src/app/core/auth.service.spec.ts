import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Login } from '../login/login.component';
import { AuthService } from './auth.service';

const USER = {
  id: 1,
  google_id: null,
  email: 'trainer@example.com',
  name: 'Trainer',
  picture: null,
  tenant_id: 1,
  role: 'user',
  is_systemadmin: false,
  created_at: '2026-01-01T00:00:00Z',
};

describe('AuthService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'login', component: Login }]),
      ],
    });
  });

  it('renews the saved session when the app starts', () => {
    localStorage.setItem('assistance.token.v1', 'old-token');
    localStorage.setItem('assistance.user.v1', JSON.stringify(USER));
    const auth = TestBed.inject(AuthService);
    const http = TestBed.inject(HttpTestingController);

    auth.restoreSession();

    const refresh = http.expectOne((req) => req.url.endsWith('/auth/refresh'));
    expect(refresh.request.method).toBe('POST');
    refresh.flush({ access_token: 'new-token' });

    http.expectOne((req) => req.url.endsWith('/auth/me')).flush(USER);

    expect(auth.token()).toBe('new-token');
    expect(auth.isLoggedIn()).toBe(true);
    http.verify();
  });

  it('clears a session that has ended, so the user knows why', () => {
    localStorage.setItem('assistance.token.v1', 'old-token');
    localStorage.setItem('assistance.user.v1', JSON.stringify(USER));
    const auth = TestBed.inject(AuthService);
    const http = TestBed.inject(HttpTestingController);

    auth.restoreSession();

    http
      .expectOne((req) => req.url.endsWith('/auth/refresh'))
      .flush({ detail: 'Invalid token' }, { status: 401, statusText: 'Unauthorized' });

    expect(auth.token()).toBeNull();
    expect(auth.isLoggedIn()).toBe(false);
    http.verify();
  });

  it('keeps the page the user wanted, and goes back to it', () => {
    const auth = TestBed.inject(AuthService);

    auth.rememberPage('/dashboard/brain');

    expect(auth.returnUrl()).toBe('/dashboard/brain');
  });
});
