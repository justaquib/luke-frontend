import { isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';
import { Router, CanActivateFn, UrlTree } from '@angular/router';
import { AuthService } from '../core/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  // The server has no session, so it renders the page and lets the browser
  // decide once the token is known. Otherwise every refresh would land on
  // the login page.
  if (!isPlatformBrowser(inject(PLATFORM_ID))) return true;
  return auth.isLoggedIn() ? true : router.createUrlTree(['/login']);
};
