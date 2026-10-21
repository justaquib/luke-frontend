import { isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../core/auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  // The server has no session, so it renders the page and lets the browser
  // decide once the token is known. Otherwise every refresh would land on
  // the login page.
  if (!isPlatformBrowser(inject(PLATFORM_ID))) return true;
  if (auth.isLoggedIn()) return true;
  // The page the user wanted is kept, so they land there after they sign in
  // instead of on the landing page.
  auth.rememberPage(state.url);
  return router.createUrlTree(['/login']);
};
