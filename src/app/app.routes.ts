import { Routes } from '@angular/router';
import { ChatUI } from './chat-ui/chat-ui';
import { Trainer } from './trainer/trainer';
import { Landing } from './landing/landing';
import { Login } from './login/login.component';
import { Onboarding } from './onboarding/onboarding.component';
import { Tenants } from './tenants/tenants.component';
import { SystemadminLogin } from './systemadmin-login/systemadmin-login.component';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: '', component: Landing },
  { path: 'login', component: Login },
  { path: 'systemadmin', component: SystemadminLogin },
  { path: 'onboarding', component: Onboarding, canActivate: [authGuard] },
  { path: 'chat', component: ChatUI, canActivate: [authGuard] },
  { path: 'trainer', component: Trainer, canActivate: [authGuard] },
  { path: 'tenants', component: Tenants, canActivate: [authGuard] },
  { path: '**', redirectTo: '' },
];
