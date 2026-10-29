import type { Routes } from '@angular/router';
import { ChatUI } from './chat-ui/chat-ui';
import { Trainer } from './trainer/trainer';
import { ParentingChat } from './parenting/parenting-chat/parenting-chat';
import { Brain } from './brain/brain';
import { Design } from './design/design';
import { Expressions } from './expressions/expressions';
import { Assessment } from './assessment/assessment';
import { Learner } from './learner/learner';
import { Landing } from './landing/landing';
import { Login } from './login/login.component';
import { Onboarding } from './onboarding/onboarding.component';
import { Settings } from './settings/settings';
import { SystemadminLogin } from './systemadmin-login/systemadmin-login.component';
import { authGuard } from './core/auth.guard';

/** The model-trainer views share the builder frame and live under /dashboard. */
const dashboardRoutes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'trainer' },
  { path: 'trainer', component: Trainer },
  { path: 'parenting', component: ParentingChat },
  { path: 'learner', component: Learner },
  { path: 'brain', component: Brain },
  { path: 'assessment', component: Assessment },
  { path: 'expressions', component: Expressions },
  { path: 'design', component: Design },
  { path: 'settings', component: Settings },
];

export const routes: Routes = [
  { path: '', component: Landing },
  { path: 'login', component: Login },
  { path: 'systemadmin', component: SystemadminLogin },
  { path: 'onboarding', component: Onboarding, canActivate: [authGuard] },
  // The assistant is its own surface; everything the model trainer owns
  // lives below /dashboard.
  { path: 'chat', component: ChatUI, canActivate: [authGuard] },
  { path: 'dashboard', canActivate: [authGuard], children: dashboardRoutes },
  // Old flat links keep working and land in the dashboard.
  { path: 'trainer', pathMatch: 'full', redirectTo: 'dashboard/trainer' },
  { path: 'parenting', pathMatch: 'full', redirectTo: 'dashboard/parenting' },
  { path: 'learner', pathMatch: 'full', redirectTo: 'dashboard/learner' },
  { path: 'brain', pathMatch: 'full', redirectTo: 'dashboard/brain' },
  { path: 'expressions', pathMatch: 'full', redirectTo: 'dashboard/expressions' },
  { path: 'settings', pathMatch: 'full', redirectTo: 'dashboard/settings' },
  { path: '**', redirectTo: '' },
];
